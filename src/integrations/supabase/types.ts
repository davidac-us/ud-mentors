export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          user_id: string
          name: string
          role: 'mentee' | 'mentor' | null
          country: string | null
          university: string | null
          year: string | null
          major: string | null
          fun_fact: string | null
          best_advice: string | null
          mentor_prompt: string | null
          mentee_prompt: string | null
          mentee_cap: number | null
          onboarded: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name?: string
          role?: 'mentee' | 'mentor' | null
          country?: string | null
          university?: string | null
          year?: string | null
          major?: string | null
          fun_fact?: string | null
          best_advice?: string | null
          mentor_prompt?: string | null
          mentee_prompt?: string | null
          mentee_cap?: number | null
          onboarded?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          role?: 'mentee' | 'mentor' | null
          country?: string | null
          university?: string | null
          year?: string | null
          major?: string | null
          fun_fact?: string | null
          best_advice?: string | null
          mentor_prompt?: string | null
          mentee_prompt?: string | null
          mentee_cap?: number | null
          onboarded?: boolean
          created_at?: string
        }
        Relationships: []
      }
      profile_languages: {
        Row: { profile_id: string; language: string }
        Insert: { profile_id: string; language: string }
        Update: { profile_id?: string; language?: string }
        Relationships: [
          {
            foreignKeyName: 'profile_languages_profile_id_fkey'
            columns: ['profile_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      profile_interests: {
        Row: { profile_id: string; interest: string }
        Insert: { profile_id: string; interest: string }
        Update: { profile_id?: string; interest?: string }
        Relationships: [
          {
            foreignKeyName: 'profile_interests_profile_id_fkey'
            columns: ['profile_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      matches: {
        Row: {
          id: string
          mentee_id: string
          mentor_id: string
          status: 'pending' | 'matched' | 'declined'
          created_at: string
          responded_at: string | null
          expires_at: string
          cooldown_until: string | null
        }
        Insert: {
          id?: string
          mentee_id: string
          mentor_id: string
          status?: 'pending' | 'matched' | 'declined'
          created_at?: string
          responded_at?: string | null
          expires_at?: string
          cooldown_until?: string | null
        }
        Update: {
          id?: string
          mentee_id?: string
          mentor_id?: string
          status?: 'pending' | 'matched' | 'declined'
          created_at?: string
          responded_at?: string | null
          expires_at?: string
          cooldown_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'matches_mentee_id_fkey'
            columns: ['mentee_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'matches_mentor_id_fkey'
            columns: ['mentor_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      messages: {
        Row: {
          id: string
          match_id: string
          sender_id: string
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          match_id: string
          sender_id: string
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          match_id?: string
          sender_id?: string
          content?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'messages_match_id_fkey'
            columns: ['match_id']
            isOneToOne: false
            referencedRelation: 'matches'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'messages_sender_id_fkey'
            columns: ['sender_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      community_rooms: {
        Row: {
          id: string
          type: 'global' | 'language' | 'group'
          name: string
          language_code: string | null
          created_at: string
        }
        Insert: {
          id?: string
          type: 'global' | 'language' | 'group'
          name: string
          language_code?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          type?: 'global' | 'language' | 'group'
          name?: string
          language_code?: string | null
          created_at?: string
        }
        Relationships: []
      }
      community_messages: {
        Row: {
          id: string
          room_id: string
          sender_id: string
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          room_id: string
          sender_id: string
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          room_id?: string
          sender_id?: string
          content?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'community_messages_room_id_fkey'
            columns: ['room_id']
            isOneToOne: false
            referencedRelation: 'community_rooms'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'community_messages_sender_id_fkey'
            columns: ['sender_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      community_room_members: {
        Row: { room_id: string; profile_id: string; joined_at: string }
        Insert: { room_id: string; profile_id: string; joined_at?: string }
        Update: { room_id?: string; profile_id?: string; joined_at?: string }
        Relationships: [
          {
            foreignKeyName: 'community_room_members_room_id_fkey'
            columns: ['room_id']
            isOneToOne: false
            referencedRelation: 'community_rooms'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'community_room_members_profile_id_fkey'
            columns: ['profile_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      events: {
        Row: {
          id: string
          poster_id: string
          type: 'event' | 'club'
          title: string
          description: string
          date: string | null
          location: string
          room: string
          meeting_days: string
          meeting_time: string
          recurrence: string
          community_room_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          poster_id: string
          type: 'event' | 'club'
          title: string
          description?: string
          date?: string | null
          location?: string
          room?: string
          meeting_days?: string
          meeting_time?: string
          recurrence?: string
          community_room_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          poster_id?: string
          type?: 'event' | 'club'
          title?: string
          description?: string
          date?: string | null
          location?: string
          room?: string
          meeting_days?: string
          meeting_time?: string
          recurrence?: string
          community_room_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'events_poster_id_fkey'
            columns: ['poster_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

// Convenience helpers
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']

// Domain types
export type Profile = Tables<'profiles'>
export type Match = Tables<'matches'>
export type Message = Tables<'messages'>
export type CommunityRoom = Tables<'community_rooms'>
export type CommunityMessage = Tables<'community_messages'>
export type Event = Tables<'events'>
