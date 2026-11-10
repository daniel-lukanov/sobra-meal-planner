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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      experiment_sessions: {
        Row: {
          ab_cta_variant: string
          ab_framing_variant: string | null
          ab_plan_variant: string
          accepted_week_clicked: boolean
          bonus_completed: boolean
          contact: string | null
          contact_left: boolean
          cook_tab_visited: boolean
          created_at: string
          cta_converted: boolean | null
          current_workaround: string | null
          deals_tab_visited: boolean
          fallback_nights: string | null
          fridge_receipt_scanned: boolean
          household_size: string | null
          initial_mode_switched: boolean
          open_feedback: string | null
          preferred_store: string | null
          q1_household: string | null
          q10_switch_threshold: string | null
          q11_wasted_items: string[] | null
          q12_synergy_attitude: string | null
          q13_buy_a_feature: Json | null
          q14_stated_wtp: string | null
          q15_open_feedback: string | null
          q2_fallback_nights: string | null
          q3_pain_1: string | null
          q3_pain_2: string | null
          q4_workaround: string | null
          q5_primary_store: string | null
          q5_weekly_spend: number | null
          q6_mode_winner: string | null
          q7_receipt_habit: string | null
          q8_pmf_score: string | null
          q9_last_dinner_timing: string | null
          receipt_willingness: string | null
          referral_source: string
          session_id: string
          shared_on_whatsapp: boolean
          survey_post_completed: boolean
          survey_pre_completed: boolean
          swapped_meal_clicked: boolean
          synergy_filter_used: boolean
          task_1_plan: boolean
          task_2_mode: boolean
          task_3_deals: boolean
          task_4_list: boolean
          task_5_fridge: boolean
          time_spent_seconds: number
          top_pain: string | null
          updated_at: string
          weekly_spend: string | null
          winning_feature: string | null
        }
        Insert: {
          ab_cta_variant: string
          ab_framing_variant?: string | null
          ab_plan_variant: string
          accepted_week_clicked?: boolean
          bonus_completed?: boolean
          contact?: string | null
          contact_left?: boolean
          cook_tab_visited?: boolean
          created_at?: string
          cta_converted?: boolean | null
          current_workaround?: string | null
          deals_tab_visited?: boolean
          fallback_nights?: string | null
          fridge_receipt_scanned?: boolean
          household_size?: string | null
          initial_mode_switched?: boolean
          open_feedback?: string | null
          preferred_store?: string | null
          q1_household?: string | null
          q10_switch_threshold?: string | null
          q11_wasted_items?: string[] | null
          q12_synergy_attitude?: string | null
          q13_buy_a_feature?: Json | null
          q14_stated_wtp?: string | null
          q15_open_feedback?: string | null
          q2_fallback_nights?: string | null
          q3_pain_1?: string | null
          q3_pain_2?: string | null
          q4_workaround?: string | null
          q5_primary_store?: string | null
          q5_weekly_spend?: number | null
          q6_mode_winner?: string | null
          q7_receipt_habit?: string | null
          q8_pmf_score?: string | null
          q9_last_dinner_timing?: string | null
          receipt_willingness?: string | null
          referral_source?: string
          session_id: string
          shared_on_whatsapp?: boolean
          survey_post_completed?: boolean
          survey_pre_completed?: boolean
          swapped_meal_clicked?: boolean
          synergy_filter_used?: boolean
          task_1_plan?: boolean
          task_2_mode?: boolean
          task_3_deals?: boolean
          task_4_list?: boolean
          task_5_fridge?: boolean
          time_spent_seconds?: number
          top_pain?: string | null
          updated_at?: string
          weekly_spend?: string | null
          winning_feature?: string | null
        }
        Update: {
          ab_cta_variant?: string
          ab_framing_variant?: string | null
          ab_plan_variant?: string
          accepted_week_clicked?: boolean
          bonus_completed?: boolean
          contact?: string | null
          contact_left?: boolean
          cook_tab_visited?: boolean
          created_at?: string
          cta_converted?: boolean | null
          current_workaround?: string | null
          deals_tab_visited?: boolean
          fallback_nights?: string | null
          fridge_receipt_scanned?: boolean
          household_size?: string | null
          initial_mode_switched?: boolean
          open_feedback?: string | null
          preferred_store?: string | null
          q1_household?: string | null
          q10_switch_threshold?: string | null
          q11_wasted_items?: string[] | null
          q12_synergy_attitude?: string | null
          q13_buy_a_feature?: Json | null
          q14_stated_wtp?: string | null
          q15_open_feedback?: string | null
          q2_fallback_nights?: string | null
          q3_pain_1?: string | null
          q3_pain_2?: string | null
          q4_workaround?: string | null
          q5_primary_store?: string | null
          q5_weekly_spend?: number | null
          q6_mode_winner?: string | null
          q7_receipt_habit?: string | null
          q8_pmf_score?: string | null
          q9_last_dinner_timing?: string | null
          receipt_willingness?: string | null
          referral_source?: string
          session_id?: string
          shared_on_whatsapp?: boolean
          survey_post_completed?: boolean
          survey_pre_completed?: boolean
          swapped_meal_clicked?: boolean
          synergy_filter_used?: boolean
          task_1_plan?: boolean
          task_2_mode?: boolean
          task_3_deals?: boolean
          task_4_list?: boolean
          task_5_fridge?: boolean
          time_spent_seconds?: number
          top_pain?: string | null
          updated_at?: string
          weekly_spend?: string | null
          winning_feature?: string | null
        }
        Relationships: []
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
