// Performance monitoring utilities for React optimization
import React from 'react';
interface PerformanceOptions {
  enabled?: boolean;
  logToConsole?: boolean;
  trackToMemory?: boolean;
}

interface RenderMetrics {
  componentName: string;
  renderCount: number;
  lastRenderTime: number;
  propsChanged: boolean;
  reason?: string;
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private renderMetrics = new Map<string, RenderMetrics>();
  private options: PerformanceOptions;

  constructor(options: PerformanceOptions = {}) {
    this.options = {
      enabled: process.env.NODE_ENV === 'development',
      logToConsole: true,
      trackToMemory: true,
      ...options
    };
  }

  static getInstance(options?: PerformanceOptions): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor(options);
    }
    return PerformanceMonitor.instance;
  }

  trackRender(componentName: string, reason?: string, propsChanged: boolean = false): void {
    if (!this.options.enabled) return;

    const now = performance.now();
    const metrics = this.renderMetrics.get(componentName) || {
      componentName,
      renderCount: 0,
      lastRenderTime: now,
      propsChanged: false
    };

    metrics.renderCount++;
    metrics.lastRenderTime = now;
    metrics.propsChanged = propsChanged;
    metrics.reason = reason;

    this.renderMetrics.set(componentName, metrics);

    if (this.options.logToConsole) {
      console.log(`[Render] ${componentName} (#${metrics.renderCount})${reason ? ` - ${reason}` : ''}`, {
        propsChanged,
        timestamp: new Date().toISOString()
      });
    }
  }

  getMetrics(componentName?: string): RenderMetrics | Map<string, RenderMetrics> {
    if (componentName) {
      return this.renderMetrics.get(componentName) || {
        componentName,
        renderCount: 0,
        lastRenderTime: 0,
        propsChanged: false
      };
    }
    return new Map(this.renderMetrics);
  }

  resetMetrics(componentName?: string): void {
    if (componentName) {
      this.renderMetrics.delete(componentName);
    } else {
      this.renderMetrics.clear();
    }
  }

  getRenderReduction(componentName: string, baselineRenders: number): number {
    const metrics = this.renderMetrics.get(componentName);
    if (!metrics) return 0;

    const reduction = ((baselineRenders - metrics.renderCount) / baselineRenders) * 100;
    return Math.max(0, reduction);
  }
}

// React hook for performance tracking
export function usePerformanceTracker(componentName: string) {
  const monitor = PerformanceMonitor.getInstance();

  const trackRender = (reason?: string, propsChanged?: boolean) => {
    monitor.trackRender(componentName, reason, propsChanged);
  };

  const getMetrics = () => monitor.getMetrics(componentName);

  const resetMetrics = () => monitor.resetMetrics(componentName);

  return { trackRender, getMetrics, resetMetrics };
}

// Higher-order component for automatic render tracking
export function withPerformanceTracking<P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string
) {
  const WrappedComponent = React.memo((props: P) => {
    const name = componentName || Component.displayName || Component.name || 'Unknown';
    const { trackRender } = usePerformanceTracker(name);

    React.useEffect(() => {
      trackRender('mounted');
    }, []);

    React.useEffect(() => {
      trackRender('props changed', true);
    }, [props]);

    return <Component {...props} />;
  });

  WrappedComponent.displayName = `withPerformanceTracking(${componentName || Component.displayName || Component.name})`;

  return WrappedComponent;
}

// Feature flag system for progressive rollout
interface FeatureFlags {
  reactOptimizations: boolean;
  performanceTracking: boolean;
  memoization: boolean;
  callbackOptimization: boolean;
}

class FeatureFlagManager {
  private static instance: FeatureFlagManager;
  private flags: FeatureFlags;

  constructor() {
    // Default flags - can be overridden by environment variables or remote config
    this.flags = {
      reactOptimizations: process.env.NEXT_PUBLIC_REACT_OPTIMIZATIONS === 'true' || true,
      performanceTracking: process.env.NEXT_PUBLIC_PERFORMANCE_TRACKING === 'true' || process.env.NODE_ENV === 'development',
      memoization: process.env.NEXT_PUBLIC_MEMOIZATION === 'true' || true,
      callbackOptimization: process.env.NEXT_PUBLIC_CALLBACK_OPTIMIZATION === 'true' || true
    };
  }

  static getInstance(): FeatureFlagManager {
    if (!FeatureFlagManager.instance) {
      FeatureFlagManager.instance = new FeatureFlagManager();
    }
    return FeatureFlagManager.instance;
  }

  isEnabled(flag: keyof FeatureFlags): boolean {
    return this.flags[flag];
  }

  setFlag(flag: keyof FeatureFlags, value: boolean): void {
    this.flags[flag] = value;
  }

  getAllFlags(): FeatureFlags {
    return { ...this.flags };
  }
}

export const featureFlags = FeatureFlagManager.getInstance();

// Cache Performance Integration
// Integrate with cache monitoring system for comprehensive tracking

import type { CacheMetrics } from './cache-performance';

// Enhanced performance monitoring with cache integration
export interface EnhancedPerformanceMetrics extends RenderMetrics {
  cacheMetrics?: {
    hitRatio: number;
    responseTime: number;
    cacheSize: number;
  };
}

// Enhanced performance monitor that integrates with cache monitoring
class EnhancedPerformanceMonitor extends PerformanceMonitor {
  private cacheMetrics = new Map<string, CacheMetrics>();

  // Track cache-related render performance
  trackCacheRender(
    componentName: string,
    cacheKey: string,
    isHit: boolean,
    cacheResponseTime: number,
    reason?: string
  ): void {
    const renderReason = isHit
      ? `cache hit: ${cacheKey} (${cacheResponseTime.toFixed(1)}ms)`
      : `cache miss: ${cacheKey} (${cacheResponseTime.toFixed(1)}ms)`;

    this.trackRender(componentName, reason || renderReason, !isHit);

    // Store cache performance correlation
    const existing = this.renderMetrics.get(componentName);
    if (existing) {
      (existing as any).cacheMetrics = {
        hitRatio: isHit ? 1 : 0,
        responseTime: cacheResponseTime,
        cacheSize: 0 // Would need to be passed from cache
      };
    }
  }

  // Get enhanced metrics including cache performance
  getEnhancedMetrics(componentName?: string): EnhancedPerformanceMetrics | Map<string, EnhancedPerformanceMetrics> {
    if (componentName) {
      const base = this.getMetrics(componentName) as RenderMetrics;
      return {
        ...base,
        cacheMetrics: (base as any).cacheMetrics
      };
    }

    const allMetrics = this.getMetrics() as Map<string, RenderMetrics>;
    const enhanced = new Map<string, EnhancedPerformanceMetrics>();

    allMetrics.forEach((metrics, key) => {
      enhanced.set(key, {
        ...metrics,
        cacheMetrics: (metrics as any).cacheMetrics
      });
    });

    return enhanced;
  }

  // Generate integrated performance report
  generateIntegratedReport(): {
    renderPerformance: Map<string, RenderMetrics>;
    cacheCorrelations: Array<{
      component: string;
      cacheImpact: 'positive' | 'negative' | 'neutral';
      hitRatio: number;
      avgCacheTime: number;
    }>;
    recommendations: string[];
  } {
    const renderMetrics = this.getMetrics() as Map<string, RenderMetrics>;
    const cacheCorrelations: Array<{
      component: string;
      cacheImpact: 'positive' | 'negative' | 'neutral';
      hitRatio: number;
      avgCacheTime: number;
    }> = [];

    const recommendations: string[] = [];

    renderMetrics.forEach((metrics, component) => {
      const cacheMetrics = (metrics as any).cacheMetrics;
      if (cacheMetrics) {
        const impact = cacheMetrics.hitRatio > 0.7 ? 'positive' :
                      cacheMetrics.hitRatio < 0.3 ? 'negative' : 'neutral';

        cacheCorrelations.push({
          component,
          cacheImpact: impact,
          hitRatio: cacheMetrics.hitRatio,
          avgCacheTime: cacheMetrics.responseTime
        });

        if (impact === 'negative') {
          recommendations.push(
            `Component ${component} has poor cache performance (${(cacheMetrics.hitRatio * 100).toFixed(1)}% hit ratio). Consider optimizing cache strategy.`
          );
        }

        if (cacheMetrics.responseTime > 100) {
          recommendations.push(
            `Component ${component} cache is slow (${cacheMetrics.responseTime.toFixed(1)}ms). Consider cache optimization or different storage backend.`
          );
        }
      }
    });

    return {
      renderPerformance: renderMetrics,
      cacheCorrelations,
      recommendations
    };
  }
}

// Create enhanced instance
const enhancedPerformanceMonitor = new EnhancedPerformanceMonitor();

// Enhanced React hook for performance tracking with cache integration
export function useEnhancedPerformanceTracker(componentName: string) {
  const trackRender = (reason?: string, propsChanged?: boolean) => {
    enhancedPerformanceMonitor.trackRender(componentName, reason, propsChanged);
  };

  const trackCacheRender = (
    cacheKey: string,
    isHit: boolean,
    cacheResponseTime: number,
    reason?: string
  ) => {
    enhancedPerformanceMonitor.trackCacheRender(
      componentName,
      cacheKey,
      isHit,
      cacheResponseTime,
      reason
    );
  };

  const getMetrics = () => enhancedPerformanceMonitor.getEnhancedMetrics(componentName);

  const resetMetrics = () => enhancedPerformanceMonitor.resetMetrics(componentName);

  const generateReport = () => enhancedPerformanceMonitor.generateIntegratedReport();

  return {
    trackRender,
    trackCacheRender,
    getMetrics,
    resetMetrics,
    generateReport
  };
}

// Export the performance monitor instance (enhanced)
export const performanceMonitor = enhancedPerformanceMonitor;

// Export original instance for backward compatibility
export const basicPerformanceMonitor = PerformanceMonitor.getInstance();

export type { RenderMetrics, PerformanceOptions, FeatureFlags, EnhancedPerformanceMetrics };