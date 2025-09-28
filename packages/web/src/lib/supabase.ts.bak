// Legacy client - kept for backward compatibility with existing API routes
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Only create client if we have valid credentials
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null as any

// For new auth implementation, use the clients in /utils/supabase/

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          created_at?: string
          updated_at?: string
        }
      }
      presentations: {
        Row: {
          id: string
          user_id: string
          title: string
          content: any
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          content: any
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          content?: any
          created_at?: string
          updated_at?: string
        }
      }
      device_tokens: {
        Row: {
          token: string
          device_id: string
          user_id: string
          user_email: string
          device_name: string | null
          issued_at: string
          expires_at: string
          last_used: string
          created_at: string
          updated_at: string
        }
        Insert: {
          token: string
          device_id: string
          user_id: string
          user_email: string
          device_name?: string | null
          issued_at?: string
          expires_at: string
          last_used?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          token?: string
          device_id?: string
          user_id?: string
          user_email?: string
          device_name?: string | null
          issued_at?: string
          expires_at?: string
          last_used?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}