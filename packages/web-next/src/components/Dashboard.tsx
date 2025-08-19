'use client';

import { Card } from './Card';

export function Dashboard() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">
        Your Presentations
      </h1>
      
      <p className="text-base text-gray-600 mb-8">
        Manage your Gamma presentations and timetables
      </p>
      
      {/* Empty state */}
      <Card className="text-center py-16 px-8">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
          📊
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No presentations yet
        </h3>
        <p className="text-sm text-gray-600 max-w-md mx-auto">
          Install the Chrome extension and visit a Gamma presentation to get started
        </p>
      </Card>
    </div>
  );
}