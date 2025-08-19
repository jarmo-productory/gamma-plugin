'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Dashboard Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Your Presentations
        </h1>
        <p className="text-base text-gray-600">
          Manage your Gamma presentations and timetables
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Presentations</CardTitle>
            <div className="w-4 h-4 text-muted-foreground">📊</div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">None created yet</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Timetables</CardTitle>
            <div className="w-4 h-4 text-muted-foreground">⏰</div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Ready to generate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cloud Status</CardTitle>
            <div className="w-4 h-4 text-muted-foreground">🔄</div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Ready</Badge>
            </div>
            <p className="text-xs text-muted-foreground">Sync available</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle>Get Started</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-12">
          <div className="w-16 h-16 bg-productory-surface-tinted rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
            📊
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No presentations yet
          </h3>
          <p className="text-sm text-gray-600 max-w-md mx-auto mb-6">
            Install the Chrome extension and visit a Gamma presentation to automatically generate timetables
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button variant="primary">
              Install Extension
            </Button>
            <Button variant="outline">
              Learn More
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}