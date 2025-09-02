import { z } from 'zod'

export const TimetableItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  duration: z.number().int().nonnegative(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  content: z.any().optional(),
}).passthrough()

export const TimetableDataSchema = z.object({
  title: z.string().optional(),
  items: z.array(TimetableItemSchema),
  startTime: z.string().optional(),
  totalDuration: z.number().int().nonnegative().optional(),
}).passthrough()

// Accept both naming styles; normalize to snake_case payload
export const SaveRequestSchema = z.object({
  // canonical inputs (snake)
  gamma_url: z.string().url().optional(),
  start_time: z.string().optional(),
  total_duration: z.number().int().nonnegative().optional(),
  timetable_data: TimetableDataSchema.optional(),
  // camel inputs (deprecated)
  presentationUrl: z.string().url().optional(),
  timetableData: TimetableDataSchema.optional(),
  // common
  title: z.string().min(1),
}).strict()

export type NormalizedSavePayload = {
  title: string
  gamma_url: string
  start_time?: string | null
  total_duration?: number | null
  timetable_data: z.infer<typeof TimetableDataSchema>
}

export function normalizeSaveRequest(input: unknown): NormalizedSavePayload & { deprecatedCamelUsed: boolean } {
  const parsed = SaveRequestSchema.parse(input)
  const deprecatedCamelUsed = Boolean(parsed.presentationUrl || parsed.timetableData)

  const gammaUrl = parsed.gamma_url ?? parsed.presentationUrl!
  const timetable = parsed.timetable_data ?? parsed.timetableData!

  return {
    title: parsed.title,
    gamma_url: gammaUrl,
    start_time: (parsed.start_time ?? timetable.startTime) ?? null,
    total_duration: (parsed.total_duration ?? timetable.totalDuration) ?? null,
    timetable_data: timetable,
    deprecatedCamelUsed,
  }
}

export const PresentationDtoSchema = z.object({
  id: z.string().uuid(),
  gamma_url: z.string().url(),
  title: z.string(),
  start_time: z.string().nullable().optional(),
  total_duration: z.number().int().nonnegative().nullable().optional(),
  timetable_data: TimetableDataSchema,
  updated_at: z.string(),
}).strict()
