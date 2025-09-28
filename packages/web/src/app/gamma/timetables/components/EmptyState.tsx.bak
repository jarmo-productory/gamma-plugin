'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, Chrome, ArrowRight, Presentation } from 'lucide-react'

export default function EmptyState() {
  const handleInstallExtension = () => {
    window.open('https://chrome.google.com/webstore/detail/productory-powerups-for-gamma', '_blank')
  }

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Card className="max-w-2xl mx-auto">
        <CardContent className="p-12 text-center">
          {/* Icon Stack */}
          <div className="relative mb-6">
            <div className="flex items-center justify-center space-x-2">
              <div className="p-3 bg-purple-100 rounded-full">
                <Presentation className="h-8 w-8 text-purple-600" />
              </div>
              <ArrowRight className="h-6 w-6 text-gray-400" />
              <div className="p-3 bg-green-100 rounded-full">
                <Calendar className="h-8 w-8 text-green-600" />
              </div>
            </div>
          </div>

          {/* Heading */}
          <h2 className="text-2xl font-semibold text-gray-900 mb-3">
            No Timetables Yet
          </h2>
          
          {/* Description */}
          <p className="text-gray-600 mb-6 leading-relaxed">
            Transform your Gamma presentations into organized timetables with our Chrome extension.
            Visit any Gamma presentation and generate a timetable to get started.
          </p>

          {/* Steps */}
          <div className="bg-gray-50 rounded-lg p-6 mb-6 text-left">
            <h3 className="font-medium text-gray-900 mb-4 text-center">Getting Started</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center text-sm font-medium">
                  1
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Install the Chrome Extension</p>
                  <p className="text-xs text-gray-600 mt-1">Add Productory Powerups to your browser</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center text-sm font-medium">
                  2
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Visit a Gamma Presentation</p>
                  <p className="text-xs text-gray-600 mt-1">Navigate to any Gamma presentation URL</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center text-sm font-medium">
                  3
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Generate a Timetable</p>
                  <p className="text-xs text-gray-600 mt-1">Click the extension and create your timetable</p>
                </div>
              </div>
            </div>
          </div>

          {/* CTA Button */}
          <Button 
            onClick={handleInstallExtension}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 mx-auto"
          >
            <Chrome className="h-4 w-4" />
            Install Chrome Extension
          </Button>
          
          {/* Footer text */}
          <p className="text-xs text-gray-500 mt-4">
            Your timetables will appear here once you create them
          </p>
        </CardContent>
      </Card>
    </div>
  )
}