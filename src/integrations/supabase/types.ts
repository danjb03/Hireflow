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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      profiles: {
        Row: {
          airtable_rep_id: string | null
          client_name: string | null
          client_status: string | null
          created_at: string
          email: string
          id: string
          initial_password: string | null
          leads_fulfilled: number | null
          leads_per_day: number | null
          leads_purchased: number | null
          onboarding_date: string | null
          target_delivery_date: string | null
          updated_at: string
        }
        Insert: {
          airtable_rep_id?: string | null
          client_name?: string | null
          client_status?: string | null
          created_at?: string
          email: string
          id: string
          initial_password?: string | null
          leads_fulfilled?: number | null
          leads_per_day?: number | null
          leads_purchased?: number | null
          onboarding_date?: string | null
          target_delivery_date?: string | null
          updated_at?: string
        }
        Update: {
          airtable_rep_id?: string | null
          client_name?: string | null
          client_status?: string | null
          created_at?: string
          email?: string
          id?: string
          initial_password?: string | null
          leads_fulfilled?: number | null
          leads_per_day?: number | null
          leads_purchased?: number | null
          onboarding_date?: string | null
          target_delivery_date?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      deals: {
        Row: {
          id: string
          company_name: string
          revenue_inc_vat: number
          revenue_net: number
          operating_expense: number
          leads_sold: number
          lead_sale_price: number
          setter_commission_percent: number
          sales_rep_commission_percent: number
          setter_cost: number
          sales_rep_cost: number
          lead_fulfillment_cost: number
          close_date: string
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_name: string
          revenue_inc_vat: number
          revenue_net: number
          operating_expense: number
          leads_sold?: number
          lead_sale_price: number
          setter_commission_percent?: number
          sales_rep_commission_percent?: number
          setter_cost: number
          sales_rep_cost: number
          lead_fulfillment_cost: number
          close_date: string
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_name?: string
          revenue_inc_vat?: number
          revenue_net?: number
          operating_expense?: number
          leads_sold?: number
          lead_sale_price?: number
          setter_commission_percent?: number
          sales_rep_commission_percent?: number
          setter_cost?: number
          sales_rep_cost?: number
          lead_fulfillment_cost?: number
          close_date?: string
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      business_costs: {
        Row: {
          id: string
          name: string
          description: string | null
          amount: number
          cost_type: "recurring" | "one_time"
          frequency: "monthly" | "quarterly" | "yearly" | null
          category: string
          effective_date: string
          end_date: string | null
          is_active: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          amount: number
          cost_type: "recurring" | "one_time"
          frequency?: "monthly" | "quarterly" | "yearly" | null
          category: string
          effective_date: string
          end_date?: string | null
          is_active?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          amount?: number
          cost_type?: "recurring" | "one_time"
          frequency?: "monthly" | "quarterly" | "yearly" | null
          category?: string
          effective_date?: string
          end_date?: string | null
          is_active?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      cost_categories: {
        Row: {
          id: string
          name: string
          description: string | null
          icon: string | null
          color: string | null
          sort_order: number | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          icon?: string | null
          color?: string | null
          sort_order?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          icon?: string | null
          color?: string | null
          sort_order?: number | null
          created_at?: string
        }
        Relationships: []
      }
      sales_reps: {
        Row: {
          id: string
          name: string
          email: string | null
          is_active: boolean
          daily_calls_target: number
          daily_hours_target: number
          daily_bookings_target: number
          daily_pipeline_target: number
          weekly_bookings_target: number | null
          weekly_pipeline_target: number | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          email?: string | null
          is_active?: boolean
          daily_calls_target?: number
          daily_hours_target?: number
          daily_bookings_target?: number
          daily_pipeline_target?: number
          weekly_bookings_target?: number | null
          weekly_pipeline_target?: number | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string | null
          is_active?: boolean
          daily_calls_target?: number
          daily_hours_target?: number
          daily_bookings_target?: number
          daily_pipeline_target?: number
          weekly_bookings_target?: number | null
          weekly_pipeline_target?: number | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      daily_reports: {
        Row: {
          id: string
          rep_id: string
          report_date: string
          time_on_dialer_minutes: number
          calls_made: number
          bookings_made: number
          pipeline_value: number
          ai_extracted_time_minutes: number | null
          ai_extracted_calls: number | null
          ai_confidence_score: number | null
          screenshot_path: string | null
          screenshot_url: string | null
          notes: string | null
          submitted_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          rep_id: string
          report_date: string
          time_on_dialer_minutes: number
          calls_made: number
          bookings_made?: number
          pipeline_value?: number
          ai_extracted_time_minutes?: number | null
          ai_extracted_calls?: number | null
          ai_confidence_score?: number | null
          screenshot_path?: string | null
          screenshot_url?: string | null
          notes?: string | null
          submitted_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          rep_id?: string
          report_date?: string
          time_on_dialer_minutes?: number
          calls_made?: number
          bookings_made?: number
          pipeline_value?: number
          ai_extracted_time_minutes?: number | null
          ai_extracted_calls?: number | null
          ai_confidence_score?: number | null
          screenshot_path?: string | null
          screenshot_url?: string | null
          notes?: string | null
          submitted_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_reports_rep_id_fkey"
            columns: ["rep_id"]
            isOneToOne: false
            referencedRelation: "sales_reps"
            referencedColumns: ["id"]
          }
        ]
      }
      orders: {
        Row: {
          id: string
          client_id: string
          order_number: string
          leads_purchased: number
          leads_delivered: number
          start_date: string | null
          target_delivery_date: string | null
          status: string
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          order_number: string
          leads_purchased?: number
          leads_delivered?: number
          start_date?: string | null
          target_delivery_date?: string | null
          status?: string
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          order_number?: string
          leads_purchased?: number
          leads_delivered?: number
          start_date?: string | null
          target_delivery_date?: string | null
          status?: string
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      rep_client_allocations: {
        Row: {
          id: string
          rep_id: string
          client_airtable_id: string
          client_name: string | null
          allocated_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          rep_id: string
          client_airtable_id: string
          client_name?: string | null
          allocated_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          rep_id?: string
          client_airtable_id?: string
          client_name?: string | null
          allocated_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rep_client_allocations_rep_id_fkey"
            columns: ["rep_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "client" | "rep"
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
    Enums: {
      app_role: ["admin", "client", "rep"],
    },
  },
} as const
