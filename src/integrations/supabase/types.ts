export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      availability_blocks: {
        Row: {
          end_date: string
          id: string
          notes: string | null
          start_date: string
          user_id: string
        }
        Insert: {
          end_date: string
          id?: string
          notes?: string | null
          start_date: string
          user_id: string
        }
        Update: {
          end_date?: string
          id?: string
          notes?: string | null
          start_date?: string
          user_id?: string
        }
        Relationships: []
      }
      borrow_offers: {
        Row: {
          borrow_request_id: string
          created_at: string
          id: string
          responded_at: string | null
          status: string
          talent_user_id: string
        }
        Insert: {
          borrow_request_id: string
          created_at?: string
          id?: string
          responded_at?: string | null
          status?: string
          talent_user_id: string
        }
        Update: {
          borrow_request_id?: string
          created_at?: string
          id?: string
          responded_at?: string | null
          status?: string
          talent_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "borrow_offers_borrow_request_id_fkey"
            columns: ["borrow_request_id"]
            isOneToOne: false
            referencedRelation: "borrow_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      borrow_requests: {
        Row: {
          created_at: string
          created_by: string
          end_ts: string
          id: string
          is_demo: boolean
          location: string
          message: string | null
          org_id: string
          role_key: string
          start_ts: string
          status: string
        }
        Insert: {
          created_at?: string
          created_by: string
          end_ts: string
          id?: string
          is_demo?: boolean
          location: string
          message?: string | null
          org_id: string
          role_key: string
          start_ts: string
          status?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          end_ts?: string
          id?: string
          is_demo?: boolean
          location?: string
          message?: string | null
          org_id?: string
          role_key?: string
          start_ts?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "borrow_requests_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      employer_talent_swipes: {
        Row: {
          created_at: string
          direction: string
          job_post_id: string
          org_id: string
          swiper_user_id: string
          talent_user_id: string
        }
        Insert: {
          created_at?: string
          direction: string
          job_post_id: string
          org_id: string
          swiper_user_id: string
          talent_user_id: string
        }
        Update: {
          created_at?: string
          direction?: string
          job_post_id?: string
          org_id?: string
          swiper_user_id?: string
          talent_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employer_talent_swipes_job_post_id_fkey"
            columns: ["job_post_id"]
            isOneToOne: false
            referencedRelation: "job_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employer_talent_swipes_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      housing_listings: {
        Row: {
          capacity: number
          created_at: string
          id: string
          is_demo: boolean
          location: string
          org_id: string | null
          owner_type: string
          owner_user_id: string | null
          price_month: number | null
          room_type: string | null
          status: string | null
        }
        Insert: {
          capacity?: number
          created_at?: string
          id?: string
          is_demo?: boolean
          location: string
          org_id?: string | null
          owner_type: string
          owner_user_id?: string | null
          price_month?: number | null
          room_type?: string | null
          status?: string | null
        }
        Update: {
          capacity?: number
          created_at?: string
          id?: string
          is_demo?: boolean
          location?: string
          org_id?: string | null
          owner_type?: string
          owner_user_id?: string | null
          price_month?: number | null
          room_type?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "housing_listings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      housing_requests: {
        Row: {
          created_at: string
          id: string
          job_post_id: string | null
          listing_id: string
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_post_id?: string | null
          listing_id: string
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          job_post_id?: string | null
          listing_id?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "housing_requests_job_post_id_fkey"
            columns: ["job_post_id"]
            isOneToOne: false
            referencedRelation: "job_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "housing_requests_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "housing_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      job_posts: {
        Row: {
          created_at: string
          end_date: string
          housing_offered: boolean | null
          id: string
          is_demo: boolean
          location: string | null
          org_id: string
          required_badges: string[] | null
          role_key: string
          start_date: string
          status: string | null
          title: string
        }
        Insert: {
          created_at?: string
          end_date: string
          housing_offered?: boolean | null
          id?: string
          is_demo?: boolean
          location?: string | null
          org_id: string
          required_badges?: string[] | null
          role_key: string
          start_date: string
          status?: string | null
          title: string
        }
        Update: {
          created_at?: string
          end_date?: string
          housing_offered?: boolean | null
          id?: string
          is_demo?: boolean
          location?: string | null
          org_id?: string
          required_badges?: string[] | null
          role_key?: string
          start_date?: string
          status?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_posts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          created_at: string
          id: string
          is_demo: boolean
          job_post_id: string
          org_id: string
          status: string | null
          talent_user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_demo?: boolean
          job_post_id: string
          org_id: string
          status?: string | null
          talent_user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_demo?: boolean
          job_post_id?: string
          org_id?: string
          status?: string | null
          talent_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_job_post_id_fkey"
            columns: ["job_post_id"]
            isOneToOne: false
            referencedRelation: "job_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          created_at: string
          id: string
          sender_user_id: string
          thread_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          sender_user_id: string
          thread_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          sender_user_id?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["id"]
          },
        ]
      }
      org_members: {
        Row: {
          org_id: string
          role: string
          user_id: string
        }
        Insert: {
          org_id: string
          role: string
          user_id: string
        }
        Update: {
          org_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      orgs: {
        Row: {
          created_at: string
          id: string
          is_demo: boolean
          location: string | null
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_demo?: boolean
          location?: string | null
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          is_demo?: boolean
          location?: string | null
          name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          home_base: string | null
          phone: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          home_base?: string | null
          phone?: string | null
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          home_base?: string | null
          phone?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      shift_bookings: {
        Row: {
          created_at: string
          end_ts: string
          id: string
          is_demo: boolean
          org_id: string
          start_ts: string
          talent_user_id: string
        }
        Insert: {
          created_at?: string
          end_ts: string
          id?: string
          is_demo?: boolean
          org_id: string
          start_ts: string
          talent_user_id: string
        }
        Update: {
          created_at?: string
          end_ts?: string
          id?: string
          is_demo?: boolean
          org_id?: string
          start_ts?: string
          talent_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_bookings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      talent_badges: {
        Row: {
          badge_key: string
          id: string
          label: string | null
          user_id: string
          verified: boolean | null
          verified_at: string | null
        }
        Insert: {
          badge_key: string
          id?: string
          label?: string | null
          user_id: string
          verified?: boolean | null
          verified_at?: string | null
        }
        Update: {
          badge_key?: string
          id?: string
          label?: string | null
          user_id?: string
          verified?: boolean | null
          verified_at?: string | null
        }
        Relationships: []
      }
      talent_job_swipes: {
        Row: {
          created_at: string
          direction: string
          job_post_id: string
          talent_user_id: string
        }
        Insert: {
          created_at?: string
          direction: string
          job_post_id: string
          talent_user_id: string
        }
        Update: {
          created_at?: string
          direction?: string
          job_post_id?: string
          talent_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "talent_job_swipes_job_post_id_fkey"
            columns: ["job_post_id"]
            isOneToOne: false
            referencedRelation: "job_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      talent_profiles: {
        Row: {
          bio: string | null
          desired_roles: string[] | null
          housing_need: boolean | null
          legacy_score_cached: number | null
          user_id: string
        }
        Insert: {
          bio?: string | null
          desired_roles?: string[] | null
          housing_need?: boolean | null
          legacy_score_cached?: number | null
          user_id: string
        }
        Update: {
          bio?: string | null
          desired_roles?: string[] | null
          housing_need?: boolean | null
          legacy_score_cached?: number | null
          user_id?: string
        }
        Relationships: []
      }
      tenant_verifications: {
        Row: {
          employment_verified: boolean | null
          id_verified: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          employment_verified?: boolean | null
          id_verified?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          employment_verified?: boolean | null
          id_verified?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      threads: {
        Row: {
          created_at: string
          id: string
          match_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          match_id: string
        }
        Update: {
          created_at?: string
          id?: string
          match_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "threads_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: true
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      video_pitches: {
        Row: {
          duration_s: number | null
          id: string
          playback_id: string | null
          provider: string | null
          status: string | null
          thumbnail_url: string | null
          user_id: string
        }
        Insert: {
          duration_s?: number | null
          id?: string
          playback_id?: string | null
          provider?: string | null
          status?: string | null
          thumbnail_url?: string | null
          user_id: string
        }
        Update: {
          duration_s?: number | null
          id?: string
          playback_id?: string | null
          provider?: string | null
          status?: string | null
          thumbnail_url?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      talent_busy_blocks_public: {
        Row: {
          end_ts: string | null
          start_ts: string | null
          talent_user_id: string | null
        }
        Insert: {
          end_ts?: string | null
          start_ts?: string | null
          talent_user_id?: string | null
        }
        Update: {
          end_ts?: string | null
          start_ts?: string | null
          talent_user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_borrow_offer: { Args: { p_offer_id: string }; Returns: Json }
      find_available_talents: {
        Args: { p_end_ts: string; p_location: string; p_start_ts: string }
        Returns: {
          full_name: string
          legacy_score: number
          user_id: string
        }[]
      }
      has_match_access: {
        Args: { _match_id: string; _user_id: string }
        Returns: boolean
      }
      has_thread_access: {
        Args: { _thread_id: string; _user_id: string }
        Returns: boolean
      }
      is_listing_owner: {
        Args: { _listing_id: string; _user_id: string }
        Returns: boolean
      }
      is_org_admin: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_org_member: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_verified_tenant: { Args: { _user_id: string }; Returns: boolean }
      reset_demo: { Args: { p_org_id: string }; Returns: Json }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
