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
      allergen: {
        Row: {
          code: string
          name: string
        }
        Insert: {
          code: string
          name: string
        }
        Update: {
          code?: string
          name?: string
        }
        Relationships: []
      }
      chain: {
        Row: {
          active: boolean
          has_online_catalog: boolean
          id: string
          name: string
          website: string | null
        }
        Insert: {
          active?: boolean
          has_online_catalog?: boolean
          id: string
          name: string
          website?: string | null
        }
        Update: {
          active?: boolean
          has_online_catalog?: boolean
          id?: string
          name?: string
          website?: string | null
        }
        Relationships: []
      }
      cook_log: {
        Row: {
          completed_at: string | null
          household_id: string
          id: string
          plan_meal_id: string | null
          profile_id: string | null
          recipe_id: string
          started_at: string
        }
        Insert: {
          completed_at?: string | null
          household_id: string
          id?: string
          plan_meal_id?: string | null
          profile_id?: string | null
          recipe_id: string
          started_at?: string
        }
        Update: {
          completed_at?: string | null
          household_id?: string
          id?: string
          plan_meal_id?: string | null
          profile_id?: string | null
          recipe_id?: string
          started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cook_log_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "household"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cook_log_plan_meal_id_fkey"
            columns: ["plan_meal_id"]
            isOneToOne: false
            referencedRelation: "plan_meal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cook_log_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cook_log_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cook_log_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe_cost_today"
            referencedColumns: ["recipe_id"]
          },
          {
            foreignKeyName: "cook_log_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe_diet_flags"
            referencedColumns: ["recipe_id"]
          },
          {
            foreignKeyName: "cook_log_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe_diets"
            referencedColumns: ["recipe_id"]
          },
        ]
      }
      diet: {
        Row: {
          code: string
          kind: string
          name: string
        }
        Insert: {
          code: string
          kind: string
          name: string
        }
        Update: {
          code?: string
          kind?: string
          name?: string
        }
        Relationships: []
      }
      flyer: {
        Row: {
          chain_id: string
          fetched_at: string
          id: string
          source_url: string | null
          valid_from: string
          valid_to: string
        }
        Insert: {
          chain_id: string
          fetched_at?: string
          id?: string
          source_url?: string | null
          valid_from: string
          valid_to: string
        }
        Update: {
          chain_id?: string
          fetched_at?: string
          id?: string
          source_url?: string | null
          valid_from?: string
          valid_to?: string
        }
        Relationships: [
          {
            foreignKeyName: "flyer_chain_id_fkey"
            columns: ["chain_id"]
            isOneToOne: false
            referencedRelation: "chain"
            referencedColumns: ["id"]
          },
        ]
      }
      foodkeeper_item: {
        Row: {
          category: string | null
          id: number
          keywords: string | null
          name: string
          raw: Json
        }
        Insert: {
          category?: string | null
          id: number
          keywords?: string | null
          name: string
          raw: Json
        }
        Update: {
          category?: string | null
          id?: number
          keywords?: string | null
          name?: string
          raw?: Json
        }
        Relationships: []
      }
      fridge_item: {
        Row: {
          added_on: string
          created_at: string
          expires_on: string | null
          household_id: string
          id: string
          ingredient_id: string
          label: string | null
          product_id: string | null
          quantity: number | null
          source: string
          state: string
        }
        Insert: {
          added_on?: string
          created_at?: string
          expires_on?: string | null
          household_id: string
          id?: string
          ingredient_id: string
          label?: string | null
          product_id?: string | null
          quantity?: number | null
          source?: string
          state?: string
        }
        Update: {
          added_on?: string
          created_at?: string
          expires_on?: string | null
          household_id?: string
          id?: string
          ingredient_id?: string
          label?: string | null
          product_id?: string | null
          quantity?: number | null
          source?: string
          state?: string
        }
        Relationships: [
          {
            foreignKeyName: "fridge_item_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "household"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fridge_item_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredient"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fridge_item_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fridge_item_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_price_today"
            referencedColumns: ["product_id"]
          },
        ]
      }
      household: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          invite_code: string
          name: string
          portions: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          invite_code?: string
          name?: string
          portions?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          invite_code?: string
          name?: string
          portions?: number
        }
        Relationships: [
          {
            foreignKeyName: "household_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      household_member: {
        Row: {
          household_id: string
          joined_at: string
          profile_id: string
          role: string
        }
        Insert: {
          household_id: string
          joined_at?: string
          profile_id: string
          role?: string
        }
        Update: {
          household_id?: string
          joined_at?: string
          profile_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_member_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "household"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "household_member_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      ingredient: {
        Row: {
          base_unit: string
          category: string
          cooked_shelf_life_days: number | null
          created_at: string
          grams_per_piece: number | null
          id: string
          is_alcohol: boolean
          is_beef: boolean
          is_dairy: boolean
          is_egg: boolean
          is_fish: boolean
          is_gelatine: boolean
          is_honey: boolean
          is_other_meat: boolean
          is_pantry_staple: boolean
          is_pork: boolean
          is_poultry: boolean
          is_shellfish: boolean
          name: string
          parent_id: string | null
          protein_g_per_100: number | null
          shelf_life_days: number | null
          slug: string
          usable_fraction: number
          usable_note: string | null
          name_pt: string | null
        }
        Insert: {
          base_unit: string
          category: string
          cooked_shelf_life_days?: number | null
          created_at?: string
          grams_per_piece?: number | null
          id?: string
          is_alcohol?: boolean
          is_beef?: boolean
          is_dairy?: boolean
          is_egg?: boolean
          is_fish?: boolean
          is_gelatine?: boolean
          is_honey?: boolean
          is_other_meat?: boolean
          is_pantry_staple?: boolean
          is_pork?: boolean
          is_poultry?: boolean
          is_shellfish?: boolean
          name: string
          parent_id?: string | null
          protein_g_per_100?: number | null
          shelf_life_days?: number | null
          slug: string
          usable_fraction?: number
          usable_note?: string | null
          name_pt?: string | null
        }
        Update: {
          base_unit?: string
          category?: string
          cooked_shelf_life_days?: number | null
          created_at?: string
          grams_per_piece?: number | null
          id?: string
          is_alcohol?: boolean
          is_beef?: boolean
          is_dairy?: boolean
          is_egg?: boolean
          is_fish?: boolean
          is_gelatine?: boolean
          is_honey?: boolean
          is_other_meat?: boolean
          is_pantry_staple?: boolean
          is_pork?: boolean
          is_poultry?: boolean
          is_shellfish?: boolean
          name?: string
          parent_id?: string | null
          protein_g_per_100?: number | null
          shelf_life_days?: number | null
          slug?: string
          usable_fraction?: number
          usable_note?: string | null
          name_pt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ingredient_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "ingredient"
            referencedColumns: ["id"]
          },
        ]
      }
      ingredient_allergen: {
        Row: {
          allergen_code: string
          ingredient_id: string
        }
        Insert: {
          allergen_code: string
          ingredient_id: string
        }
        Update: {
          allergen_code?: string
          ingredient_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingredient_allergen_allergen_code_fkey"
            columns: ["allergen_code"]
            isOneToOne: false
            referencedRelation: "allergen"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "ingredient_allergen_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredient"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_type: {
        Row: {
          name: string
          slug: string
        }
        Insert: {
          name: string
          slug: string
        }
        Update: {
          name?: string
          slug?: string
        }
        Relationships: []
      }
      plan_meal: {
        Row: {
          day: string
          id: string
          portions: number
          recipe_id: string
          week_plan_id: string
        }
        Insert: {
          day: string
          id?: string
          portions?: number
          recipe_id: string
          week_plan_id: string
        }
        Update: {
          day?: string
          id?: string
          portions?: number
          recipe_id?: string
          week_plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_meal_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_meal_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe_cost_today"
            referencedColumns: ["recipe_id"]
          },
          {
            foreignKeyName: "plan_meal_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe_diet_flags"
            referencedColumns: ["recipe_id"]
          },
          {
            foreignKeyName: "plan_meal_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe_diets"
            referencedColumns: ["recipe_id"]
          },
          {
            foreignKeyName: "plan_meal_week_plan_id_fkey"
            columns: ["week_plan_id"]
            isOneToOne: false
            referencedRelation: "week_plan"
            referencedColumns: ["id"]
          },
        ]
      }
      prep_base: {
        Row: {
          id: string
          ingredient_id: string | null
          keeps_days: number
          method: string | null
          minutes: number | null
          name: string
          slug: string
          steps: Json
        }
        Insert: {
          id?: string
          ingredient_id?: string | null
          keeps_days?: number
          method?: string | null
          minutes?: number | null
          name: string
          slug: string
          steps?: Json
        }
        Update: {
          id?: string
          ingredient_id?: string | null
          keeps_days?: number
          method?: string | null
          minutes?: number | null
          name?: string
          slug?: string
          steps?: Json
        }
        Relationships: [
          {
            foreignKeyName: "prep_base_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredient"
            referencedColumns: ["id"]
          },
        ]
      }
      price_alert: {
        Row: {
          active: boolean
          id: string
          ingredient_id: string
          profile_id: string
          target_price: number | null
        }
        Insert: {
          active?: boolean
          id?: string
          ingredient_id: string
          profile_id: string
          target_price?: number | null
        }
        Update: {
          active?: boolean
          id?: string
          ingredient_id?: string
          profile_id?: string
          target_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "price_alert_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredient"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_alert_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      product: {
        Row: {
          active: boolean
          brand: string | null
          chain_id: string
          created_at: string
          ean: string | null
          external_id: string
          id: string
          ingredient_id: string | null
          mapping_source: string | null
          name: string
          pack_qty: number
          pack_unit: string
          receipt_aliases: string[]
          url: string | null
          usable_qty: number | null
          usable_source: string | null
          name_en: string | null
          name_en_source: string | null
        }
        Insert: {
          active?: boolean
          brand?: string | null
          chain_id: string
          created_at?: string
          ean?: string | null
          external_id: string
          id?: string
          ingredient_id?: string | null
          mapping_source?: string | null
          name: string
          pack_qty: number
          pack_unit: string
          receipt_aliases?: string[]
          url?: string | null
          usable_qty?: number | null
          usable_source?: string | null
          name_en?: string | null
          name_en_source?: string | null
        }
        Update: {
          active?: boolean
          brand?: string | null
          chain_id?: string
          created_at?: string
          ean?: string | null
          external_id?: string
          id?: string
          ingredient_id?: string | null
          mapping_source?: string | null
          name?: string
          pack_qty?: number
          pack_unit?: string
          receipt_aliases?: string[]
          url?: string | null
          usable_qty?: number | null
          usable_source?: string | null
          name_en?: string | null
          name_en_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_chain_id_fkey"
            columns: ["chain_id"]
            isOneToOne: false
            referencedRelation: "chain"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredient"
            referencedColumns: ["id"]
          },
        ]
      }
      product_price: {
        Row: {
          id: string
          observed_at: string
          price: number
          product_id: string
          source: string
          valid_from: string
          valid_to: string | null
        }
        Insert: {
          id?: string
          observed_at?: string
          price: number
          product_id: string
          source: string
          valid_from: string
          valid_to?: string | null
        }
        Update: {
          id?: string
          observed_at?: string
          price?: number
          product_id?: string
          source?: string
          valid_from?: string
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_price_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_price_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_price_today"
            referencedColumns: ["product_id"]
          },
        ]
      }
      profile: {
        Row: {
          cooking_mode: string
          created_at: string
          display_name: string | null
          id: string
        }
        Insert: {
          cooking_mode?: string
          created_at?: string
          display_name?: string | null
          id: string
        }
        Update: {
          cooking_mode?: string
          created_at?: string
          display_name?: string | null
          id?: string
        }
        Relationships: []
      }
      profile_allergen: {
        Row: {
          allergen_code: string
          profile_id: string
        }
        Insert: {
          allergen_code: string
          profile_id: string
        }
        Update: {
          allergen_code?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_allergen_allergen_code_fkey"
            columns: ["allergen_code"]
            isOneToOne: false
            referencedRelation: "allergen"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "profile_allergen_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_chain: {
        Row: {
          chain_id: string
          profile_id: string
        }
        Insert: {
          chain_id: string
          profile_id: string
        }
        Update: {
          chain_id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_chain_chain_id_fkey"
            columns: ["chain_id"]
            isOneToOne: false
            referencedRelation: "chain"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_chain_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_diet: {
        Row: {
          diet_code: string
          profile_id: string
        }
        Insert: {
          diet_code: string
          profile_id: string
        }
        Update: {
          diet_code?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_diet_diet_code_fkey"
            columns: ["diet_code"]
            isOneToOne: false
            referencedRelation: "diet"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "profile_diet_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_excluded_ingredient: {
        Row: {
          ingredient_id: string
          profile_id: string
        }
        Insert: {
          ingredient_id: string
          profile_id: string
        }
        Update: {
          ingredient_id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_excluded_ingredient_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredient"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_excluded_ingredient_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_meal_type: {
        Row: {
          meal_type_slug: string
          profile_id: string
        }
        Insert: {
          meal_type_slug: string
          profile_id: string
        }
        Update: {
          meal_type_slug?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_meal_type_meal_type_slug_fkey"
            columns: ["meal_type_slug"]
            isOneToOne: false
            referencedRelation: "meal_type"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "profile_meal_type_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      promotion: {
        Row: {
          created_at: string
          deal_text: string | null
          deal_type: string
          flyer_id: string | null
          id: string
          product_id: string
          promo_price: number
          regular_price: number | null
          requires_loyalty_card: boolean
          source: string
          source_url: string | null
        }
        Insert: {
          created_at?: string
          deal_text?: string | null
          deal_type?: string
          flyer_id?: string | null
          id?: string
          product_id: string
          promo_price: number
          regular_price?: number | null
          requires_loyalty_card?: boolean
          source: string
          source_url?: string | null
        }
        Update: {
          created_at?: string
          deal_text?: string | null
          deal_type?: string
          flyer_id?: string | null
          id?: string
          product_id?: string
          promo_price?: number
          regular_price?: number | null
          requires_loyalty_card?: boolean
          source?: string
          source_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promotion_flyer_id_fkey"
            columns: ["flyer_id"]
            isOneToOne: false
            referencedRelation: "flyer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_price_today"
            referencedColumns: ["product_id"]
          },
        ]
      }
      promotion_window: {
        Row: {
          ends_on: string
          id: string
          promotion_id: string
          starts_on: string
        }
        Insert: {
          ends_on: string
          id?: string
          promotion_id: string
          starts_on: string
        }
        Update: {
          ends_on?: string
          id?: string
          promotion_id?: string
          starts_on?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotion_window_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotion"
            referencedColumns: ["id"]
          },
        ]
      }
      receipt: {
        Row: {
          chain_id: string | null
          created_at: string
          created_by: string | null
          household_id: string
          id: string
          purchased_on: string | null
          total: number | null
        }
        Insert: {
          chain_id?: string | null
          created_at?: string
          created_by?: string | null
          household_id: string
          id?: string
          purchased_on?: string | null
          total?: number | null
        }
        Update: {
          chain_id?: string | null
          created_at?: string
          created_by?: string | null
          household_id?: string
          id?: string
          purchased_on?: string | null
          total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "receipt_chain_id_fkey"
            columns: ["chain_id"]
            isOneToOne: false
            referencedRelation: "chain"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "household"
            referencedColumns: ["id"]
          },
        ]
      }
      receipt_line: {
        Row: {
          confirmed: boolean
          id: string
          ingredient_id: string | null
          price: number | null
          product_id: string | null
          raw_text: string
          receipt_id: string
        }
        Insert: {
          confirmed?: boolean
          id?: string
          ingredient_id?: string | null
          price?: number | null
          product_id?: string | null
          raw_text: string
          receipt_id: string
        }
        Update: {
          confirmed?: boolean
          id?: string
          ingredient_id?: string | null
          price?: number | null
          product_id?: string | null
          raw_text?: string
          receipt_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "receipt_line_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredient"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_line_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_line_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_price_today"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "receipt_line_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "receipt"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe: {
        Row: {
          created_at: string
          fingerprint: string | null
          how: string | null
          id: string
          image_url: string | null
          meal_type: string
          minutes: number | null
          servings: number
          slug: string
          source: string
          status: string
          steps_fast: Json
          steps_relaxed: Json
          summary: string | null
          title: string
        }
        Insert: {
          created_at?: string
          fingerprint?: string | null
          how?: string | null
          id?: string
          image_url?: string | null
          meal_type: string
          minutes?: number | null
          servings?: number
          slug: string
          source?: string
          status?: string
          steps_fast?: Json
          steps_relaxed?: Json
          summary?: string | null
          title: string
        }
        Update: {
          created_at?: string
          fingerprint?: string | null
          how?: string | null
          id?: string
          image_url?: string | null
          meal_type?: string
          minutes?: number | null
          servings?: number
          slug?: string
          source?: string
          status?: string
          steps_fast?: Json
          steps_relaxed?: Json
          summary?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_meal_type_fkey"
            columns: ["meal_type"]
            isOneToOne: false
            referencedRelation: "meal_type"
            referencedColumns: ["slug"]
          },
        ]
      }
      recipe_ingredient: {
        Row: {
          ingredient_id: string
          is_optional: boolean
          note: string | null
          quantity: number
          recipe_id: string
        }
        Insert: {
          ingredient_id: string
          is_optional?: boolean
          note?: string | null
          quantity: number
          recipe_id: string
        }
        Update: {
          ingredient_id?: string
          is_optional?: boolean
          note?: string | null
          quantity?: number
          recipe_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_ingredient_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredient"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_ingredient_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_ingredient_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe_cost_today"
            referencedColumns: ["recipe_id"]
          },
          {
            foreignKeyName: "recipe_ingredient_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe_diet_flags"
            referencedColumns: ["recipe_id"]
          },
          {
            foreignKeyName: "recipe_ingredient_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe_diets"
            referencedColumns: ["recipe_id"]
          },
        ]
      }
      recipe_prep_base: {
        Row: {
          prep_base_id: string
          recipe_id: string
        }
        Insert: {
          prep_base_id: string
          recipe_id: string
        }
        Update: {
          prep_base_id?: string
          recipe_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_prep_base_prep_base_id_fkey"
            columns: ["prep_base_id"]
            isOneToOne: false
            referencedRelation: "prep_base"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_prep_base_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_prep_base_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe_cost_today"
            referencedColumns: ["recipe_id"]
          },
          {
            foreignKeyName: "recipe_prep_base_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe_diet_flags"
            referencedColumns: ["recipe_id"]
          },
          {
            foreignKeyName: "recipe_prep_base_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe_diets"
            referencedColumns: ["recipe_id"]
          },
        ]
      }
      recipe_tag: {
        Row: {
          recipe_id: string
          tag: string
        }
        Insert: {
          recipe_id: string
          tag: string
        }
        Update: {
          recipe_id?: string
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_tag_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_tag_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe_cost_today"
            referencedColumns: ["recipe_id"]
          },
          {
            foreignKeyName: "recipe_tag_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe_diet_flags"
            referencedColumns: ["recipe_id"]
          },
          {
            foreignKeyName: "recipe_tag_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe_diets"
            referencedColumns: ["recipe_id"]
          },
        ]
      }
      shopping_list_item: {
        Row: {
          checked: boolean
          id: string
          in_fridge: boolean
          ingredient_id: string
          packs: number
          product_id: string | null
          quantity_needed: number
          week_plan_id: string
        }
        Insert: {
          checked?: boolean
          id?: string
          in_fridge?: boolean
          ingredient_id: string
          packs?: number
          product_id?: string | null
          quantity_needed: number
          week_plan_id: string
        }
        Update: {
          checked?: boolean
          id?: string
          in_fridge?: boolean
          ingredient_id?: string
          packs?: number
          product_id?: string | null
          quantity_needed?: number
          week_plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopping_list_item_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredient"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopping_list_item_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopping_list_item_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_price_today"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "shopping_list_item_week_plan_id_fkey"
            columns: ["week_plan_id"]
            isOneToOne: false
            referencedRelation: "week_plan"
            referencedColumns: ["id"]
          },
        ]
      }
      storage_guideline: {
        Row: {
          created_at: string
          foodkeeper_item_id: number | null
          id: string
          ingredient_id: string
          location: string
          max_days: number | null
          min_days: number | null
          note: string | null
          review_status: string
          reviewed_at: string | null
          reviewed_by: string | null
          source: string
          state: string
        }
        Insert: {
          created_at?: string
          foodkeeper_item_id?: number | null
          id?: string
          ingredient_id: string
          location: string
          max_days?: number | null
          min_days?: number | null
          note?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          source: string
          state?: string
        }
        Update: {
          created_at?: string
          foodkeeper_item_id?: number | null
          id?: string
          ingredient_id?: string
          location?: string
          max_days?: number | null
          min_days?: number | null
          note?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: string
          state?: string
        }
        Relationships: [
          {
            foreignKeyName: "storage_guideline_foodkeeper_item_id_fkey"
            columns: ["foodkeeper_item_id"]
            isOneToOne: false
            referencedRelation: "foodkeeper_item"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storage_guideline_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredient"
            referencedColumns: ["id"]
          },
        ]
      }
      term_translation: {
        Row: {
          en: string
          note: string | null
          pt: string
        }
        Insert: {
          en: string
          note?: string | null
          pt: string
        }
        Update: {
          en?: string
          note?: string | null
          pt?: string
        }
        Relationships: []
      }
      week_plan: {
        Row: {
          accepted_at: string | null
          created_at: string
          created_by: string | null
          household_id: string
          id: string
          mode: string
          status: string
          week_start: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          created_by?: string | null
          household_id: string
          id?: string
          mode?: string
          status?: string
          week_start: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          created_by?: string | null
          household_id?: string
          id?: string
          mode?: string
          status?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "week_plan_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "week_plan_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "household"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      ingredient_best_price_today: {
        Row: {
          chain_id: string | null
          effective_price: number | null
          ingredient_id: string | null
          on_promo: boolean | null
          price_per_base_unit: number | null
          product_id: string | null
          promo_price: number | null
        }
        Relationships: []
      }
      ingredient_price_today: {
        Row: {
          chain_id: string | null
          effective_price: number | null
          ingredient_id: string | null
          on_promo: boolean | null
          price_per_base_unit: number | null
          product_id: string | null
          promo_price: number | null
        }
        Relationships: []
      }
      product_price_today: {
        Row: {
          chain_id: string | null
          deal_text: string | null
          effective_price: number | null
          ingredient_id: string | null
          name: string | null
          name_en: string | null
          pack_qty: number | null
          pack_unit: string | null
          price_per_base_unit: number | null
          product_id: string | null
          promo_ends_on: string | null
          promo_price: number | null
          regular_price: number | null
          requires_loyalty_card: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "product_chain_id_fkey"
            columns: ["chain_id"]
            isOneToOne: false
            referencedRelation: "chain"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredient"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_allergen: {
        Row: {
          allergen_code: string | null
          recipe_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ingredient_allergen_allergen_code_fkey"
            columns: ["allergen_code"]
            isOneToOne: false
            referencedRelation: "allergen"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "recipe_ingredient_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_ingredient_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe_cost_today"
            referencedColumns: ["recipe_id"]
          },
          {
            foreignKeyName: "recipe_ingredient_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe_diet_flags"
            referencedColumns: ["recipe_id"]
          },
          {
            foreignKeyName: "recipe_ingredient_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe_diets"
            referencedColumns: ["recipe_id"]
          },
        ]
      }
      recipe_cost_today: {
        Row: {
          cost_per_serving: number | null
          cost_total: number | null
          ingredients_counted: number | null
          ingredients_on_promo: number | null
          ingredients_priced: number | null
          recipe_id: string | null
          servings: number | null
        }
        Relationships: []
      }
      recipe_diet_flags: {
        Row: {
          has_alcohol: boolean | null
          has_beef: boolean | null
          has_dairy: boolean | null
          has_egg: boolean | null
          has_fish: boolean | null
          has_gelatine: boolean | null
          has_honey: boolean | null
          has_other_meat: boolean | null
          has_pork: boolean | null
          has_poultry: boolean | null
          has_shellfish: boolean | null
          recipe_id: string | null
        }
        Relationships: []
      }
      recipe_diets: {
        Row: {
          is_no_alcohol: boolean | null
          is_no_beef: boolean | null
          is_no_pork: boolean | null
          is_pescatarian: boolean | null
          is_vegan: boolean | null
          is_vegetarian: boolean | null
          recipe_id: string | null
        }
        Relationships: []
      }
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
