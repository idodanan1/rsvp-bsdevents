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
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      events: {
        Row: {
          id: string
          user_id: string
          name: string
          slug: string
          description: string | null
          event_date: string | null
          location: string | null
          public_view_enabled: boolean
          public_view_password: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          slug: string
          description?: string | null
          event_date?: string | null
          location?: string | null
          public_view_enabled?: boolean
          public_view_password?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          slug?: string
          description?: string | null
          event_date?: string | null
          location?: string | null
          public_view_enabled?: boolean
          public_view_password?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      guests: {
        Row: {
          id: string
          event_id: string
          full_name: string
          phone: string | null
          guest_count: number
          group_category: string | null
          rsvp_status: 'pending' | 'confirmed' | 'maybe' | 'declined'
          message_status: 'not_sent' | 'sent' | 'delivered' | 'read' | 'failed'
          check_in_status: 'not_arrived' | 'arrived'
          checked_in_at: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          event_id: string
          full_name: string
          phone?: string | null
          guest_count?: number
          group_category?: string | null
          rsvp_status?: 'pending' | 'confirmed' | 'maybe' | 'declined'
          message_status?: 'not_sent' | 'sent' | 'delivered' | 'read' | 'failed'
          check_in_status?: 'not_arrived' | 'arrived'
          checked_in_at?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          full_name?: string
          phone?: string | null
          guest_count?: number
          group_category?: string | null
          rsvp_status?: 'pending' | 'confirmed' | 'maybe' | 'declined'
          message_status?: 'not_sent' | 'sent' | 'delivered' | 'read' | 'failed'
          check_in_status?: 'not_arrived' | 'arrived'
          checked_in_at?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      tables: {
        Row: {
          id: string
          event_id: string
          name: string
          table_number: number
          capacity: number
          position_x: number | null
          position_y: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          event_id: string
          name: string
          table_number: number
          capacity?: number
          position_x?: number | null
          position_y?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          name?: string
          table_number?: number
          capacity?: number
          position_x?: number | null
          position_y?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      table_assignments: {
        Row: {
          id: string
          event_id: string
          guest_id: string
          table_id: string
          assigned_at: string
        }
        Insert: {
          id?: string
          event_id: string
          guest_id: string
          table_id: string
          assigned_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          guest_id?: string
          table_id?: string
          assigned_at?: string
        }
      }
      message_templates: {
        Row: {
          id: string
          user_id: string
          name: string
          template_id: string | null
          content: string
          type: 'invite' | 'reminder' | 'thank_you' | 'custom'
          variables: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          template_id?: string | null
          content: string
          type?: 'invite' | 'reminder' | 'thank_you' | 'custom'
          variables?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          template_id?: string | null
          content?: string
          type?: 'invite' | 'reminder' | 'thank_you' | 'custom'
          variables?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      whatsapp_messages: {
        Row: {
          id: string
          event_id: string
          guest_id: string | null
          template_id: string | null
          message_id: string | null
          phone_number: string
          status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed'
          content: string | null
          error_message: string | null
          sent_at: string | null
          delivered_at: string | null
          read_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          event_id: string
          guest_id?: string | null
          template_id?: string | null
          message_id?: string | null
          phone_number: string
          status?: 'pending' | 'sent' | 'delivered' | 'read' | 'failed'
          content?: string | null
          error_message?: string | null
          sent_at?: string | null
          delivered_at?: string | null
          read_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          guest_id?: string | null
          template_id?: string | null
          message_id?: string | null
          phone_number?: string
          status?: 'pending' | 'sent' | 'delivered' | 'read' | 'failed'
          content?: string | null
          error_message?: string | null
          sent_at?: string | null
          delivered_at?: string | null
          read_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      whatsapp_campaigns: {
        Row: {
          id: string
          event_id: string
          template_id: string | null
          name: string
          type: 'invite_round_1' | 'invite_round_2' | 'invite_round_3' | 'reminder' | 'thank_you' | 'custom'
          target_status: string[]
          scheduled_at: string | null
          status: 'draft' | 'scheduled' | 'running' | 'completed' | 'cancelled'
          total_recipients: number
          sent_count: number
          failed_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          event_id: string
          template_id?: string | null
          name: string
          type: 'invite_round_1' | 'invite_round_2' | 'invite_round_3' | 'reminder' | 'thank_you' | 'custom'
          target_status?: string[]
          scheduled_at?: string | null
          status?: 'draft' | 'scheduled' | 'running' | 'completed' | 'cancelled'
          total_recipients?: number
          sent_count?: number
          failed_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          template_id?: string | null
          name?: string
          type?: 'invite_round_1' | 'invite_round_2' | 'invite_round_3' | 'reminder' | 'thank_you' | 'custom'
          target_status?: string[]
          scheduled_at?: string | null
          status?: 'draft' | 'scheduled' | 'running' | 'completed' | 'cancelled'
          total_recipients?: number
          sent_count?: number
          failed_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      qr_codes: {
        Row: {
          id: string
          event_id: string
          guest_id: string
          code: string
          qr_image_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          event_id: string
          guest_id: string
          code: string
          qr_image_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          guest_id?: string
          code?: string
          qr_image_url?: string | null
          created_at?: string
        }
      }
      check_ins: {
        Row: {
          id: string
          event_id: string
          guest_id: string
          qr_code_id: string | null
          checked_in_at: string
          scanner_device_id: string | null
        }
        Insert: {
          id?: string
          event_id: string
          guest_id: string
          qr_code_id?: string | null
          checked_in_at?: string
          scanner_device_id?: string | null
        }
        Update: {
          id?: string
          event_id?: string
          guest_id?: string
          qr_code_id?: string | null
          checked_in_at?: string
          scanner_device_id?: string | null
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

