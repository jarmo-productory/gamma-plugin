import { Presentation, TimetableItem } from '../types'

export const exportToCSV = (presentation: Presentation) => {
  const { title, timetableData } = presentation
  
  // CSV Header
  const headers = ['#', 'Title', 'Start Time', 'Duration (min)', 'End Time', 'Content']
  
  // CSV Rows
  const rows = timetableData.items.map((item: TimetableItem, index: number) => [
    (index + 1).toString(),
    `"${item.title.replace(/"/g, '""')}"`, // Escape quotes in CSV
    item.startTime,
    item.duration.toString(),
    item.endTime,
    `"${item.content.join('; ').replace(/"/g, '""')}"` // Join content and escape quotes
  ])
  
  // Combine headers and rows
  const csvContent = [headers, ...rows]
    .map(row => row.join(','))
    .join('\n')
  
  // Create and trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', `${sanitizeFilename(title)}_timetable.csv`)
  link.style.visibility = 'hidden'
  
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  URL.revokeObjectURL(url)
}

export const exportToXLSX = (presentation: Presentation) => {
  // For now, just export as CSV since we'd need to add xlsx library
  // This is a placeholder for future XLSX implementation
  exportToCSV(presentation)
}

const sanitizeFilename = (filename: string): string => {
  return filename
    .replace(/[^a-z0-9]/gi, '_') // Replace non-alphanumeric with underscore
    .replace(/_+/g, '_') // Replace multiple underscores with single
    .replace(/^_|_$/g, '') // Remove leading/trailing underscores
    .toLowerCase()
}