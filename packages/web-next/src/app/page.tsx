import * as Dialog from "@radix-ui/react-dialog"

export default function Phase3Page() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Simple Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900">
            🎯 Phase 3: Radix UI Import Test
          </h1>
          <p className="text-gray-600 mt-2">
            Testing @radix-ui/react-dialog import (dependency test)
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-8 py-8">
        {/* Status Card */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">
            🧪 Phase 3 Status
          </h2>
          <p className="text-blue-600 font-medium">
            Testing Radix UI Dialog import - checking for build breaks...
          </p>
        </div>

        {/* Build Information Card */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Build Information
          </h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Next.js:</span>
              <span className="ml-2 font-mono">15.4.6</span>
            </div>
            <div>
              <span className="text-gray-600">React:</span>
              <span className="ml-2 font-mono">19.1.0</span>
            </div>
            <div>
              <span className="text-gray-600">Node:</span>
              <span className="ml-2 font-mono">{process.version}</span>
            </div>
            <div>
              <span className="text-gray-600">Environment:</span>
              <span className="ml-2 font-mono">{process.env.NODE_ENV}</span>
            </div>
          </div>
        </div>

        {/* Progress Tracking */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Systematic Progress
          </h2>
          <div className="space-y-3">
            <div className="flex items-center">
              <div className="w-4 h-4 bg-green-500 rounded-full mr-3"></div>
              <span className="text-green-700">Phase 1: Basic CSS and fonts</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-green-500 rounded-full mr-3"></div>
              <span className="text-green-700">Phase 2: Simple UI components</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-blue-500 rounded-full mr-3"></div>
              <span className="text-blue-700 font-medium">Phase 3: Radix UI import (current)</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-gray-300 rounded-full mr-3"></div>
              <span className="text-gray-500">Phase 4: Clerk authentication</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-gray-300 rounded-full mr-3"></div>
              <span className="text-gray-500">Phase 5: API routes and middleware</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-gray-300 rounded-full mr-3"></div>
              <span className="text-gray-500">Phase 6: Complex application logic</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}