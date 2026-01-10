/**
 * Supabase Database Types
 * Generated from database schema
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      workspaces: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          icon: string | null
          color: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          icon?: string | null
          color?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          icon?: string | null
          color?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      boards: {
        Row: {
          id: string
          workspace_id: string
          user_id: string
          name: string
          description: string | null
          background: string | null
          allowed_card_types: string[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          user_id: string
          name: string
          description?: string | null
          background?: string | null
          allowed_card_types?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          user_id?: string
          name?: string
          description?: string | null
          background?: string | null
          allowed_card_types?: string[] | null
          created_at?: string
          updated_at?: string
        }
      }
      lists: {
        Row: {
          id: string
          board_id: string
          user_id: string
          name: string
          position: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          board_id: string
          user_id: string
          name: string
          position: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          board_id?: string
          user_id?: string
          name?: string
          position?: number
          created_at?: string
          updated_at?: string
        }
      }
      cards: {
        Row: {
          id: string
          list_id: string
          user_id: string
          title: string
          description: string | null
          position: number
          type: string | null
          prompt: string | null
          rating: number | null
          ai_tool: string | null
          responsible: string | null
          job_number: string | null
          severity: string | null
          priority: string | null
          effort: string | null
          attendees: string[] | null
          meeting_date: string | null
          tags: string[] | null
          links: string[] | null
          due_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          list_id: string
          user_id: string
          title: string
          description?: string | null
          position: number
          type?: string | null
          prompt?: string | null
          rating?: number | null
          ai_tool?: string | null
          responsible?: string | null
          job_number?: string | null
          severity?: string | null
          priority?: string | null
          effort?: string | null
          attendees?: string[] | null
          meeting_date?: string | null
          tags?: string[] | null
          links?: string[] | null
          due_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          list_id?: string
          user_id?: string
          title?: string
          description?: string | null
          position?: number
          type?: string | null
          prompt?: string | null
          rating?: number | null
          ai_tool?: string | null
          responsible?: string | null
          job_number?: string | null
          severity?: string | null
          priority?: string | null
          effort?: string | null
          attendees?: string[] | null
          meeting_date?: string | null
          tags?: string[] | null
          links?: string[] | null
          due_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      user_profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          role: 'admin' | 'user' | 'viewer'
          avatar_url: string | null
          is_active: boolean
          created_at: string
          updated_at: string
          created_by: string | null
          last_login: string | null
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          role?: 'admin' | 'user' | 'viewer'
          avatar_url?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
          created_by?: string | null
          last_login?: string | null
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          role?: 'admin' | 'user' | 'viewer'
          avatar_url?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
          created_by?: string | null
          last_login?: string | null
        }
      }
      workspace_members: {
        Row: {
          id: string
          workspace_id: string
          user_id: string
          role: 'owner' | 'editor' | 'viewer'
          invited_by: string | null
          invited_at: string
          accepted_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          user_id: string
          role?: 'owner' | 'editor' | 'viewer'
          invited_by?: string | null
          invited_at?: string
          accepted_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          user_id?: string
          role?: 'owner' | 'editor' | 'viewer'
          invited_by?: string | null
          invited_at?: string
          accepted_at?: string | null
        }
      }
      board_members: {
        Row: {
          id: string
          board_id: string
          user_id: string
          role: 'owner' | 'editor' | 'viewer'
          invited_by: string | null
          invited_at: string
        }
        Insert: {
          id?: string
          board_id: string
          user_id: string
          role?: 'owner' | 'editor' | 'viewer'
          invited_by?: string | null
          invited_at?: string
        }
        Update: {
          id?: string
          board_id?: string
          user_id?: string
          role?: 'owner' | 'editor' | 'viewer'
          invited_by?: string | null
          invited_at?: string
        }
      }
      user_invitations: {
        Row: {
          id: string
          email: string
          role: 'admin' | 'user' | 'viewer'
          invited_by: string
          invited_at: string
          expires_at: string
          accepted_at: string | null
          is_used: boolean
          token: string
        }
        Insert: {
          id?: string
          email: string
          role: 'admin' | 'user' | 'viewer'
          invited_by: string
          invited_at?: string
          expires_at: string
          accepted_at?: string | null
          is_used?: boolean
          token: string
        }
        Update: {
          id?: string
          email?: string
          role?: 'admin' | 'user' | 'viewer'
          invited_by?: string
          invited_at?: string
          expires_at?: string
          accepted_at?: string | null
          is_used?: boolean
          token?: string
        }
      }
      password_reset_tokens: {
        Row: {
          id: string
          user_id: string
          token: string
          created_by: string
          created_at: string
          expires_at: string
          is_used: boolean
        }
        Insert: {
          id?: string
          user_id: string
          token: string
          created_by: string
          created_at?: string
          expires_at: string
          is_used?: boolean
        }
        Update: {
          id?: string
          user_id?: string
          token?: string
          created_by?: string
          created_at?: string
          expires_at?: string
          is_used?: boolean
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
