/**
 * React DevTools profiling automation for CI/CD integration
 * Provides automated performance profiling and analysis
 */

export interface ProfilerData {
  id: string;
  phase: 'mount' | 'update';
  actualDuration: number;
  baseDuration: number;
  startTime: number;
  commitTime: number;
  interactions: Set<any>;
}

export interface ProfilingResults {
  componentName: string;
  totalTime: number;
  renderCount: number;
  averageRenderTime: number;
  slowestRender: number;
  fastestRender: number;
  mountTime: number;
  updateTimes: number[];
  memoryUsage: {
    initial: number;
    peak: number;
    final: number;
  };
}

export interface PerformanceThresholds {
  maxRenderTime: number;
  maxMountTime: number;
  maxMemoryIncrease: number;
  minFrameRate: number;
  maxTotalRenders: number;
}

class ProfilerManager {
  private profilerData: Map<string, ProfilerData[]> = new Map();
  private performanceObserver: PerformanceObserver | null = null;
  private memoryBaseline: number = 0;

  /**
   * Initialize performance monitoring
   */
  initialize(): void {
    this.memoryBaseline = this.getCurrentMemoryUsage();

    // Set up performance observer for tracking long tasks
    if (typeof PerformanceObserver !== 'undefined') {
      this.performanceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'longtask' && entry.duration > 16.67) {
            console.warn(`Long task detected: ${entry.duration.toFixed(2)}ms`);
          }
        }
      });

      try {
        this.performanceObserver.observe({ entryTypes: ['longtask'] });
      } catch (e) {
        console.warn('Long task monitoring not supported');
      }
    }
  }

  /**
   * React Profiler callback for collecting data
   */
  onRender = (id: string, phase: 'mount' | 'update', actualDuration: number, baseDuration: number, startTime: number, commitTime: number, interactions: Set<any>): void => {
    const data: ProfilerData = {
      id,
      phase,
      actualDuration,
      baseDuration,
      startTime,
      commitTime,
      interactions,
    };

    const existing = this.profilerData.get(id) || [];
    existing.push(data);
    this.profilerData.set(id, existing);

    // Log slow renders in real-time
    if (actualDuration > 16.67) { // Slower than 60fps
      console.warn(`Slow render detected for ${id}: ${actualDuration.toFixed(2)}ms (${phase})`);
    }
  };

  /**
   * Generate comprehensive profiling results
   */
  generateResults(componentId: string): ProfilingResults | null {
    const data = this.profilerData.get(componentId);
    if (!data || data.length === 0) {
      return null;
    }

    const renderTimes = data.map(d => d.actualDuration);
    const mountData = data.filter(d => d.phase === 'mount');
    const updateData = data.filter(d => d.phase === 'update');

    const results: ProfilingResults = {
      componentName: componentId,
      totalTime: renderTimes.reduce((sum, time) => sum + time, 0),
      renderCount: data.length,
      averageRenderTime: renderTimes.reduce((sum, time) => sum + time, 0) / renderTimes.length,
      slowestRender: Math.max(...renderTimes),
      fastestRender: Math.min(...renderTimes),
      mountTime: mountData.length > 0 ? mountData[0].actualDuration : 0,
      updateTimes: updateData.map(d => d.actualDuration),
      memoryUsage: {
        initial: this.memoryBaseline,
        peak: this.getPeakMemoryUsage(),
        final: this.getCurrentMemoryUsage(),
      },
    };

    return results;
  }

  /**
   * Get all profiling results
   */
  getAllResults(): Map<string, ProfilingResults> {
    const results = new Map<string, ProfilingResults>();

    for (const [componentId] of this.profilerData) {
      const result = this.generateResults(componentId);
      if (result) {
        results.set(componentId, result);
      }
    }

    return results;
  }

  /**
   * Validate performance against thresholds
   */
  validatePerformance(thresholds: PerformanceThresholds): {
    passed: boolean;
    violations: string[];
    results: Map<string, ProfilingResults>;
  } {
    const results = this.getAllResults();
    const violations: string[] = [];

    for (const [componentId, result] of results) {
      if (result.averageRenderTime > thresholds.maxRenderTime) {
        violations.push(`${componentId}: Average render time ${result.averageRenderTime.toFixed(2)}ms exceeds threshold ${thresholds.maxRenderTime}ms`);
      }

      if (result.mountTime > thresholds.maxMountTime) {
        violations.push(`${componentId}: Mount time ${result.mountTime.toFixed(2)}ms exceeds threshold ${thresholds.maxMountTime}ms`);
      }

      if (result.renderCount > thresholds.maxTotalRenders) {
        violations.push(`${componentId}: Total renders ${result.renderCount} exceeds threshold ${thresholds.maxTotalRenders}`);
      }

      const memoryIncrease = result.memoryUsage.final - result.memoryUsage.initial;
      if (memoryIncrease > thresholds.maxMemoryIncrease) {
        violations.push(`${componentId}: Memory increase ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB exceeds threshold ${(thresholds.maxMemoryIncrease / 1024 / 1024).toFixed(2)}MB`);
      }
    }

    return {
      passed: violations.length === 0,
      violations,
      results,
    };
  }

  /**
   * Generate performance report for CI/CD
   */
  generateCIReport(): string {
    const results = this.getAllResults();
    const timestamp = new Date().toISOString();

    let report = `# Performance Profiling Report\n`;
    report += `Generated: ${timestamp}\n\n`;

    if (results.size === 0) {
      report += 'No profiling data collected.\n';
      return report;
    }

    report += `## Summary\n`;
    report += `- Total Components Profiled: ${results.size}\n`;
    report += `- Total Render Count: ${Array.from(results.values()).reduce((sum, r) => sum + r.renderCount, 0)}\n`;
    report += `- Total Render Time: ${Array.from(results.values()).reduce((sum, r) => sum + r.totalTime, 0).toFixed(2)}ms\n\n`;

    report += `## Component Performance\n\n`;

    for (const [componentId, result] of results) {
      report += `### ${componentId}\n\n`;
      report += `| Metric | Value |\n`;
      report += `|--------|-------|\n`;
      report += `| Total Renders | ${result.renderCount} |\n`;
      report += `| Average Render Time | ${result.averageRenderTime.toFixed(2)}ms |\n`;
      report += `| Slowest Render | ${result.slowestRender.toFixed(2)}ms |\n`;
      report += `| Fastest Render | ${result.fastestRender.toFixed(2)}ms |\n`;
      report += `| Mount Time | ${result.mountTime.toFixed(2)}ms |\n`;
      report += `| Memory Usage | ${((result.memoryUsage.final - result.memoryUsage.initial) / 1024 / 1024).toFixed(2)}MB |\n\n`;

      // Performance status
      const avgRenderGood = result.averageRenderTime < 16.67;
      const mountGood = result.mountTime < 100;
      const status = avgRenderGood && mountGood ? '✅ Good' : '⚠️ Needs Attention';

      report += `**Status**: ${status}\n\n`;
    }

    return report;
  }

  /**
   * Export profiling data as JSON for further analysis
   */
  exportData(): string {
    const results = this.getAllResults();
    const exportData = {
      timestamp: new Date().toISOString(),
      environment: {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        hardwareConcurrency: navigator.hardwareConcurrency,
      },
      results: Object.fromEntries(results),
      rawData: Object.fromEntries(this.profilerData),
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Clear all profiling data
   */
  clear(): void {
    this.profilerData.clear();
    this.memoryBaseline = this.getCurrentMemoryUsage();
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
      this.performanceObserver = null;
    }
    this.clear();
  }

  /**
   * Start performance monitoring session
   */
  startSession(sessionId: string): void {
    this.clear();
    console.log(`Starting performance profiling session: ${sessionId}`);

    // Mark session start for performance timeline
    if (performance.mark) {
      performance.mark(`profiling-session-start-${sessionId}`);
    }
  }

  /**
   * End performance monitoring session
   */
  endSession(sessionId: string): ProfilingResults[] {
    if (performance.mark && performance.measure) {
      performance.mark(`profiling-session-end-${sessionId}`);
      performance.measure(
        `profiling-session-${sessionId}`,
        `profiling-session-start-${sessionId}`,
        `profiling-session-end-${sessionId}`
      );
    }

    const results = Array.from(this.getAllResults().values());
    console.log(`Ending performance profiling session: ${sessionId}`, {
      componentsProfiled: results.length,
      totalRenders: results.reduce((sum, r) => sum + r.renderCount, 0),
    });

    return results;
  }

  private getCurrentMemoryUsage(): number {
    if ((performance as any).memory) {
      return (performance as any).memory.usedJSHeapSize;
    }
    // Fallback for environments without memory API
    return 0;
  }

  private getPeakMemoryUsage(): number {
    if ((performance as any).memory) {
      return Math.max(
        (performance as any).memory.usedJSHeapSize,
        this.memoryBaseline
      );
    }
    return 0;
  }
}

// Global profiler instance
export const globalProfiler = new ProfilerManager();

/**
 * React Profiler wrapper component for easy integration
 */
export function PerformanceProfiler({
  id,
  children,
  onRender
}: {
  id: string;
  children: React.ReactNode;
  onRender?: (id: string, phase: 'mount' | 'update', actualDuration: number, baseDuration: number, startTime: number, commitTime: number, interactions: Set<any>) => void;
}) {
  const handleRender = onRender || globalProfiler.onRender;

  // For environments where React.Profiler is not available
  if (!React.Profiler) {
    console.warn('React.Profiler not available');
    return <>{children}</>;
  }

  return (
    <React.Profiler id={id} onRender={handleRender}>
      {children}
    </React.Profiler>
  );
}

/**
 * HOC for automatic profiling
 */
export function withPerformanceProfiler<T extends {}>(
  Component: React.ComponentType<T>,
  profileId?: string
) {
  const WrappedComponent = (props: T) => {
    const id = profileId || Component.displayName || Component.name || 'UnknownComponent';

    return (
      <PerformanceProfiler id={id}>
        <Component {...props} />
      </PerformanceProfiler>
    );
  };

  WrappedComponent.displayName = `withPerformanceProfiler(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

/**
 * Hook for component-level performance tracking
 */
export function usePerformanceTracking(componentName: string) {
  const [renderCount, setRenderCount] = React.useState(0);
  const renderStartTime = React.useRef<number>(0);

  React.useLayoutEffect(() => {
    renderStartTime.current = performance.now();
  });

  React.useLayoutEffect(() => {
    const renderTime = performance.now() - renderStartTime.current;
    setRenderCount(prev => prev + 1);

    // Log slow renders
    if (renderTime > 16.67) {
      console.warn(`Slow render in ${componentName}: ${renderTime.toFixed(2)}ms`);
    }
  });

  return { renderCount, renderTime: performance.now() - renderStartTime.current };
}

/**
 * Utility for measuring function execution time
 */
export function measurePerformance<T>(
  fn: () => T,
  label: string
): { result: T; duration: number } {
  const start = performance.now();
  const result = fn();
  const duration = performance.now() - start;

  if (duration > 10) {
    console.warn(`Slow operation ${label}: ${duration.toFixed(2)}ms`);
  }

  return { result, duration };
}