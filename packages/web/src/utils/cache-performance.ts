// Cache Performance Monitoring System
// Comprehensive tracking for cache hit/miss ratios and performance metrics

import { performanceMonitor } from './performance';

export interface CacheMetrics {
  cacheKey: string;
  hitCount: number;
  missCount: number;
  totalRequests: number;
  hitRatio: number;
  avgResponseTime: number;
  cacheSize: number;
  lastAccessed: number;
  evictions: number;
}

export interface CachePerformanceEntry {
  timestamp: number;
  cacheKey: string;
  isHit: boolean;
  responseTime: number;
  cacheSize: number;
  operation: 'get' | 'set' | 'delete' | 'evict';
  metadata?: Record<string, any>;
}

export interface CachePerformanceThresholds {
  minHitRatio: number; // Default: 0.7 (70%)
  maxResponseTime: number; // Default: 100ms
  maxCacheSize: number; // Default: 50MB
  alertThreshold: number; // Default: 0.5 (50% hit ratio)
}

class CachePerformanceMonitor {
  private static instance: CachePerformanceMonitor;
  private metrics = new Map<string, CacheMetrics>();
  private performanceEntries: CachePerformanceEntry[] = [];
  private thresholds: CachePerformanceThresholds;
  private enabled: boolean;
  private maxEntries: number = 10000;

  constructor() {
    this.enabled = process.env.NODE_ENV === 'development' ||
                   process.env.NEXT_PUBLIC_CACHE_MONITORING === 'true';

    this.thresholds = {
      minHitRatio: parseFloat(process.env.NEXT_PUBLIC_CACHE_MIN_HIT_RATIO || '0.7'),
      maxResponseTime: parseFloat(process.env.NEXT_PUBLIC_CACHE_MAX_RESPONSE_TIME || '100'),
      maxCacheSize: parseFloat(process.env.NEXT_PUBLIC_CACHE_MAX_SIZE || '52428800'), // 50MB
      alertThreshold: parseFloat(process.env.NEXT_PUBLIC_CACHE_ALERT_THRESHOLD || '0.5')
    };

    // Clean up old entries periodically
    if (typeof window !== 'undefined') {
      setInterval(() => this.cleanup(), 300000); // 5 minutes
    }
  }

  static getInstance(): CachePerformanceMonitor {
    if (!CachePerformanceMonitor.instance) {
      CachePerformanceMonitor.instance = new CachePerformanceMonitor();
    }
    return CachePerformanceMonitor.instance;
  }

  // Track cache operations
  trackCacheOperation(
    cacheKey: string,
    operation: 'get' | 'set' | 'delete' | 'evict',
    isHit: boolean = false,
    responseTime: number = 0,
    cacheSize: number = 0,
    metadata?: Record<string, any>
  ): void {
    if (!this.enabled) return;

    const now = performance.now();

    // Update metrics
    const metrics = this.metrics.get(cacheKey) || {
      cacheKey,
      hitCount: 0,
      missCount: 0,
      totalRequests: 0,
      hitRatio: 0,
      avgResponseTime: 0,
      cacheSize: 0,
      lastAccessed: now,
      evictions: 0
    };

    if (operation === 'get') {
      metrics.totalRequests++;
      if (isHit) {
        metrics.hitCount++;
      } else {
        metrics.missCount++;
      }
      metrics.hitRatio = metrics.hitCount / metrics.totalRequests;
    }

    if (operation === 'evict') {
      metrics.evictions++;
    }

    // Update average response time
    if (responseTime > 0) {
      metrics.avgResponseTime = metrics.avgResponseTime === 0
        ? responseTime
        : (metrics.avgResponseTime + responseTime) / 2;
    }

    metrics.cacheSize = cacheSize;
    metrics.lastAccessed = now;

    this.metrics.set(cacheKey, metrics);

    // Add performance entry
    const entry: CachePerformanceEntry = {
      timestamp: now,
      cacheKey,
      isHit,
      responseTime,
      cacheSize,
      operation,
      metadata
    };

    this.performanceEntries.push(entry);

    // Check for performance issues
    this.checkPerformanceThresholds(metrics);

    // Track render performance if available
    performanceMonitor.trackRender(`cache-${operation}`,
      `${cacheKey} ${isHit ? 'hit' : 'miss'}`, !isHit);
  }

  // Get metrics for specific cache key
  getMetrics(cacheKey: string): CacheMetrics | undefined {
    return this.metrics.get(cacheKey);
  }

  // Get all cache metrics
  getAllMetrics(): Map<string, CacheMetrics> {
    return new Map(this.metrics);
  }

  // Get performance entries with filtering
  getPerformanceEntries(filter?: {
    cacheKey?: string;
    operation?: string;
    timeRange?: { start: number; end: number };
    limit?: number;
  }): CachePerformanceEntry[] {
    let entries = [...this.performanceEntries];

    if (filter?.cacheKey) {
      entries = entries.filter(e => e.cacheKey === filter.cacheKey);
    }

    if (filter?.operation) {
      entries = entries.filter(e => e.operation === filter.operation);
    }

    if (filter?.timeRange) {
      entries = entries.filter(e =>
        e.timestamp >= filter.timeRange!.start &&
        e.timestamp <= filter.timeRange!.end
      );
    }

    if (filter?.limit) {
      entries = entries.slice(-filter.limit);
    }

    return entries.sort((a, b) => b.timestamp - a.timestamp);
  }

  // Calculate global cache statistics
  getGlobalStats(): {
    totalCaches: number;
    globalHitRatio: number;
    avgResponseTime: number;
    totalRequests: number;
    totalSize: number;
    performingCaches: number;
    underperformingCaches: number;
  } {
    const allMetrics = Array.from(this.metrics.values());

    if (allMetrics.length === 0) {
      return {
        totalCaches: 0,
        globalHitRatio: 0,
        avgResponseTime: 0,
        totalRequests: 0,
        totalSize: 0,
        performingCaches: 0,
        underperformingCaches: 0
      };
    }

    const totalRequests = allMetrics.reduce((sum, m) => sum + m.totalRequests, 0);
    const totalHits = allMetrics.reduce((sum, m) => sum + m.hitCount, 0);
    const totalSize = allMetrics.reduce((sum, m) => sum + m.cacheSize, 0);
    const avgResponseTime = allMetrics.reduce((sum, m) => sum + m.avgResponseTime, 0) / allMetrics.length;

    const performingCaches = allMetrics.filter(m =>
      m.hitRatio >= this.thresholds.minHitRatio
    ).length;

    const underperformingCaches = allMetrics.length - performingCaches;

    return {
      totalCaches: allMetrics.length,
      globalHitRatio: totalRequests > 0 ? totalHits / totalRequests : 0,
      avgResponseTime,
      totalRequests,
      totalSize,
      performingCaches,
      underperformingCaches
    };
  }

  // Check performance thresholds and alert
  private checkPerformanceThresholds(metrics: CacheMetrics): void {
    const issues: string[] = [];

    if (metrics.hitRatio < this.thresholds.alertThreshold) {
      issues.push(`Low hit ratio: ${(metrics.hitRatio * 100).toFixed(1)}%`);
    }

    if (metrics.avgResponseTime > this.thresholds.maxResponseTime) {
      issues.push(`High response time: ${metrics.avgResponseTime.toFixed(1)}ms`);
    }

    if (metrics.cacheSize > this.thresholds.maxCacheSize) {
      issues.push(`Cache size exceeded: ${(metrics.cacheSize / 1024 / 1024).toFixed(1)}MB`);
    }

    if (issues.length > 0 && console.warn) {
      console.warn(`Cache performance warning for ${metrics.cacheKey}:`, issues);
    }
  }

  // Generate performance report
  generateReport(timeRange?: { start: number; end: number }): {
    summary: ReturnType<typeof this.getGlobalStats>;
    topPerformers: CacheMetrics[];
    underperformers: CacheMetrics[];
    recentIssues: CachePerformanceEntry[];
    recommendations: string[];
  } {
    const globalStats = this.getGlobalStats();
    const allMetrics = Array.from(this.metrics.values());

    // Sort by hit ratio
    const sortedMetrics = allMetrics.sort((a, b) => b.hitRatio - a.hitRatio);

    const topPerformers = sortedMetrics
      .filter(m => m.hitRatio >= this.thresholds.minHitRatio)
      .slice(0, 5);

    const underperformers = sortedMetrics
      .filter(m => m.hitRatio < this.thresholds.minHitRatio)
      .slice(0, 5);

    // Get recent performance issues
    const recentIssues = this.getPerformanceEntries({
      timeRange,
      limit: 20
    }).filter(entry => !entry.isHit || entry.responseTime > this.thresholds.maxResponseTime);

    // Generate recommendations
    const recommendations: string[] = [];

    if (globalStats.globalHitRatio < this.thresholds.minHitRatio) {
      recommendations.push('Consider increasing cache TTL or improving cache key strategies');
    }

    if (globalStats.avgResponseTime > this.thresholds.maxResponseTime) {
      recommendations.push('Review cache storage backend performance');
    }

    if (underperformers.length > globalStats.performingCaches) {
      recommendations.push('Review caching strategies for underperforming cache keys');
    }

    if (globalStats.totalSize > this.thresholds.maxCacheSize * 0.8) {
      recommendations.push('Consider implementing cache eviction policies');
    }

    return {
      summary: globalStats,
      topPerformers,
      underperformers,
      recentIssues,
      recommendations
    };
  }

  // Reset metrics
  resetMetrics(cacheKey?: string): void {
    if (cacheKey) {
      this.metrics.delete(cacheKey);
      this.performanceEntries = this.performanceEntries.filter(e => e.cacheKey !== cacheKey);
    } else {
      this.metrics.clear();
      this.performanceEntries = [];
    }
  }

  // Clean up old entries
  private cleanup(): void {
    const cutoff = performance.now() - (24 * 60 * 60 * 1000); // 24 hours

    this.performanceEntries = this.performanceEntries.filter(e => e.timestamp > cutoff);

    if (this.performanceEntries.length > this.maxEntries) {
      this.performanceEntries = this.performanceEntries.slice(-this.maxEntries);
    }
  }

  // Export data for analysis
  exportData(): {
    metrics: CacheMetrics[];
    entries: CachePerformanceEntry[];
    thresholds: CachePerformanceThresholds;
    timestamp: number;
  } {
    return {
      metrics: Array.from(this.metrics.values()),
      entries: this.performanceEntries,
      thresholds: this.thresholds,
      timestamp: Date.now()
    };
  }

  // Update thresholds
  updateThresholds(newThresholds: Partial<CachePerformanceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds };
  }

  // Enable/disable monitoring
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}

// React hook for cache performance monitoring
export function useCachePerformance(cacheKey?: string) {
  const monitor = CachePerformanceMonitor.getInstance();

  const trackOperation = (
    operation: 'get' | 'set' | 'delete' | 'evict',
    isHit: boolean = false,
    responseTime: number = 0,
    cacheSize: number = 0,
    metadata?: Record<string, any>
  ) => {
    if (!cacheKey) return;
    monitor.trackCacheOperation(cacheKey, operation, isHit, responseTime, cacheSize, metadata);
  };

  const getMetrics = () => {
    return cacheKey ? monitor.getMetrics(cacheKey) : monitor.getAllMetrics();
  };

  const getGlobalStats = () => monitor.getGlobalStats();

  const generateReport = () => monitor.generateReport();

  return {
    trackOperation,
    getMetrics,
    getGlobalStats,
    generateReport,
    isEnabled: monitor.isEnabled()
  };
}

// Higher-order function to wrap cache operations with monitoring
export function withCacheMonitoring<T extends (...args: any[]) => any>(
  cacheKey: string,
  cacheOperation: T,
  operationType: 'get' | 'set' | 'delete' | 'evict' = 'get'
): T {
  return ((...args: Parameters<T>) => {
    const monitor = CachePerformanceMonitor.getInstance();
    const startTime = performance.now();

    try {
      const result = cacheOperation(...args);

      // Handle both sync and async results
      if (result && typeof result.then === 'function') {
        return result.then(
          (value: any) => {
            const responseTime = performance.now() - startTime;
            const isHit = operationType === 'get' && value !== null && value !== undefined;

            monitor.trackCacheOperation(
              cacheKey,
              operationType,
              isHit,
              responseTime,
              typeof value === 'string' ? value.length : JSON.stringify(value || {}).length
            );

            return value;
          },
          (error: any) => {
            const responseTime = performance.now() - startTime;
            monitor.trackCacheOperation(
              cacheKey,
              operationType,
              false,
              responseTime,
              0,
              { error: error.message }
            );
            throw error;
          }
        );
      } else {
        const responseTime = performance.now() - startTime;
        const isHit = operationType === 'get' && result !== null && result !== undefined;

        monitor.trackCacheOperation(
          cacheKey,
          operationType,
          isHit,
          responseTime,
          typeof result === 'string' ? result.length : JSON.stringify(result || {}).length
        );

        return result;
      }
    } catch (error) {
      const responseTime = performance.now() - startTime;
      monitor.trackCacheOperation(
        cacheKey,
        operationType,
        false,
        responseTime,
        0,
        { error: (error as Error).message }
      );
      throw error;
    }
  }) as T;
}

// Export singleton instance
export const cachePerformanceMonitor = CachePerformanceMonitor.getInstance();

// Export types
export type { CachePerformanceThresholds, CachePerformanceEntry };