// Cache Regression Detection System
// Automated detection of cache performance regressions and anomalies

import { cachePerformanceMonitor, CacheMetrics, CachePerformanceEntry } from './cache-performance';

export interface RegressionAlert {
  id: string;
  timestamp: number;
  cacheKey: string;
  type: 'hit_ratio_drop' | 'response_time_spike' | 'cache_size_bloat' | 'eviction_storm';
  severity: 'low' | 'medium' | 'high' | 'critical';
  currentValue: number;
  expectedValue: number;
  threshold: number;
  description: string;
  recommendations: string[];
  metadata?: Record<string, any>;
}

export interface RegressionDetectorConfig {
  enabled: boolean;
  checkInterval: number; // ms
  windowSize: number; // number of measurements to consider
  thresholds: {
    hitRatioDropThreshold: number; // percentage drop to trigger alert
    responseTimeMultiplier: number; // multiplier above baseline to trigger alert
    cacheSizeGrowthThreshold: number; // percentage growth to trigger alert
    evictionRateThreshold: number; // evictions per minute to trigger alert
  };
  alertCooldown: number; // ms between similar alerts
}

interface PerformanceBaseline {
  cacheKey: string;
  hitRatio: number;
  avgResponseTime: number;
  cacheSize: number;
  evictionRate: number;
  sampleCount: number;
  lastUpdated: number;
  confidence: number; // 0-1, higher is more reliable baseline
}

class CacheRegressionDetector {
  private static instance: CacheRegressionDetector;
  private config: RegressionDetectorConfig;
  private baselines = new Map<string, PerformanceBaseline>();
  private recentAlerts = new Map<string, number>(); // alertKey -> timestamp
  private alerts: RegressionAlert[] = [];
  private checkIntervalId?: NodeJS.Timeout;
  private lastCheckTime: number = 0;

  constructor(config?: Partial<RegressionDetectorConfig>) {
    this.config = {
      enabled: process.env.NODE_ENV === 'development' ||
               process.env.NEXT_PUBLIC_CACHE_REGRESSION_DETECTION === 'true',
      checkInterval: 30000, // 30 seconds
      windowSize: 10,
      thresholds: {
        hitRatioDropThreshold: 0.1, // 10% drop
        responseTimeMultiplier: 2.0, // 2x slower
        cacheSizeGrowthThreshold: 0.5, // 50% growth
        evictionRateThreshold: 10 // 10 evictions per minute
      },
      alertCooldown: 300000, // 5 minutes
      ...config
    };

    if (this.config.enabled) {
      this.startMonitoring();
    }
  }

  static getInstance(config?: Partial<RegressionDetectorConfig>): CacheRegressionDetector {
    if (!CacheRegressionDetector.instance) {
      CacheRegressionDetector.instance = new CacheRegressionDetector(config);
    }
    return CacheRegressionDetector.instance;
  }

  private startMonitoring(): void {
    if (this.checkIntervalId) {
      clearInterval(this.checkIntervalId);
    }

    this.checkIntervalId = setInterval(() => {
      this.performRegressionCheck();
    }, this.config.checkInterval);

    // Initial baseline establishment
    setTimeout(() => {
      this.establishBaselines();
    }, this.config.checkInterval * 2);
  }

  private stopMonitoring(): void {
    if (this.checkIntervalId) {
      clearInterval(this.checkIntervalId);
      this.checkIntervalId = undefined;
    }
  }

  private establishBaselines(): void {
    const allMetrics = cachePerformanceMonitor.getAllMetrics();

    allMetrics.forEach((metrics, cacheKey) => {
      if (metrics.totalRequests >= this.config.windowSize) {
        this.updateBaseline(cacheKey, metrics);
      }
    });
  }

  private updateBaseline(cacheKey: string, metrics: CacheMetrics): void {
    const existing = this.baselines.get(cacheKey);
    const now = performance.now();

    // Calculate confidence based on sample size and consistency
    const confidence = Math.min(1.0, metrics.totalRequests / (this.config.windowSize * 2));

    const baseline: PerformanceBaseline = {
      cacheKey,
      hitRatio: existing ? this.smoothValue(existing.hitRatio, metrics.hitRatio, 0.1) : metrics.hitRatio,
      avgResponseTime: existing ? this.smoothValue(existing.avgResponseTime, metrics.avgResponseTime, 0.1) : metrics.avgResponseTime,
      cacheSize: existing ? this.smoothValue(existing.cacheSize, metrics.cacheSize, 0.2) : metrics.cacheSize,
      evictionRate: this.calculateEvictionRate(cacheKey),
      sampleCount: metrics.totalRequests,
      lastUpdated: now,
      confidence
    };

    this.baselines.set(cacheKey, baseline);
  }

  private smoothValue(oldValue: number, newValue: number, alpha: number): number {
    return oldValue * (1 - alpha) + newValue * alpha;
  }

  private calculateEvictionRate(cacheKey: string): number {
    const now = performance.now();
    const windowStart = now - 60000; // 1 minute window

    const recentEntries = cachePerformanceMonitor.getPerformanceEntries({
      cacheKey,
      timeRange: { start: windowStart, end: now }
    });

    const evictions = recentEntries.filter(entry => entry.operation === 'evict').length;
    return evictions; // evictions per minute
  }

  private performRegressionCheck(): void {
    if (!this.config.enabled) return;

    const now = performance.now();
    this.lastCheckTime = now;

    const allMetrics = cachePerformanceMonitor.getAllMetrics();

    allMetrics.forEach((metrics, cacheKey) => {
      const baseline = this.baselines.get(cacheKey);

      if (!baseline || baseline.confidence < 0.5) {
        // Establish or update baseline if not reliable enough
        if (metrics.totalRequests >= this.config.windowSize) {
          this.updateBaseline(cacheKey, metrics);
        }
        return;
      }

      // Check for regressions
      this.checkHitRatioRegression(cacheKey, metrics, baseline);
      this.checkResponseTimeRegression(cacheKey, metrics, baseline);
      this.checkCacheSizeRegression(cacheKey, metrics, baseline);
      this.checkEvictionRegression(cacheKey, baseline);
    });

    // Clean up old alerts
    this.cleanupOldAlerts();
  }

  private checkHitRatioRegression(cacheKey: string, metrics: CacheMetrics, baseline: PerformanceBaseline): void {
    const hitRatioDrop = baseline.hitRatio - metrics.hitRatio;

    if (hitRatioDrop > this.config.thresholds.hitRatioDropThreshold) {
      const severity = this.calculateSeverity(hitRatioDrop, this.config.thresholds.hitRatioDropThreshold);

      this.createAlert({
        cacheKey,
        type: 'hit_ratio_drop',
        severity,
        currentValue: metrics.hitRatio,
        expectedValue: baseline.hitRatio,
        threshold: this.config.thresholds.hitRatioDropThreshold,
        description: `Cache hit ratio dropped by ${(hitRatioDrop * 100).toFixed(1)}% from baseline of ${(baseline.hitRatio * 100).toFixed(1)}%`,
        recommendations: [
          'Review recent changes to cache key generation logic',
          'Check if cache TTL settings have been modified',
          'Verify cache storage capacity and eviction policies',
          'Monitor application load patterns for anomalies'
        ],
        metadata: {
          baselineHitRatio: baseline.hitRatio,
          currentHitRatio: metrics.hitRatio,
          dropPercentage: hitRatioDrop * 100
        }
      });
    }
  }

  private checkResponseTimeRegression(cacheKey: string, metrics: CacheMetrics, baseline: PerformanceBaseline): void {
    const responseTimeRatio = metrics.avgResponseTime / baseline.avgResponseTime;

    if (responseTimeRatio > this.config.thresholds.responseTimeMultiplier) {
      const severity = this.calculateSeverity(responseTimeRatio, this.config.thresholds.responseTimeMultiplier);

      this.createAlert({
        cacheKey,
        type: 'response_time_spike',
        severity,
        currentValue: metrics.avgResponseTime,
        expectedValue: baseline.avgResponseTime,
        threshold: this.config.thresholds.responseTimeMultiplier,
        description: `Cache response time increased ${responseTimeRatio.toFixed(1)}x from baseline of ${baseline.avgResponseTime.toFixed(1)}ms`,
        recommendations: [
          'Check cache storage backend performance',
          'Monitor system resource utilization (CPU, memory, I/O)',
          'Review concurrent cache access patterns',
          'Consider cache storage optimization or scaling'
        ],
        metadata: {
          baselineResponseTime: baseline.avgResponseTime,
          currentResponseTime: metrics.avgResponseTime,
          multiplier: responseTimeRatio
        }
      });
    }
  }

  private checkCacheSizeRegression(cacheKey: string, metrics: CacheMetrics, baseline: PerformanceBaseline): void {
    const sizeGrowth = (metrics.cacheSize - baseline.cacheSize) / baseline.cacheSize;

    if (sizeGrowth > this.config.thresholds.cacheSizeGrowthThreshold) {
      const severity = this.calculateSeverity(sizeGrowth, this.config.thresholds.cacheSizeGrowthThreshold);

      this.createAlert({
        cacheKey,
        type: 'cache_size_bloat',
        severity,
        currentValue: metrics.cacheSize,
        expectedValue: baseline.cacheSize,
        threshold: this.config.thresholds.cacheSizeGrowthThreshold,
        description: `Cache size grew by ${(sizeGrowth * 100).toFixed(1)}% from baseline of ${this.formatBytes(baseline.cacheSize)}`,
        recommendations: [
          'Review cache entry sizes and optimize data structures',
          'Implement or tune cache size limits',
          'Check for memory leaks in cached data',
          'Consider cache compression strategies'
        ],
        metadata: {
          baselineCacheSize: baseline.cacheSize,
          currentCacheSize: metrics.cacheSize,
          growthPercentage: sizeGrowth * 100
        }
      });
    }
  }

  private checkEvictionRegression(cacheKey: string, baseline: PerformanceBaseline): void {
    const currentEvictionRate = this.calculateEvictionRate(cacheKey);

    if (currentEvictionRate > this.config.thresholds.evictionRateThreshold) {
      this.createAlert({
        cacheKey,
        type: 'eviction_storm',
        severity: 'high',
        currentValue: currentEvictionRate,
        expectedValue: baseline.evictionRate,
        threshold: this.config.thresholds.evictionRateThreshold,
        description: `High eviction rate detected: ${currentEvictionRate} evictions per minute`,
        recommendations: [
          'Increase cache capacity if possible',
          'Review cache TTL and eviction policies',
          'Optimize cache key strategies to reduce conflicts',
          'Monitor memory pressure and application load'
        ],
        metadata: {
          evictionRate: currentEvictionRate,
          threshold: this.config.thresholds.evictionRateThreshold
        }
      });
    }
  }

  private calculateSeverity(actualValue: number, threshold: number): RegressionAlert['severity'] {
    const ratio = actualValue / threshold;

    if (ratio >= 3) return 'critical';
    if (ratio >= 2) return 'high';
    if (ratio >= 1.5) return 'medium';
    return 'low';
  }

  private createAlert(alertData: Omit<RegressionAlert, 'id' | 'timestamp'>): void {
    const alertKey = `${alertData.cacheKey}-${alertData.type}`;
    const lastAlert = this.recentAlerts.get(alertKey);
    const now = performance.now();

    // Check cooldown period
    if (lastAlert && (now - lastAlert) < this.config.alertCooldown) {
      return;
    }

    const alert: RegressionAlert = {
      id: `${alertKey}-${now}`,
      timestamp: now,
      ...alertData
    };

    this.alerts.push(alert);
    this.recentAlerts.set(alertKey, now);

    // Emit alert (could be extended to send to monitoring systems)
    this.emitAlert(alert);
  }

  private emitAlert(alert: RegressionAlert): void {
    if (console.warn) {
      console.warn(`Cache Regression Alert [${alert.severity.toUpperCase()}]:`, {
        cache: alert.cacheKey,
        type: alert.type,
        description: alert.description,
        recommendations: alert.recommendations
      });
    }

    // Could be extended to:
    // - Send to monitoring systems (DataDog, New Relic, etc.)
    // - Trigger notifications (Slack, email, etc.)
    // - Log to structured logging system
    // - Update metrics dashboards
  }

  private cleanupOldAlerts(): void {
    const cutoff = performance.now() - (24 * 60 * 60 * 1000); // 24 hours
    this.alerts = this.alerts.filter(alert => alert.timestamp > cutoff);

    // Clean up recent alerts tracking
    for (const [key, timestamp] of this.recentAlerts.entries()) {
      if (timestamp < cutoff) {
        this.recentAlerts.delete(key);
      }
    }
  }

  private formatBytes(bytes: number): string {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  }

  // Public API methods

  getAlerts(filter?: {
    severity?: RegressionAlert['severity'];
    type?: RegressionAlert['type'];
    cacheKey?: string;
    limit?: number;
  }): RegressionAlert[] {
    let filtered = [...this.alerts];

    if (filter?.severity) {
      filtered = filtered.filter(alert => alert.severity === filter.severity);
    }

    if (filter?.type) {
      filtered = filtered.filter(alert => alert.type === filter.type);
    }

    if (filter?.cacheKey) {
      filtered = filtered.filter(alert => alert.cacheKey === filter.cacheKey);
    }

    filtered.sort((a, b) => b.timestamp - a.timestamp);

    if (filter?.limit) {
      filtered = filtered.slice(0, filter.limit);
    }

    return filtered;
  }

  getBaselines(): Map<string, PerformanceBaseline> {
    return new Map(this.baselines);
  }

  updateConfig(newConfig: Partial<RegressionDetectorConfig>): void {
    this.config = { ...this.config, ...newConfig };

    if (this.config.enabled && !this.checkIntervalId) {
      this.startMonitoring();
    } else if (!this.config.enabled && this.checkIntervalId) {
      this.stopMonitoring();
    }
  }

  reset(): void {
    this.baselines.clear();
    this.alerts = [];
    this.recentAlerts.clear();
  }

  forceCheck(): void {
    this.performRegressionCheck();
  }

  getLastCheckTime(): number {
    return this.lastCheckTime;
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  exportData(): {
    baselines: PerformanceBaseline[];
    alerts: RegressionAlert[];
    config: RegressionDetectorConfig;
    lastCheckTime: number;
  } {
    return {
      baselines: Array.from(this.baselines.values()),
      alerts: this.alerts,
      config: this.config,
      lastCheckTime: this.lastCheckTime
    };
  }
}

// React hook for regression detection
export function useCacheRegressionDetector() {
  const detector = CacheRegressionDetector.getInstance();

  return {
    getAlerts: detector.getAlerts.bind(detector),
    getBaselines: detector.getBaselines.bind(detector),
    forceCheck: detector.forceCheck.bind(detector),
    isEnabled: detector.isEnabled.bind(detector),
    getLastCheckTime: detector.getLastCheckTime.bind(detector)
  };
}

// Export singleton instance
export const cacheRegressionDetector = CacheRegressionDetector.getInstance();

// Export types
export type { PerformanceBaseline, RegressionDetectorConfig };