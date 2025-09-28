'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useCacheMonitor } from '@/utils/cache-monitor'
import { Activity, TrendingUp, Zap, Server } from 'lucide-react'

/**
 * Cache Monitor Panel - Development tool for monitoring SWR cache performance
 *
 * This component provides real-time insights into cache hit rates and navigation performance.
 * Should only be used in development or admin interfaces.
 */

interface CacheMonitorPanelProps {
  className?: string
  showInProduction?: boolean
}

export default function CacheMonitorPanel({
  className = '',
  showInProduction = false
}: CacheMonitorPanelProps) {
  // Don't show in production unless explicitly enabled
  if (process.env.NODE_ENV === 'production' && !showInProduction) {
    return null
  }

  const { getStats, generateReport, runPerformanceTest } = useCacheMonitor()
  const [stats, setStats] = useState(getStats())
  const [isRunningTest, setIsRunningTest] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(Date.now())

  // Update stats every 2 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setStats(getStats())
      setLastUpdate(Date.now())
    }, 2000)

    return () => clearInterval(interval)
  }, [getStats])

  const handleRunTest = async () => {
    setIsRunningTest(true)
    try {
      await runPerformanceTest()
      setStats(getStats())
    } finally {
      setIsRunningTest(false)
    }
  }

  const handleShowReport = () => {
    const report = generateReport()
    console.log(report)
    alert('Cache report logged to console. Check browser dev tools.')
  }

  const getHitRateColor = (hitRate: number) => {
    if (hitRate >= 70) return 'text-green-600'
    if (hitRate >= 50) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getNavigationTimeColor = (time: number) => {
    if (time <= 100) return 'text-green-600'
    if (time <= 200) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
      <Card className="w-80 bg-white/95 backdrop-blur-sm border shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="h-4 w-4" />
            SWR Cache Monitor
            <Badge variant={stats.passesTargets ? 'default' : 'destructive'} className="ml-auto">
              {stats.passesTargets ? 'PASS' : 'FAIL'}
            </Badge>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Hit Rate */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Hit Rate</span>
            </div>
            <div className={`font-mono text-sm ${getHitRateColor(stats.hitRate)}`}>
              {stats.hitRate.toFixed(1)}%
            </div>
          </div>

          {/* Cache Navigation Time */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Cache Nav</span>
            </div>
            <div className={`font-mono text-sm ${getNavigationTimeColor(stats.cacheNavigationTime)}`}>
              {stats.cacheNavigationTime.toFixed(0)}ms
            </div>
          </div>

          {/* Server Navigation Time */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Server className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Server Nav</span>
            </div>
            <div className="font-mono text-sm text-muted-foreground">
              {stats.serverNavigationTime.toFixed(0)}ms
            </div>
          </div>

          {/* Total Requests */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total Requests</span>
            <span className="font-mono text-sm">{stats.totalRequests}</span>
          </div>

          {/* Performance Improvement */}
          {stats.serverNavigationTime > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Improvement</span>
              <span className="font-mono text-sm text-green-600">
                {((stats.serverNavigationTime - stats.cacheNavigationTime) / stats.serverNavigationTime * 100).toFixed(0)}%
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRunTest}
              disabled={isRunningTest}
              className="flex-1"
            >
              {isRunningTest ? 'Testing...' : 'Run Test'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleShowReport}
              className="flex-1"
            >
              Report
            </Button>
          </div>

          {/* Targets */}
          <div className="text-xs text-muted-foreground pt-2 border-t">
            <div>Targets: ≥70% hit rate, &lt;100ms cache nav</div>
            <div>Updated: {new Date(lastUpdate).toLocaleTimeString()}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * Hook to conditionally show cache monitor in development
 */
export function useCacheMonitorPanel(enabled: boolean = true) {
  const isDev = process.env.NODE_ENV === 'development'
  const shouldShow = isDev && enabled

  return { shouldShow, CacheMonitorPanel }
}