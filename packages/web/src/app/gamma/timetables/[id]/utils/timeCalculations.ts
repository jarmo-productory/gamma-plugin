import { TimetableItem } from '../../types'

/**
 * Parse flexible time input strings using ms library
 * Supports formats like: "5m", "5 min", "00:05", "5 minutes", etc.
 */
// Removed time converter utility: durations are minutes-only in UI layers

/**
 * Format time in HH:MM format
 */
export function formatTime(timeString: string): string {
  // Ensure time is in HH:MM format
  if (/^\d{1,2}:\d{2}$/.test(timeString)) {
    const [hours, minutes] = timeString.split(':').map(Number)
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
  }
  return timeString
}

/**
 * Add minutes to a time string (HH:MM format)
 */
export function addMinutesToTime(timeString: string, minutesToAdd: number): string {
  const [hours, minutes] = timeString.split(':').map(Number)
  const totalMinutes = hours * 60 + minutes + minutesToAdd
  
  const newHours = Math.floor(totalMinutes / 60) % 24 // Handle day rollover
  const newMinutes = totalMinutes % 60
  
  return `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`
}

/**
 * Format duration in a human-readable format
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}min`
  }
  
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  
  if (remainingMinutes === 0) {
    return `${hours}h`
  }
  
  return `${hours}h ${remainingMinutes}min`
}

/**
 * Format duration in a compact format
 */
export function formatDurationCompact(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`
  }
  
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  
  if (remainingMinutes === 0) {
    return `${hours}h`
  }
  
  return `${hours}h${remainingMinutes}m`
}

/**
 * Recalculate all slide times based on start time and individual durations
 * This ensures consistency when start time or any duration changes
 */
export function recalculateTimeTable(items: TimetableItem[], startTime: string): TimetableItem[] {
  if (!items.length) return items
  
  const recalculatedItems: TimetableItem[] = []
  let currentTime = startTime
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const startTimeForSlide = currentTime
    const endTimeForSlide = addMinutesToTime(currentTime, item.duration)
    
    recalculatedItems.push({
      ...item,
      startTime: startTimeForSlide,
      endTime: endTimeForSlide
    })
    
    // Next slide starts when current slide ends
    currentTime = endTimeForSlide
  }
  
  return recalculatedItems
}

/**
 * Calculate total presentation duration from slides
 */
export function calculateTotalDuration(items: TimetableItem[]): number {
  return items.reduce((total, item) => total + item.duration, 0)
}

/**
 * Validate time string format (HH:MM)
 */
export function isValidTimeFormat(timeString: string): boolean {
  return /^\d{1,2}:\d{2}$/.test(timeString)
}

/**
 * Parse start time input and return valid time string
 */
export function parseStartTimeInput(input: string): string | null {
  const trimmed = input.trim()
  
  // Handle HH:MM format
  if (/^\d{1,2}:\d{2}$/.test(trimmed)) {
    const [hours, minutes] = trimmed.split(':').map(Number)
    if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
      return formatTime(trimmed)
    }
  }
  
  // Handle H:MM format (add leading zero)
  if (/^\d:\d{2}$/.test(trimmed)) {
    return `0${trimmed}`
  }
  
  return null
}
