/**
 * Usage examples for the new React components
 * These demonstrate how to migrate from vanilla JS h() patterns to React
 */

import * as React from "react"
import { TimetableItem, SyncControls, ExportControls } from "./gamma-components"
import { Button } from "./button"
import { Card, CardHeader, CardTitle, CardContent } from "./card"

// Example: React version of the extension sidebar
export function ReactSidebar() {
  const [timetableItems, setTimetableItems] = React.useState([
    { id: '1', title: 'Introduction to React', duration: 5, startTime: '09:00', endTime: '09:05' },
    { id: '2', title: 'Setting up Components', duration: 10, startTime: '09:05', endTime: '09:15' },
  ])
  
  const [isAuthenticated, setIsAuthenticated] = React.useState(false)
  const [isSyncing, setIsSyncing] = React.useState(false)
  const [autoSync, setAutoSync] = React.useState(true)

  const handleDurationChange = (id: string, newDuration: number) => {
    setTimetableItems(items => 
      items.map(item => 
        item.id === id ? { ...item, duration: newDuration } : item
      )
    )
  }

  const handleSaveToCloud = async () => {
    setIsSyncing(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    setIsSyncing(false)
  }

  return (
    <div className="extension-sidebar">
      <div className="extension-header">
        <h1 className="text-xl font-bold text-gray-900">Gamma Timetable</h1>
        {!isAuthenticated && (
          <Button 
            variant="default" 
            size="sm" 
            onClick={() => setIsAuthenticated(true)}
          >
            Sign In
          </Button>
        )}
      </div>

      <div className="flex-1 p-4 space-y-4">
        {timetableItems.map(item => (
          <TimetableItem
            key={item.id}
            title={item.title}
            duration={item.duration}
            startTime={item.startTime}
            endTime={item.endTime}
            onDurationChange={(duration) => handleDurationChange(item.id, duration)}
          />
        ))}

        <SyncControls
          isAuthenticated={isAuthenticated}
          isSyncing={isSyncing}
          autoSync={autoSync}
          onSaveToCloud={handleSaveToCloud}
          onLoadFromCloud={() => console.log('Load from cloud')}
          onToggleAutoSync={() => setAutoSync(!autoSync)}
        />

        <ExportControls
          onExportCsv={() => console.log('Export CSV')}
          onExportExcel={() => console.log('Export Excel')}
          onExportPdf={() => console.log('Export PDF')}
        />
      </div>
    </div>
  )
}

// Example: Dashboard presentation card component
export function PresentationCard({ title, url, lastModified }: {
  title: string
  url: string
  lastModified: string
}) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-500 mb-2">{url}</p>
        <p className="text-xs text-gray-400">Last modified: {lastModified}</p>
        <div className="flex gap-2 mt-4">
          <Button variant="outline" size="sm">
            View Timetable
          </Button>
          <Button variant="secondary" size="sm">
            Edit
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}