/**
 * Performance regression detection and alerting system
 * Compares current performance against historical baselines
 */

import { BenchmarkResult, PerformanceComparison } from './memory-storage';

export interface RegressionThresholds {
  renderCountIncrease: number; // % increase that triggers alert
  timeRegression: number; // % time increase that triggers alert
  memoryRegression: number; // % memory increase that triggers alert
  fpsDecrease: number; // % FPS decrease that triggers alert
}

export interface RegressionAlert {
  severity: 'warning' | 'critical';
  testName: string;
  metric: string;
  currentValue: number;
  baselineValue: number;
  regressionPercent: number;
  threshold: number;
  timestamp: number;
  recommendation: string;
}

export interface RegressionReport {
  summary: {
    totalTests: number;
    passedTests: number;
    warningTests: number;
    criticalTests: number;
  };
  alerts: RegressionAlert[];
  overallStatus: 'pass' | 'warning' | 'critical';
  generateTimestamp: number;
}

class RegressionDetector {
  private baselines: Map<string, BenchmarkResult> = new Map();
  private historicalData: Map<string, BenchmarkResult[]> = new Map();
  private alerts: RegressionAlert[] = [];

  private defaultThresholds: RegressionThresholds = {
    renderCountIncrease: 15, // 15% increase in renders is concerning
    timeRegression: 20, // 20% slower is concerning
    memoryRegression: 25, // 25% more memory is concerning
    fpsDecrease: 10, // 10% FPS decrease is concerning
  };

  /**
   * Set baseline performance data
   */
  setBaseline(testName: string, result: BenchmarkResult): void {
    const key = this.generateKey(testName, result.configuration);
    this.baselines.set(key, result);

    console.log(`Baseline set for ${testName}:`, {
      renderCount: result.metrics.renderCount,
      avgTime: result.metrics.averageRenderTime.toFixed(2) + 'ms',
      memory: (result.metrics.memoryUsage / 1024 / 1024).toFixed(2) + 'MB'
    });
  }

  /**
   * Add historical data point
   */
  addHistoricalData(testName: string, result: BenchmarkResult): void {
    const key = this.generateKey(testName, result.configuration);
    const existing = this.historicalData.get(key) || [];
    existing.push(result);

    // Keep only last 50 data points to prevent memory bloat
    if (existing.length > 50) {
      existing.splice(0, existing.length - 50);
    }

    this.historicalData.set(key, existing);
  }

  /**
   * Check for performance regressions
   */
  checkForRegressions(
    testName: string,
    currentResult: BenchmarkResult,
    thresholds: Partial<RegressionThresholds> = {}
  ): RegressionAlert[] {
    const key = this.generateKey(testName, currentResult.configuration);
    const baseline = this.baselines.get(key);

    if (!baseline) {
      console.warn(`No baseline found for ${testName}, setting current result as baseline`);
      this.setBaseline(testName, currentResult);
      return [];
    }

    const effectiveThresholds = { ...this.defaultThresholds, ...thresholds };
    const alerts: RegressionAlert[] = [];

    // Check render count regression
    const renderCountChange = ((currentResult.metrics.renderCount - baseline.metrics.renderCount) / baseline.metrics.renderCount) * 100;
    if (renderCountChange > effectiveThresholds.renderCountIncrease) {
      alerts.push(this.createAlert({
        testName,
        metric: 'Render Count',
        currentValue: currentResult.metrics.renderCount,
        baselineValue: baseline.metrics.renderCount,
        regressionPercent: renderCountChange,
        threshold: effectiveThresholds.renderCountIncrease,
        recommendation: 'Check for unnecessary re-renders. Consider using React.memo, useMemo, or useCallback optimizations.'
      }));
    }

    // Check render time regression
    const timeChange = ((currentResult.metrics.averageRenderTime - baseline.metrics.averageRenderTime) / baseline.metrics.averageRenderTime) * 100;
    if (timeChange > effectiveThresholds.timeRegression) {
      alerts.push(this.createAlert({
        testName,
        metric: 'Average Render Time',
        currentValue: currentResult.metrics.averageRenderTime,
        baselineValue: baseline.metrics.averageRenderTime,
        regressionPercent: timeChange,
        threshold: effectiveThresholds.timeRegression,
        recommendation: 'Rendering is slower than baseline. Check for expensive computations in render cycle. Consider memoization or moving calculations outside render.'
      }));
    }

    // Check memory regression
    const memoryChange = ((currentResult.metrics.memoryUsage - baseline.metrics.memoryUsage) / baseline.metrics.memoryUsage) * 100;
    if (memoryChange > effectiveThresholds.memoryRegression) {
      alerts.push(this.createAlert({
        testName,
        metric: 'Memory Usage',
        currentValue: currentResult.metrics.memoryUsage,
        baselineValue: baseline.metrics.memoryUsage,
        regressionPercent: memoryChange,
        threshold: effectiveThresholds.memoryRegression,
        recommendation: 'Memory usage has increased significantly. Check for memory leaks, large object allocations, or retained references.'
      }));
    }

    // Check FPS regression (if available)
    if (currentResult.metrics.fps && baseline.metrics.fps) {
      const fpsChange = ((baseline.metrics.fps - currentResult.metrics.fps) / baseline.metrics.fps) * 100;
      if (fpsChange > effectiveThresholds.fpsDecrease) {
        alerts.push(this.createAlert({
          testName,
          metric: 'FPS',
          currentValue: currentResult.metrics.fps,
          baselineValue: baseline.metrics.fps,
          regressionPercent: fpsChange,
          threshold: effectiveThresholds.fpsDecrease,
          recommendation: 'Frame rate has decreased. Check for blocking operations, long tasks, or expensive layout calculations.'
        }));
      }
    }

    this.alerts.push(...alerts);
    return alerts;
  }

  /**
   * Analyze trends in historical data
   */
  analyzeTrends(testName: string, configuration: Partial<BenchmarkResult['configuration']>): {
    trend: 'improving' | 'stable' | 'degrading';
    confidence: number;
    metrics: {
      renderTime: { trend: number; confidence: number };
      renderCount: { trend: number; confidence: number };
      memory: { trend: number; confidence: number };
    };
  } {
    const key = this.generateKey(testName, configuration);
    const historical = this.historicalData.get(key) || [];

    if (historical.length < 5) {
      return {
        trend: 'stable',
        confidence: 0,
        metrics: {
          renderTime: { trend: 0, confidence: 0 },
          renderCount: { trend: 0, confidence: 0 },
          memory: { trend: 0, confidence: 0 },
        }
      };
    }

    // Calculate linear trends for each metric
    const renderTimeTrend = this.calculateTrend(historical.map(h => h.metrics.averageRenderTime));
    const renderCountTrend = this.calculateTrend(historical.map(h => h.metrics.renderCount));
    const memoryTrend = this.calculateTrend(historical.map(h => h.metrics.memoryUsage));

    // Determine overall trend
    const trends = [renderTimeTrend.trend, renderCountTrend.trend, memoryTrend.trend];
    const avgTrend = trends.reduce((sum, trend) => sum + trend, 0) / trends.length;
    const confidence = Math.min(...trends.map(t => Math.abs(t))) * 100;

    let overallTrend: 'improving' | 'stable' | 'degrading';
    if (avgTrend < -0.05) {
      overallTrend = 'improving';
    } else if (avgTrend > 0.05) {
      overallTrend = 'degrading';
    } else {
      overallTrend = 'stable';
    }

    return {
      trend: overallTrend,
      confidence,
      metrics: {
        renderTime: renderTimeTrend,
        renderCount: renderCountTrend,
        memory: memoryTrend,
      }
    };
  }

  /**
   * Generate comprehensive regression report
   */
  generateRegressionReport(): RegressionReport {
    const warningAlerts = this.alerts.filter(alert => alert.severity === 'warning');
    const criticalAlerts = this.alerts.filter(alert => alert.severity === 'critical');

    const uniqueTests = new Set(this.alerts.map(alert => alert.testName));
    const totalTests = Math.max(uniqueTests.size, this.baselines.size);

    let overallStatus: 'pass' | 'warning' | 'critical' = 'pass';
    if (criticalAlerts.length > 0) {
      overallStatus = 'critical';
    } else if (warningAlerts.length > 0) {
      overallStatus = 'warning';
    }

    return {
      summary: {
        totalTests,
        passedTests: totalTests - uniqueTests.size,
        warningTests: warningAlerts.length,
        criticalTests: criticalAlerts.length,
      },
      alerts: [...this.alerts],
      overallStatus,
      generateTimestamp: Date.now(),
    };
  }

  /**
   * Generate actionable performance report
   */
  generateActionableReport(): string {
    const report = this.generateRegressionReport();
    let output = `# Performance Regression Report\n\n`;
    output += `**Generated**: ${new Date(report.generateTimestamp).toISOString()}\n`;
    output += `**Overall Status**: ${report.overallStatus.toUpperCase()}\n\n`;

    output += `## Summary\n`;
    output += `- Total Tests: ${report.summary.totalTests}\n`;
    output += `- Passed: ${report.summary.passedTests}\n`;
    output += `- Warnings: ${report.summary.warningTests}\n`;
    output += `- Critical: ${report.summary.criticalTests}\n\n`;

    if (report.alerts.length === 0) {
      output += `## ✅ No Performance Regressions Detected\n\n`;
      output += `All performance metrics are within acceptable thresholds.\n\n`;
      return output;
    }

    // Group alerts by test
    const alertsByTest = new Map<string, RegressionAlert[]>();
    report.alerts.forEach(alert => {
      const existing = alertsByTest.get(alert.testName) || [];
      existing.push(alert);
      alertsByTest.set(alert.testName, existing);
    });

    output += `## 🚨 Performance Regressions\n\n`;

    for (const [testName, alerts] of alertsByTest) {
      output += `### ${testName}\n\n`;

      alerts.forEach(alert => {
        const icon = alert.severity === 'critical' ? '🔴' : '⚠️';
        const change = alert.regressionPercent > 0 ? '+' : '';

        output += `${icon} **${alert.metric}** - ${alert.severity.toUpperCase()}\n`;
        output += `- Current: ${this.formatMetricValue(alert.metric, alert.currentValue)}\n`;
        output += `- Baseline: ${this.formatMetricValue(alert.metric, alert.baselineValue)}\n`;
        output += `- Change: ${change}${alert.regressionPercent.toFixed(1)}% (threshold: ${alert.threshold}%)\n`;
        output += `- **Action**: ${alert.recommendation}\n\n`;
      });
    }

    // Add priority recommendations
    output += `## 🎯 Priority Actions\n\n`;

    const criticalIssues = report.alerts.filter(a => a.severity === 'critical');
    if (criticalIssues.length > 0) {
      output += `### Critical Issues (Fix Immediately)\n`;
      criticalIssues.forEach(alert => {
        output += `1. **${alert.testName} - ${alert.metric}**: ${alert.recommendation}\n`;
      });
      output += `\n`;
    }

    const warningIssues = report.alerts.filter(a => a.severity === 'warning');
    if (warningIssues.length > 0) {
      output += `### Warnings (Fix Next)\n`;
      warningIssues.forEach(alert => {
        output += `1. **${alert.testName} - ${alert.metric}**: ${alert.recommendation}\n`;
      });
      output += `\n`;
    }

    return output;
  }

  /**
   * Clear all alerts and reset detector
   */
  clear(): void {
    this.alerts = [];
  }

  /**
   * Export all regression data
   */
  exportData(): string {
    return JSON.stringify({
      baselines: Object.fromEntries(this.baselines),
      historicalData: Object.fromEntries(this.historicalData),
      alerts: this.alerts,
      thresholds: this.defaultThresholds,
      exportedAt: new Date().toISOString(),
    }, null, 2);
  }

  private createAlert({
    testName,
    metric,
    currentValue,
    baselineValue,
    regressionPercent,
    threshold,
    recommendation
  }: {
    testName: string;
    metric: string;
    currentValue: number;
    baselineValue: number;
    regressionPercent: number;
    threshold: number;
    recommendation: string;
  }): RegressionAlert {
    const severity: 'warning' | 'critical' = regressionPercent > threshold * 2 ? 'critical' : 'warning';

    return {
      severity,
      testName,
      metric,
      currentValue,
      baselineValue,
      regressionPercent,
      threshold,
      timestamp: Date.now(),
      recommendation,
    };
  }

  private generateKey(testName: string, configuration: Partial<BenchmarkResult['configuration']>): string {
    return `${testName}_${configuration.optimizationLevel || 'unknown'}_${configuration.dataSize || 0}`;
  }

  private calculateTrend(values: number[]): { trend: number; confidence: number } {
    if (values.length < 2) {
      return { trend: 0, confidence: 0 };
    }

    // Simple linear regression
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * values[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

    // Calculate R-squared for confidence
    const meanY = sumY / n;
    const ssRes = values.reduce((sum, yi, i) => {
      const predicted = slope * x[i] + (sumY - slope * sumX) / n;
      return sum + Math.pow(yi - predicted, 2);
    }, 0);
    const ssTot = values.reduce((sum, yi) => sum + Math.pow(yi - meanY, 2), 0);
    const rSquared = 1 - (ssRes / ssTot);

    return {
      trend: slope,
      confidence: Math.max(0, Math.min(1, rSquared))
    };
  }

  private formatMetricValue(metric: string, value: number): string {
    switch (metric) {
      case 'Average Render Time':
        return `${value.toFixed(2)}ms`;
      case 'Memory Usage':
        return `${(value / 1024 / 1024).toFixed(2)}MB`;
      case 'FPS':
        return `${value.toFixed(1)} fps`;
      case 'Render Count':
        return value.toString();
      default:
        return value.toString();
    }
  }
}

export const globalRegressionDetector = new RegressionDetector();