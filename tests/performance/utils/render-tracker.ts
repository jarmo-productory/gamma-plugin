/**
 * Render tracking utilities for React performance testing
 * Provides hooks and utilities to count re-renders and measure performance
 */

import { useRef, useEffect } from 'react';

export interface RenderMetrics {
  componentName: string;
  renderCount: number;
  lastRenderTime: number;
  totalRenderTime: number;
  averageRenderTime: number;
  propsChanges: number;
  stateChanges: number;
}

// Global render tracking storage
const renderTracking = new Map<string, RenderMetrics>();

/**
 * Hook to track component renders and performance
 */
export function useRenderTracker(componentName: string, props?: any, state?: any) {
  const renderCountRef = useRef(0);
  const lastPropsRef = useRef(props);
  const lastStateRef = useRef(state);
  const renderStartTime = useRef(performance.now());

  renderCountRef.current += 1;

  useEffect(() => {
    const renderEndTime = performance.now();
    const renderTime = renderEndTime - renderStartTime.current;

    const currentMetrics = renderTracking.get(componentName) || {
      componentName,
      renderCount: 0,
      lastRenderTime: 0,
      totalRenderTime: 0,
      averageRenderTime: 0,
      propsChanges: 0,
      stateChanges: 0,
    };

    const propsChanged = !shallowEqual(lastPropsRef.current, props);
    const stateChanged = !shallowEqual(lastStateRef.current, state);

    const updatedMetrics: RenderMetrics = {
      ...currentMetrics,
      renderCount: renderCountRef.current,
      lastRenderTime: renderTime,
      totalRenderTime: currentMetrics.totalRenderTime + renderTime,
      averageRenderTime: (currentMetrics.totalRenderTime + renderTime) / renderCountRef.current,
      propsChanges: currentMetrics.propsChanges + (propsChanged ? 1 : 0),
      stateChanges: currentMetrics.stateChanges + (stateChanged ? 1 : 0),
    };

    renderTracking.set(componentName, updatedMetrics);

    lastPropsRef.current = props;
    lastStateRef.current = state;
    renderStartTime.current = performance.now();
  });

  return renderCountRef.current;
}

/**
 * Get render metrics for a specific component
 */
export function getRenderMetrics(componentName: string): RenderMetrics | null {
  return renderTracking.get(componentName) || null;
}

/**
 * Get all render metrics
 */
export function getAllRenderMetrics(): Map<string, RenderMetrics> {
  return new Map(renderTracking);
}

/**
 * Clear render metrics for a component or all components
 */
export function clearRenderMetrics(componentName?: string): void {
  if (componentName) {
    renderTracking.delete(componentName);
  } else {
    renderTracking.clear();
  }
}

/**
 * Shallow equality check for props/state comparison
 */
function shallowEqual(obj1: any, obj2: any): boolean {
  if (obj1 === obj2) return true;
  if (!obj1 || !obj2) return false;

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) return false;

  for (const key of keys1) {
    if (obj1[key] !== obj2[key]) return false;
  }

  return true;
}

/**
 * Performance measurement utilities
 */
export class PerformanceMeasurer {
  private measurements: Map<string, number[]> = new Map();

  startMeasurement(key: string): void {
    performance.mark(`${key}-start`);
  }

  endMeasurement(key: string): number {
    performance.mark(`${key}-end`);
    performance.measure(key, `${key}-start`, `${key}-end`);

    const measure = performance.getEntriesByName(key).pop();
    const duration = measure?.duration || 0;

    const measurements = this.measurements.get(key) || [];
    measurements.push(duration);
    this.measurements.set(key, measurements);

    return duration;
  }

  getAverageTime(key: string): number {
    const measurements = this.measurements.get(key) || [];
    return measurements.length > 0
      ? measurements.reduce((sum, time) => sum + time, 0) / measurements.length
      : 0;
  }

  getMedianTime(key: string): number {
    const measurements = this.measurements.get(key) || [];
    if (measurements.length === 0) return 0;

    const sorted = [...measurements].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);

    return sorted.length % 2 === 0
      ? (sorted[middle - 1] + sorted[middle]) / 2
      : sorted[middle];
  }

  getP95Time(key: string): number {
    const measurements = this.measurements.get(key) || [];
    if (measurements.length === 0) return 0;

    const sorted = [...measurements].sort((a, b) => a - b);
    const index = Math.floor(sorted.length * 0.95);
    return sorted[index];
  }

  getAllMeasurements(): Map<string, number[]> {
    return new Map(this.measurements);
  }

  clear(): void {
    this.measurements.clear();
    performance.clearMarks();
    performance.clearMeasures();
  }
}

export const globalPerformanceMeasurer = new PerformanceMeasurer();