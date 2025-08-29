'use client'

import { useState, useEffect } from 'react'
import AppLayout from '@/components/layouts/AppLayout'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { Calendar } from 'lucide-react'
import TimetableGrid from './components/TimetableGrid'
import { Presentation } from './types'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { exportToCSV } from './utils/export'

interface TimetablesClientProps {
  user: {
    email?: string
    name?: string
  }
}

export default function TimetablesClient({ user }: TimetablesClientProps) {
  const [presentations, setPresentations] = useState<Presentation[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [presentationToDelete, setPresentationToDelete] = useState<string | null>(null)

  // Fetch presentations on component mount
  useEffect(() => {
    fetchPresentations()
  }, [])

  const fetchPresentations = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/presentations/list')
      const data = await response.json()

      if (data.success) {
        setPresentations(data.presentations)
      } else {
        console.error('Failed to fetch presentations:', data.error)
        toast.error('Failed to load timetables')
      }
    } catch (error) {
      console.error('Error fetching presentations:', error)
      toast.error('Failed to load timetables')
    } finally {
      setLoading(false)
    }
  }

  const handleView = (id: string) => {
    // For now, just show the presentation data in console
    // In future, this could navigate to a detailed view
    const presentation = presentations.find(p => p.id === id)
    console.log('View presentation:', presentation)
    toast.info('View functionality coming soon!')
  }

  const handleExport = async (id: string) => {
    try {
      const presentation = presentations.find(p => p.id === id)
      if (!presentation) return

      // Export as CSV
      exportToCSV(presentation)
      toast.success(`Timetable exported as CSV: ${presentation.title}`)
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Export failed')
    }
  }

  const handleDeleteClick = (id: string) => {
    setPresentationToDelete(id)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!presentationToDelete) return

    try {
      const response = await fetch(`/api/presentations/${presentationToDelete}`, {
        method: 'DELETE'
      })
      
      const data = await response.json()

      if (data.success) {
        setPresentations(prev => prev.filter(p => p.id !== presentationToDelete))
        toast.success('Timetable deleted successfully')
      } else {
        console.error('Delete failed:', data.error)
        toast.error('Failed to delete timetable')
      }
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('Failed to delete timetable')
    } finally {
      setDeleteDialogOpen(false)
      setPresentationToDelete(null)
    }
  }

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false)
    setPresentationToDelete(null)
  }

  return (
    <AppLayout user={user}>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <div className="flex items-center gap-2 flex-1">
          <Calendar className="h-5 w-5" />
          <h1 className="text-lg font-semibold">Timetables</h1>
        </div>
      </header>
      
      <div className="flex flex-1 flex-col gap-4 p-4">
        <TimetableGrid
          presentations={presentations}
          loading={loading}
          onView={handleView}
          onExport={handleExport}
          onDelete={handleDeleteClick}
        />
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Timetable</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this timetable? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDeleteCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  )
}