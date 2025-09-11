'use client'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  Save, 
  Download, 
  FileText, 
  FileSpreadsheet, 
  Loader2, 
  Check,
  ChevronDown 
} from 'lucide-react'
import { toast } from 'sonner'
import { Presentation } from '../../types'
import { exportToEnhancedCSV, exportToXLSX } from '../utils/exportEnhanced'

interface TimetableActionsProps {
  presentation: Presentation
  saving: boolean
  hasUnsavedChanges: boolean
  onSave: () => void
}

export default function TimetableActions({ 
  presentation, 
  saving, 
  hasUnsavedChanges,
  onSave 
}: TimetableActionsProps) {

  const handleExportCSV = async () => {
    try {
      await exportToEnhancedCSV(presentation)
      toast.success(`CSV exported: ${presentation.title}`)
    } catch (error) {
      console.error('CSV export error:', error)
      toast.error('Failed to export CSV')
    }
  }

  const handleExportXLSX = async () => {
    try {
      await exportToXLSX(presentation)
      toast.success(`Excel file exported: ${presentation.title}`)
    } catch (error) {
      console.error('XLSX export error:', error)
      toast.error('Failed to export Excel file')
    }
  }

  return (
    <div className="flex items-center justify-between p-4 border border-border/60 rounded-lg bg-card">
      {/* Left side - Save status */}
      <div className="flex items-center gap-3">
        <Button 
          onClick={onSave}
          disabled={saving || !hasUnsavedChanges}
          variant={hasUnsavedChanges ? "default" : "outline"}
          size="sm"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : hasUnsavedChanges ? (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          ) : (
            <>
              <Check className="h-4 w-4 mr-2" />
              Saved
            </>
          )}
        </Button>

        {/* Auto-save status indicator */}
        <div className="text-xs text-muted-foreground">
          {saving ? (
            <span className="flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Auto-saving...
            </span>
          ) : hasUnsavedChanges ? (
            <span className="text-yellow-600">
              Unsaved changes
            </span>
          ) : (
            <span className="flex items-center gap-1 text-green-600">
              <Check className="h-3 w-3" />
              All changes saved
            </span>
          )}
        </div>
      </div>

      {/* Right side - Export actions */}
      <div className="flex items-center gap-2">
        {/* Quick Actions */}
        <div className="hidden sm:flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
          >
            <FileText className="h-4 w-4 mr-2" />
            CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportXLSX}
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Excel
          </Button>
        </div>

        {/* Export Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Export</span>
              <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={handleExportCSV}>
              <FileText className="h-4 w-4 mr-3" />
              <div className="flex flex-col">
                <span className="font-medium">CSV Format</span>
                <span className="text-xs text-muted-foreground">
                  Compatible with Excel, Google Sheets
                </span>
              </div>
            </DropdownMenuItem>
            
            <DropdownMenuItem onClick={handleExportXLSX}>
              <FileSpreadsheet className="h-4 w-4 mr-3" />
              <div className="flex flex-col">
                <span className="font-medium">Excel Format</span>
                <span className="text-xs text-muted-foreground">
                  Professional formatting, charts
                </span>
              </div>
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem disabled>
              <div className="flex flex-col">
                <span className="text-muted-foreground">More formats</span>
                <span className="text-xs text-muted-foreground">
                  Coming soon...
                </span>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}