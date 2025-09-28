import type { SupabaseClient } from '@supabase/supabase-js'

type SupabaseAuthUser = {
  id: string
  email: string | null
}

export type AppUserRow = {
  id: string
  auth_id: string | null
  email: string | null
  name: string | null
  created_at: string | null
  email_notifications: boolean | null
  marketing_notifications: boolean | null
}

// Ensure a row exists in first-party users table for the authenticated Supabase user
// Uses upsert on unique auth_id to avoid select→insert races. Supplies minimal fields
// to avoid overwriting user-managed values on subsequent calls.
export async function ensureUserRecord(
  supabase: SupabaseClient,
  authUser: SupabaseAuthUser
): Promise<AppUserRow> {
  const selectFields = 'id, auth_id, email, name, created_at, email_notifications, marketing_notifications'

  // Minimal payload to prevent overwriting existing fields on conflict
  const upsertPayload = {
    auth_id: authUser.id,
    email: authUser.email,
  }

  const { data, error } = await supabase
    .from('users')
    .upsert(upsertPayload, { onConflict: 'auth_id' })
    .select(selectFields)
    .single()

  if (error || !data) {
    throw new Error(`Failed to ensure user record: ${error?.message || 'unknown error'}`)
  }

  return data as AppUserRow
}
