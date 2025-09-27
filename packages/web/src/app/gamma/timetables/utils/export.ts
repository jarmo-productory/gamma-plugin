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

export const exportToXLSX = async (presentation: Presentation) => {
  try {
    // Dynamic import reduces main bundle size by 1.3MB
    const XLSX = await import('xlsx')
    const { title, timetableData } = presentation

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new()

    // Prepare data for XLSX
    const worksheetData = [
      ['Slide #', 'Title', 'Start Time', 'Duration (min)', 'End Time', 'Content']
    ]

    // Add presentation data
    timetableData.items.forEach((item: TimetableItem, index: number) => {
      worksheetData.push([
        (index + 1).toString(),
        item.title,
        item.startTime,
        item.duration.toString(),
        item.endTime,
        item.content.join('; ')
      ])
    })

    // Create worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData)

    // Set column widths
    worksheet['!cols'] = [
      { wch: 8 },  // Slide #
      { wch: 40 }, // Title
      { wch: 12 }, // Start Time
      { wch: 12 }, // Duration
      { wch: 12 }, // End Time
      { wch: 50 }  // Content
    ]

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Timetable')

    // Generate and download file
    XLSX.writeFile(workbook, `${sanitizeFilename(title)}_timetable.xlsx`)

  } catch (error) {
    console.error('XLSX export failed, falling back to CSV:', error)
    // Fallback to CSV if XLSX fails
    exportToCSV(presentation)
  }
}

const sanitizeFilename = (filename: string): string => {
  return filename
    .replace(/[^a-z0-9]/gi, '_') // Replace non-alphanumeric with underscore
    .replace(/_+/g, '_') // Replace multiple underscores with single
    .replace(/^_|_$/g, '') // Remove leading/trailing underscores
    .toLowerCase()
}