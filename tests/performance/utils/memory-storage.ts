/**
 * Memory storage system for performance test results
 * Stores and retrieves benchmark data for comparison and validation
 */

export interface BenchmarkResult {
  testName: string;
  timestamp: number;
  metrics: {
    renderCount: number;
    averageRenderTime: number;
    totalTime: number;
    memoryUsage: number;
    fps?: number;
    interactionDelay?: number;
  };
  configuration: {
    optimizationLevel: 'baseline' | 'memo' | 'callback' | 'full';
    dataSize: number;
    interactionRate: number;
  };
  environment: {
    userAgent: string;
    viewport: { width: number; height: number };
    cpuConcurrency: number;
  };
}

export interface PerformanceComparison {
  baseline: BenchmarkResult;
  optimized: BenchmarkResult;
  improvement: {
    renderCountReduction: number;
    timeImprovement: number;
    memoryReduction: number;
    fpsImprovement?: number;
  };
  status: 'improved' | 'degraded' | 'no-change';
}

class MemoryStorage {
  private results: Map<string, BenchmarkResult[]> = new Map();
  private comparisons: Map<string, PerformanceComparison> = new Map();

  /**
   * Store a benchmark result
   */
  storeBenchmarkResult(result: BenchmarkResult): void {
    const key = this.generateKey(result.testName, result.configuration);
    const existing = this.results.get(key) || [];
    existing.push(result);
    this.results.set(key, existing);

    console.log(`Stored benchmark result for ${result.testName}:`, {
      renderCount: result.metrics.renderCount,
      avgTime: result.metrics.averageRenderTime.toFixed(2) + 'ms',
      optimization: result.configuration.optimizationLevel
    });
  }

  /**
   * Get benchmark results for a specific test and configuration
   */
  getBenchmarkResults(testName: string, configuration: Partial<BenchmarkResult['configuration']>): BenchmarkResult[] {
    const key = this.generateKey(testName, configuration);
    return this.results.get(key) || [];
  }

  /**
   * Get the latest benchmark result
   */
  getLatestResult(testName: string, configuration: Partial<BenchmarkResult['configuration']>): BenchmarkResult | null {
    const results = this.getBenchmarkResults(testName, configuration);
    return results.length > 0 ? results[results.length - 1] : null;
  }

  /**
   * Compare baseline vs optimized performance
   */
  comparePerformance(
    baselineTest: string,
    optimizedTest: string,
    configuration: Partial<BenchmarkResult['configuration']>
  ): PerformanceComparison | null {
    const baseline = this.getLatestResult(baselineTest, configuration);
    const optimized = this.getLatestResult(optimizedTest, configuration);

    if (!baseline || !optimized) {
      return null;
    }

    const renderCountReduction = ((baseline.metrics.renderCount - optimized.metrics.renderCount) / baseline.metrics.renderCount) * 100;
    const timeImprovement = ((baseline.metrics.totalTime - optimized.metrics.totalTime) / baseline.metrics.totalTime) * 100;
    const memoryReduction = ((baseline.metrics.memoryUsage - optimized.metrics.memoryUsage) / baseline.metrics.memoryUsage) * 100;
    const fpsImprovement = baseline.metrics.fps && optimized.metrics.fps
      ? ((optimized.metrics.fps - baseline.metrics.fps) / baseline.metrics.fps) * 100
      : undefined;

    const comparison: PerformanceComparison = {
      baseline,
      optimized,
      improvement: {
        renderCountReduction,
        timeImprovement,
        memoryReduction,
        fpsImprovement,
      },
      status: this.determineStatus(renderCountReduction, timeImprovement, memoryReduction)
    };

    const comparisonKey = `${baselineTest}_vs_${optimizedTest}`;
    this.comparisons.set(comparisonKey, comparison);

    return comparison;
  }

  /**
   * Get all stored comparisons
   */
  getAllComparisons(): Map<string, PerformanceComparison> {
    return new Map(this.comparisons);
  }

  /**
   * Generate performance report
   */
  generateReport(): string {
    const comparisons = Array.from(this.comparisons.values());

    if (comparisons.length === 0) {
      return 'No performance comparisons available';
    }

    let report = '# Performance Benchmark Report\\n\\n';

    comparisons.forEach((comparison, index) => {
      const { baseline, optimized, improvement, status } = comparison;

      report += `## Test ${index + 1}: ${baseline.testName} vs ${optimized.testName}\\n\\n`;
      report += `**Status**: ${status.toUpperCase()}\\n\\n`;

      report += '### Metrics Comparison\\n\\n';
      report += `| Metric | Baseline | Optimized | Improvement |\\n`;
      report += `|--------|----------|-----------|-------------|\\n`;
      report += `| Render Count | ${baseline.metrics.renderCount} | ${optimized.metrics.renderCount} | ${improvement.renderCountReduction.toFixed(1)}% |\\n`;
      report += `| Avg Render Time | ${baseline.metrics.averageRenderTime.toFixed(2)}ms | ${optimized.metrics.averageRenderTime.toFixed(2)}ms | ${improvement.timeImprovement.toFixed(1)}% |\\n`;
      report += `| Total Time | ${baseline.metrics.totalTime.toFixed(2)}ms | ${optimized.metrics.totalTime.toFixed(2)}ms | ${improvement.timeImprovement.toFixed(1)}% |\\n`;
      report += `| Memory Usage | ${(baseline.metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB | ${(optimized.metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB | ${improvement.memoryReduction.toFixed(1)}% |\\n`;

      if (improvement.fpsImprovement !== undefined) {
        report += `| FPS | ${baseline.metrics.fps} | ${optimized.metrics.fps} | ${improvement.fpsImprovement.toFixed(1)}% |\\n`;
      }

      report += '\\n';
    });

    return report;
  }

  /**
   * Validate performance improvements meet thresholds
   */
  validatePerformanceThresholds(thresholds: {
    minRenderCountReduction?: number;
    minTimeImprovement?: number;
    minMemoryReduction?: number;
    minFpsImprovement?: number;
  }): boolean {
    const comparisons = Array.from(this.comparisons.values());

    return comparisons.every(comparison => {
      const { improvement } = comparison;

      if (thresholds.minRenderCountReduction && improvement.renderCountReduction < thresholds.minRenderCountReduction) {
        return false;
      }

      if (thresholds.minTimeImprovement && improvement.timeImprovement < thresholds.minTimeImprovement) {
        return false;
      }

      if (thresholds.minMemoryReduction && improvement.memoryReduction < thresholds.minMemoryReduction) {
        return false;
      }

      if (thresholds.minFpsImprovement && improvement.fpsImprovement && improvement.fpsImprovement < thresholds.minFpsImprovement) {
        return false;
      }

      return true;
    });
  }

  /**
   * Clear all stored data
   */
  clear(): void {
    this.results.clear();
    this.comparisons.clear();
  }

  /**
   * Export all data as JSON
   */
  exportData(): string {
    return JSON.stringify({
      results: Object.fromEntries(this.results),
      comparisons: Object.fromEntries(this.comparisons),
      exportedAt: new Date().toISOString()
    }, null, 2);
  }

  private generateKey(testName: string, configuration: Partial<BenchmarkResult['configuration']>): string {
    return `${testName}_${configuration.optimizationLevel || 'unknown'}_${configuration.dataSize || 0}`;
  }

  private determineStatus(renderReduction: number, timeImprovement: number, memoryReduction: number): 'improved' | 'degraded' | 'no-change' {
    const improvements = [renderReduction, timeImprovement, memoryReduction];
    const significantImprovements = improvements.filter(improvement => improvement > 5).length;
    const significantDegradations = improvements.filter(improvement => improvement < -5).length;

    if (significantImprovements > significantDegradations) {
      return 'improved';
    } else if (significantDegradations > significantImprovements) {
      return 'degraded';
    } else {
      return 'no-change';
    }
  }
}

export const performanceMemoryStorage = new MemoryStorage();