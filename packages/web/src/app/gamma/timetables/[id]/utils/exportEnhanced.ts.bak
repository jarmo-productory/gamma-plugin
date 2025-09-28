import * as XLSX from 'xlsx'
import { Presentation } from '../../types'
import { formatTime, formatDuration } from './timeCalculations'

/**
 * Generate CSV content with professional formatting
 */
function generateCSVContent(presentation: Presentation): string {
  const { timetableData } = presentation
  
  // Header with metadata
  const metadata = [
    `# Timetable Export: ${presentation.title}`,
    `# Generated: ${new Date().toLocaleString()}`,
    `# Total Duration: ${formatDuration(presentation.totalDuration)}`,
    `# Total Slides: ${presentation.slideCount}`,
    `# Start Time: ${formatTime(presentation.startTime)}`,
    `# Source: ${presentation.presentationUrl || 'N/A'}`,
    '', // Empty line
  ]
  
  // CSV Headers
  const headers = [
    'Slide Number',
    'Start Time', 
    'Duration (Minutes)',
    'Duration (Formatted)',
    'End Time',
    'Slide Title'
  ]
  
  // Data rows
  const dataRows = timetableData.items.map((item, index) => [
    (index + 1).toString(),
    formatTime(item.startTime),
    item.duration.toString(),
    formatDuration(item.duration),
    formatTime(item.endTime),
    item.title
  ])
  
  // Convert to CSV format
  const csvContent = [
    ...metadata,
    headers.join(','),
    ...dataRows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n')
  
  return csvContent
}

/**
 * Export presentation to enhanced CSV format
 */
export async function exportToEnhancedCSV(presentation: Presentation): Promise<void> {
  const csvContent = generateCSVContent(presentation)
  
  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `${presentation.title} - Timetable.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
}

/**
 * Export presentation to Excel format with professional formatting
 */
export async function exportToXLSX(presentation: Presentation): Promise<void> {
  const { timetableData } = presentation
  
  // Create workbook
  const workbook = XLSX.utils.book_new()
  
  // Prepare metadata sheet data
  const metadataData = [
    ['Presentation Details', ''],
    ['Title', presentation.title],
    ['Generated', new Date().toLocaleString()],
    ['Total Duration', formatDuration(presentation.totalDuration)],
    ['Total Slides', presentation.slideCount],
    ['Start Time', formatTime(presentation.startTime)],
    ['Source URL', presentation.presentationUrl || 'N/A'],
    ['', ''], // Empty row
    ['Export Details', ''],
    ['Format', 'Excel (.xlsx)'],
    ['Generator', 'Gamma Timetable Extension'],
    ['Version', '2.0']
  ]
  
  // Prepare timetable data
  const timetableHeaders = [
    'Slide #',
    'Start Time', 
    'Duration (Min)',
    'Duration',
    'End Time',
    'Slide Title'
  ]
  
  const timetableRows = timetableData.items.map((item, index) => [
    index + 1,
    formatTime(item.startTime),
    item.duration,
    formatDuration(item.duration),
    formatTime(item.endTime),
    item.title
  ])
  
  // Create metadata worksheet
  const metadataWS = XLSX.utils.aoa_to_sheet(metadataData)
  
  // Set column widths for metadata
  metadataWS['!cols'] = [
    { wch: 20 }, // Column A - Labels
    { wch: 40 }  // Column B - Values
  ]
  
  // Create timetable worksheet
  const timetableWS = XLSX.utils.aoa_to_sheet([timetableHeaders, ...timetableRows])
  
  // Set column widths for timetable
  timetableWS['!cols'] = [
    { wch: 8 },  // Slide #
    { wch: 12 }, // Start Time
    { wch: 12 }, // Duration (Min)
    { wch: 15 }, // Duration (Formatted)
    { wch: 12 }, // End Time
    { wch: 50 }  // Slide Title
  ]
  
  // Add worksheets to workbook
  XLSX.utils.book_append_sheet(workbook, timetableWS, 'Timetable')
  XLSX.utils.book_append_sheet(workbook, metadataWS, 'Metadata')
  
  // Generate buffer and create download
  const excelBuffer = XLSX.write(workbook, { 
    bookType: 'xlsx', 
    type: 'array',
    compression: true
  })
  
  const blob = new Blob([excelBuffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' 
  })
  
  const link = document.createElement('a')
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `${presentation.title} - Timetable.xlsx`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
}

/**
 * Generate summary statistics for exports
 */
export function generateExportSummary(presentation: Presentation) {
  const { timetableData } = presentation
  
  return {
    totalSlides: presentation.slideCount,
    totalDuration: presentation.totalDuration,
    averageSlideDuration: Math.round(presentation.totalDuration / presentation.slideCount),
    shortestSlide: Math.min(...timetableData.items.map(item => item.duration)),
    longestSlide: Math.max(...timetableData.items.map(item => item.duration)),
    startTime: presentation.startTime,
    estimatedEndTime: formatTime(
      timetableData.items[timetableData.items.length - 1]?.endTime || presentation.startTime
    )
  }
}