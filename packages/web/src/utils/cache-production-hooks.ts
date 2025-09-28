// Production Cache Monitoring Hooks
// Real-time cache performance monitoring for production environments

import { cachePerformanceMonitor } from './cache-performance';
import { cacheRegressionDetector, RegressionAlert } from './cache-regression-detector';

export interface ProductionCacheConfig {
  monitoringEnabled: boolean;
  regressionDetectionEnabled: boolean;
  alertWebhookUrl?: string;
  metricsEndpoint?: string;
  reportingInterval: number; // ms
  batchSize: number;
  maxRetries: number;
  environment: 'production' | 'staging' | 'development';
}

export interface CacheMetricsPayload {
  timestamp: number;
  environment: string;
  deployment: string;
  metrics: {
    globalHitRatio: number;
    totalRequests: number;
    avgResponseTime: number;
    totalCacheSize: number;
    performingCaches: number;
    underperformingCaches: number;
  };
  cacheDetails: Array<{
    cacheKey: string;
    hitRatio: number;
    responseTime: number;
    size: number;
    requests: number;
  }>;
  alerts: RegressionAlert[];
}

class ProductionCacheMonitor {
  private static instance: ProductionCacheMonitor;
  private config: ProductionCacheConfig;
  private reportingIntervalId?: NodeJS.Timeout;
  private pendingMetrics: CacheMetricsPayload[] = [];
  private retryQueue: Array<{ payload: CacheMetricsPayload; retries: number }> = [];

  constructor(config?: Partial<ProductionCacheConfig>) {
    this.config = {
      monitoringEnabled: process.env.NODE_ENV === 'production' ||
                        process.env.NEXT_PUBLIC_CACHE_PRODUCTION_MONITORING === 'true',
      regressionDetectionEnabled: process.env.NEXT_PUBLIC_CACHE_REGRESSION_DETECTION === 'true',
      alertWebhookUrl: process.env.CACHE_ALERT_WEBHOOK_URL,
      metricsEndpoint: process.env.CACHE_METRICS_ENDPOINT,
      reportingInterval: parseInt(process.env.CACHE_REPORTING_INTERVAL || '60000'), // 1 minute
      batchSize: parseInt(process.env.CACHE_BATCH_SIZE || '10'),
      maxRetries: parseInt(process.env.CACHE_MAX_RETRIES || '3'),
      environment: (process.env.NODE_ENV as any) || 'development',
      ...config
    };

    if (this.config.monitoringEnabled) {
      this.startProductionMonitoring();
    }

    // Set up error handling
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.flushPendingMetrics();
      });

      // Handle page visibility changes
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          this.flushPendingMetrics();
        }
      });
    }
  }

  static getInstance(config?: Partial<ProductionCacheConfig>): ProductionCacheMonitor {
    if (!ProductionCacheMonitor.instance) {
      ProductionCacheMonitor.instance = new ProductionCacheMonitor(config);
    }
    return ProductionCacheMonitor.instance;
  }

  private startProductionMonitoring(): void {
    if (this.reportingIntervalId) {
      clearInterval(this.reportingIntervalId);
    }

    // Start periodic reporting
    this.reportingIntervalId = setInterval(() => {
      this.collectAndReportMetrics();
    }, this.config.reportingInterval);

    // Report initial metrics after a short delay
    setTimeout(() => {
      this.collectAndReportMetrics();
    }, 10000); // 10 second delay for initial data collection
  }

  private collectAndReportMetrics(): void {
    if (!this.config.monitoringEnabled) return;

    try {
      const globalStats = cachePerformanceMonitor.getGlobalStats();
      const allMetrics = cachePerformanceMonitor.getAllMetrics();
      const alerts = this.config.regressionDetectionEnabled
        ? cacheRegressionDetector.getAlerts({ limit: 50 })
        : [];

      // Convert cache metrics to reportable format
      const cacheDetails = Array.from(allMetrics.entries()).map(([cacheKey, metrics]) => ({
        cacheKey,
        hitRatio: metrics.hitRatio,
        responseTime: metrics.avgResponseTime,
        size: metrics.cacheSize,
        requests: metrics.totalRequests
      }));

      const payload: CacheMetricsPayload = {
        timestamp: Date.now(),
        environment: this.config.environment,
        deployment: process.env.VERCEL_GIT_COMMIT_SHA ||
                   process.env.NETLIFY_DEPLOY_ID ||
                   'local',
        metrics: {
          globalHitRatio: globalStats.globalHitRatio,
          totalRequests: globalStats.totalRequests,
          avgResponseTime: globalStats.avgResponseTime,
          totalCacheSize: globalStats.totalSize,
          performingCaches: globalStats.performingCaches,
          underperformingCaches: globalStats.underperformingCaches
        },
        cacheDetails,
        alerts
      };

      this.queueMetrics(payload);
      this.processMetricsQueue();

    } catch (error) {
      console.error('Failed to collect cache metrics:', error);
    }
  }

  private queueMetrics(payload: CacheMetricsPayload): void {
    this.pendingMetrics.push(payload);

    // Limit queue size to prevent memory issues
    if (this.pendingMetrics.length > 100) {
      this.pendingMetrics = this.pendingMetrics.slice(-50);
    }
  }

  private async processMetricsQueue(): Promise<void> {
    if (this.pendingMetrics.length === 0) return;

    const batch = this.pendingMetrics.splice(0, this.config.batchSize);

    for (const payload of batch) {
      try {
        await this.sendMetrics(payload);
        await this.processAlerts(payload.alerts);
      } catch (error) {
        console.error('Failed to send metrics:', error);

        // Add to retry queue if not at max retries
        this.retryQueue.push({ payload, retries: 0 });
      }
    }

    // Process retry queue
    await this.processRetryQueue();
  }

  private async processRetryQueue(): Promise<void> {
    if (this.retryQueue.length === 0) return;

    const retryBatch = this.retryQueue.splice(0, this.config.batchSize);

    for (const item of retryBatch) {
      try {
        await this.sendMetrics(item.payload);
      } catch (error) {
        if (item.retries < this.config.maxRetries) {
          item.retries++;
          this.retryQueue.push(item);
        } else {
          console.error('Max retries exceeded for metrics payload:', error);
        }
      }
    }
  }

  private async sendMetrics(payload: CacheMetricsPayload): Promise<void> {
    if (!this.config.metricsEndpoint) return;

    const response = await fetch(this.config.metricsEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Environment': this.config.environment,
        'X-Source': 'cache-performance-monitor'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Metrics endpoint responded with ${response.status}: ${response.statusText}`);
    }
  }

  private async processAlerts(alerts: RegressionAlert[]): Promise<void> {
    const criticalAlerts = alerts.filter(alert =>
      alert.severity === 'critical' || alert.severity === 'high'
    );

    if (criticalAlerts.length > 0 && this.config.alertWebhookUrl) {
      await this.sendAlerts(criticalAlerts);
    }
  }

  private async sendAlerts(alerts: RegressionAlert[]): Promise<void> {
    if (!this.config.alertWebhookUrl) return;

    const alertPayload = {
      timestamp: Date.now(),
      environment: this.config.environment,
      deployment: process.env.VERCEL_GIT_COMMIT_SHA ||
                 process.env.NETLIFY_DEPLOY_ID ||
                 'local',
      alerts: alerts.map(alert => ({
        ...alert,
        url: typeof window !== 'undefined' ? window.location.href : 'unknown'
      }))
    };

    try {
      const response = await fetch(this.config.alertWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Environment': this.config.environment,
          'X-Source': 'cache-regression-detector'
        },
        body: JSON.stringify(alertPayload)
      });

      if (!response.ok) {
        throw new Error(`Alert webhook responded with ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to send alert webhook:', error);
    }
  }

  private flushPendingMetrics(): void {
    if (this.pendingMetrics.length === 0) return;

    // Send remaining metrics synchronously if possible
    if (navigator.sendBeacon && this.config.metricsEndpoint) {
      const payload = {
        timestamp: Date.now(),
        pendingMetrics: this.pendingMetrics
      };

      navigator.sendBeacon(
        this.config.metricsEndpoint,
        JSON.stringify(payload)
      );
    }

    this.pendingMetrics = [];
  }

  // Public API methods

  forceReport(): void {
    this.collectAndReportMetrics();
  }

  updateConfig(newConfig: Partial<ProductionCacheConfig>): void {
    this.config = { ...this.config, ...newConfig };

    if (this.config.monitoringEnabled && !this.reportingIntervalId) {
      this.startProductionMonitoring();
    } else if (!this.config.monitoringEnabled && this.reportingIntervalId) {
      clearInterval(this.reportingIntervalId);
      this.reportingIntervalId = undefined;
    }
  }

  getQueueStatus(): {
    pending: number;
    retrying: number;
    isProcessing: boolean;
  } {
    return {
      pending: this.pendingMetrics.length,
      retrying: this.retryQueue.length,
      isProcessing: !!this.reportingIntervalId
    };
  }

  async testConnection(): Promise<boolean> {
    if (!this.config.metricsEndpoint) return false;

    try {
      const response = await fetch(this.config.metricsEndpoint, {
        method: 'HEAD',
        headers: {
          'X-Environment': this.config.environment,
          'X-Source': 'cache-performance-monitor'
        }
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  stop(): void {
    if (this.reportingIntervalId) {
      clearInterval(this.reportingIntervalId);
      this.reportingIntervalId = undefined;
    }

    this.flushPendingMetrics();
  }

  isEnabled(): boolean {
    return this.config.monitoringEnabled;
  }

  getConfig(): ProductionCacheConfig {
    return { ...this.config };
  }
}

// Enhanced cache operation wrapper with production monitoring
export function withProductionCacheMonitoring<T extends (...args: any[]) => any>(
  cacheKey: string,
  cacheOperation: T,
  operationType: 'get' | 'set' | 'delete' | 'evict' = 'get'
): T {
  return ((...args: Parameters<T>) => {
    const startTime = performance.now();
    const monitor = ProductionCacheMonitor.getInstance();

    try {
      const result = cacheOperation(...args);

      // Handle both sync and async results
      if (result && typeof result.then === 'function') {
        return result.then(
          (value: any) => {
            const responseTime = performance.now() - startTime;
            const isHit = operationType === 'get' && value !== null && value !== undefined;

            // Track with both performance monitor and production hooks
            cachePerformanceMonitor.trackCacheOperation(
              cacheKey,
              operationType,
              isHit,
              responseTime,
              typeof value === 'string' ? value.length : JSON.stringify(value || {}).length,
              {
                productionMonitored: true,
                userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
                timestamp: Date.now()
              }
            );

            return value;
          },
          (error: any) => {
            const responseTime = performance.now() - startTime;

            cachePerformanceMonitor.trackCacheOperation(
              cacheKey,
              operationType,
              false,
              responseTime,
              0,
              {
                error: error.message,
                productionMonitored: true,
                timestamp: Date.now()
              }
            );

            throw error;
          }
        );
      } else {
        const responseTime = performance.now() - startTime;
        const isHit = operationType === 'get' && result !== null && result !== undefined;

        cachePerformanceMonitor.trackCacheOperation(
          cacheKey,
          operationType,
          isHit,
          responseTime,
          typeof result === 'string' ? result.length : JSON.stringify(result || {}).length,
          {
            productionMonitored: true,
            timestamp: Date.now()
          }
        );

        return result;
      }
    } catch (error) {
      const responseTime = performance.now() - startTime;

      cachePerformanceMonitor.trackCacheOperation(
        cacheKey,
        operationType,
        false,
        responseTime,
        0,
        {
          error: (error as Error).message,
          productionMonitored: true,
          timestamp: Date.now()
        }
      );

      throw error;
    }
  }) as T;
}

// React hook for production monitoring
export function useProductionCacheMonitoring() {
  const monitor = ProductionCacheMonitor.getInstance();

  return {
    forceReport: monitor.forceReport.bind(monitor),
    getQueueStatus: monitor.getQueueStatus.bind(monitor),
    testConnection: monitor.testConnection.bind(monitor),
    isEnabled: monitor.isEnabled.bind(monitor),
    getConfig: monitor.getConfig.bind(monitor)
  };
}

// Export singleton instance
export const productionCacheMonitor = ProductionCacheMonitor.getInstance();

// Export types
export type { ProductionCacheConfig, CacheMetricsPayload };