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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          created_at: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      connection_sv_entries: {
        Row: {
          aadhaar_last4: string | null
          bank_ac_last4: string | null
          cash_memo_no: number | null
          consumer_id: string | null
          consumer_name: string | null
          consumer_no: string | null
          created_at: string
          cylinder_dpr_count: number
          cylinder_dpr_type_id: string | null
          duplicate_household_check_done: boolean
          eligibility_check_done: boolean
          entry_date: string
          filled_empty_at_tv_retrieval: Database["public"]["Enums"]["tv_retrieval_state"]
          id: string
          locked: boolean
          locked_at: string | null
          processed_by: string | null
          scheme: Database["public"]["Enums"]["consumer_scheme"]
          sr_no: number
          type: Database["public"]["Enums"]["connection_sv_type"]
          updated_at: string
        }
        Insert: {
          aadhaar_last4?: string | null
          bank_ac_last4?: string | null
          cash_memo_no?: number | null
          consumer_id?: string | null
          consumer_name?: string | null
          consumer_no?: string | null
          created_at?: string
          cylinder_dpr_count?: number
          cylinder_dpr_type_id?: string | null
          duplicate_household_check_done?: boolean
          eligibility_check_done?: boolean
          entry_date?: string
          filled_empty_at_tv_retrieval?: Database["public"]["Enums"]["tv_retrieval_state"]
          id?: string
          locked?: boolean
          locked_at?: string | null
          processed_by?: string | null
          scheme?: Database["public"]["Enums"]["consumer_scheme"]
          sr_no?: number
          type?: Database["public"]["Enums"]["connection_sv_type"]
          updated_at?: string
        }
        Update: {
          aadhaar_last4?: string | null
          bank_ac_last4?: string | null
          cash_memo_no?: number | null
          consumer_id?: string | null
          consumer_name?: string | null
          consumer_no?: string | null
          created_at?: string
          cylinder_dpr_count?: number
          cylinder_dpr_type_id?: string | null
          duplicate_household_check_done?: boolean
          eligibility_check_done?: boolean
          entry_date?: string
          filled_empty_at_tv_retrieval?: Database["public"]["Enums"]["tv_retrieval_state"]
          id?: string
          locked?: boolean
          locked_at?: string | null
          processed_by?: string | null
          scheme?: Database["public"]["Enums"]["consumer_scheme"]
          sr_no?: number
          type?: Database["public"]["Enums"]["connection_sv_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "connection_sv_entries_consumer_id_fkey"
            columns: ["consumer_id"]
            isOneToOne: false
            referencedRelation: "consumers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connection_sv_entries_cylinder_dpr_type_id_fkey"
            columns: ["cylinder_dpr_type_id"]
            isOneToOne: false
            referencedRelation: "package_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connection_sv_entries_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      consumers: {
        Row: {
          address: string | null
          consumer_no: string
          created_at: string
          id: string
          mobile_no: string | null
          name: string
          scheme: Database["public"]["Enums"]["consumer_scheme"]
        }
        Insert: {
          address?: string | null
          consumer_no: string
          created_at?: string
          id?: string
          mobile_no?: string | null
          name: string
          scheme?: Database["public"]["Enums"]["consumer_scheme"]
        }
        Update: {
          address?: string | null
          consumer_no?: string
          created_at?: string
          id?: string
          mobile_no?: string | null
          name?: string
          scheme?: Database["public"]["Enums"]["consumer_scheme"]
        }
        Relationships: []
      }
      defective_entries: {
        Row: {
          batch_no: string | null
          consumer_contact: string | null
          consumer_id: string | null
          consumer_name: string | null
          consumer_no: string | null
          created_at: string
          cylinder_dpr_sr_no: string | null
          cylinder_dpr_type_id: string | null
          date_of_identification: string
          distributor_signature: string | null
          driver_consumer_signature: string | null
          filled_by: string | null
          id: string
          locked: boolean
          locked_at: string | null
          nature_of_defect: string | null
          plant_name: string | null
          prcn: string | null
          prcn_received: boolean
          prcn_sent_on: string | null
          received_replacement_stock_on: string | null
          seal_condition: Database["public"]["Enums"]["defect_seal_condition"]
          sent_to_plant_on: string | null
          source: Database["public"]["Enums"]["defect_source"]
          sr_no: number
          tt_no: string | null
          updated_at: string
        }
        Insert: {
          batch_no?: string | null
          consumer_contact?: string | null
          consumer_id?: string | null
          consumer_name?: string | null
          consumer_no?: string | null
          created_at?: string
          cylinder_dpr_sr_no?: string | null
          cylinder_dpr_type_id?: string | null
          date_of_identification?: string
          distributor_signature?: string | null
          driver_consumer_signature?: string | null
          filled_by?: string | null
          id?: string
          locked?: boolean
          locked_at?: string | null
          nature_of_defect?: string | null
          plant_name?: string | null
          prcn?: string | null
          prcn_received?: boolean
          prcn_sent_on?: string | null
          received_replacement_stock_on?: string | null
          seal_condition?: Database["public"]["Enums"]["defect_seal_condition"]
          sent_to_plant_on?: string | null
          source?: Database["public"]["Enums"]["defect_source"]
          sr_no?: number
          tt_no?: string | null
          updated_at?: string
        }
        Update: {
          batch_no?: string | null
          consumer_contact?: string | null
          consumer_id?: string | null
          consumer_name?: string | null
          consumer_no?: string | null
          created_at?: string
          cylinder_dpr_sr_no?: string | null
          cylinder_dpr_type_id?: string | null
          date_of_identification?: string
          distributor_signature?: string | null
          driver_consumer_signature?: string | null
          filled_by?: string | null
          id?: string
          locked?: boolean
          locked_at?: string | null
          nature_of_defect?: string | null
          plant_name?: string | null
          prcn?: string | null
          prcn_received?: boolean
          prcn_sent_on?: string | null
          received_replacement_stock_on?: string | null
          seal_condition?: Database["public"]["Enums"]["defect_seal_condition"]
          sent_to_plant_on?: string | null
          source?: Database["public"]["Enums"]["defect_source"]
          sr_no?: number
          tt_no?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "defective_entries_consumer_id_fkey"
            columns: ["consumer_id"]
            isOneToOne: false
            referencedRelation: "consumers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "defective_entries_cylinder_dpr_type_id_fkey"
            columns: ["cylinder_dpr_type_id"]
            isOneToOne: false
            referencedRelation: "package_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "defective_entries_filled_by_fkey"
            columns: ["filled_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      distributor_otps: {
        Row: {
          code: string
          consumed_at: string | null
          created_at: string
          expires_at: string
          id: string
          phone_number: string
        }
        Insert: {
          code: string
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          phone_number: string
        }
        Update: {
          code?: string
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          phone_number?: string
        }
        Relationships: []
      }
      distributor_settings: {
        Row: {
          agency_id: string
          agency_name: string
          created_at: string
          id: string
          password: string
          phone_number: string
          singleton: boolean
        }
        Insert: {
          agency_id: string
          agency_name?: string
          created_at?: string
          id?: string
          password: string
          phone_number: string
          singleton?: boolean
        }
        Update: {
          agency_id?: string
          agency_name?: string
          created_at?: string
          id?: string
          password?: string
          phone_number?: string
          singleton?: boolean
        }
        Relationships: []
      }
      installation_arb_entries: {
        Row: {
          apron: boolean
          consumer_id: string | null
          consumer_name: string | null
          consumer_no: string | null
          created_at: string
          customer_sign: string | null
          distributor_sign: string | null
          entry_date: string
          filled_by: string | null
          id: string
          installation_date: string | null
          lighter: boolean
          locked: boolean
          locked_at: string | null
          mobile_no: string | null
          other_arb: string | null
          sr_no: number
          sv_date: string | null
          total_bill_amount: number
          total_receipt_amount: number
          trolley: boolean
          type_of_stove_sold: string | null
          updated_at: string
        }
        Insert: {
          apron?: boolean
          consumer_id?: string | null
          consumer_name?: string | null
          consumer_no?: string | null
          created_at?: string
          customer_sign?: string | null
          distributor_sign?: string | null
          entry_date?: string
          filled_by?: string | null
          id?: string
          installation_date?: string | null
          lighter?: boolean
          locked?: boolean
          locked_at?: string | null
          mobile_no?: string | null
          other_arb?: string | null
          sr_no?: number
          sv_date?: string | null
          total_bill_amount?: number
          total_receipt_amount?: number
          trolley?: boolean
          type_of_stove_sold?: string | null
          updated_at?: string
        }
        Update: {
          apron?: boolean
          consumer_id?: string | null
          consumer_name?: string | null
          consumer_no?: string | null
          created_at?: string
          customer_sign?: string | null
          distributor_sign?: string | null
          entry_date?: string
          filled_by?: string | null
          id?: string
          installation_date?: string | null
          lighter?: boolean
          locked?: boolean
          locked_at?: string | null
          mobile_no?: string | null
          other_arb?: string | null
          sr_no?: number
          sv_date?: string | null
          total_bill_amount?: number
          total_receipt_amount?: number
          trolley?: boolean
          type_of_stove_sold?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "installation_arb_entries_consumer_id_fkey"
            columns: ["consumer_id"]
            isOneToOne: false
            referencedRelation: "consumers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installation_arb_entries_filled_by_fkey"
            columns: ["filled_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      package_codes: {
        Row: {
          active: boolean
          code: string
          created_at: string
          id: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          id?: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          id?: string
          sort_order?: number
        }
        Relationships: []
      }
      sales_batches: {
        Row: {
          batch_date: string
          booklet_page_photo_ref: string | null
          created_at: string
          id: string
          issued_by: string | null
          locked: boolean
          locked_at: string | null
          updated_at: string
        }
        Insert: {
          batch_date?: string
          booklet_page_photo_ref?: string | null
          created_at?: string
          id?: string
          issued_by?: string | null
          locked?: boolean
          locked_at?: string | null
          updated_at?: string
        }
        Update: {
          batch_date?: string
          booklet_page_photo_ref?: string | null
          created_at?: string
          id?: string
          issued_by?: string | null
          locked?: boolean
          locked_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_batches_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_entries: {
        Row: {
          amount_charged: number
          batch_id: string
          cash_memo_no: number
          consumer_id: string | null
          consumer_name: string | null
          consumer_no: string | null
          created_at: string
          id: string
          issued_by: string | null
          item: Database["public"]["Enums"]["sale_item"]
          payment_mode: Database["public"]["Enums"]["payment_mode"]
          pdc_done: boolean
          quantity: number
          rate: number
          sale_date: string
          updated_at: string
        }
        Insert: {
          amount_charged?: number
          batch_id: string
          cash_memo_no?: number
          consumer_id?: string | null
          consumer_name?: string | null
          consumer_no?: string | null
          created_at?: string
          id?: string
          issued_by?: string | null
          item?: Database["public"]["Enums"]["sale_item"]
          payment_mode?: Database["public"]["Enums"]["payment_mode"]
          pdc_done?: boolean
          quantity?: number
          rate?: number
          sale_date?: string
          updated_at?: string
        }
        Update: {
          amount_charged?: number
          batch_id?: string
          cash_memo_no?: number
          consumer_id?: string | null
          consumer_name?: string | null
          consumer_no?: string | null
          created_at?: string
          id?: string
          issued_by?: string | null
          item?: Database["public"]["Enums"]["sale_item"]
          payment_mode?: Database["public"]["Enums"]["payment_mode"]
          pdc_done?: boolean
          quantity?: number
          rate?: number
          sale_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_entries_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "sales_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_entries_consumer_id_fkey"
            columns: ["consumer_id"]
            isOneToOne: false
            referencedRelation: "consumers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_entries_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      sqc_entries: {
        Row: {
          coming_from: string | null
          created_at: string
          filled_by: string | null
          godown_keeper_signature: string | null
          id: string
          invoice_date: string | null
          invoice_no: string
          locked: boolean
          locked_at: string | null
          proprietor_partner_signature: string | null
          received_date: string
          total_cylinders: number
          transporter: string | null
          truck_no: string | null
          updated_at: string
        }
        Insert: {
          coming_from?: string | null
          created_at?: string
          filled_by?: string | null
          godown_keeper_signature?: string | null
          id?: string
          invoice_date?: string | null
          invoice_no: string
          locked?: boolean
          locked_at?: string | null
          proprietor_partner_signature?: string | null
          received_date?: string
          total_cylinders?: number
          transporter?: string | null
          truck_no?: string | null
          updated_at?: string
        }
        Update: {
          coming_from?: string | null
          created_at?: string
          filled_by?: string | null
          godown_keeper_signature?: string | null
          id?: string
          invoice_date?: string | null
          invoice_no?: string
          locked?: boolean
          locked_at?: string | null
          proprietor_partner_signature?: string | null
          received_date?: string
          total_cylinders?: number
          transporter?: string | null
          truck_no?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sqc_entries_filled_by_fkey"
            columns: ["filled_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      sqc_line_items: {
        Row: {
          created_at: string
          cylinder_type_id: string | null
          dpt_date: string | null
          gross_weight: number
          id: string
          leaky_body_bung: Database["public"]["Enums"]["leaky_location"]
          observed_weight: number
          remarks: string | null
          s_no: number
          sealing_condition: Database["public"]["Enums"]["sealing_condition"]
          sqc_entry_id: string
          tare_weight: number
          updated_at: string
          variation: number
        }
        Insert: {
          created_at?: string
          cylinder_type_id?: string | null
          dpt_date?: string | null
          gross_weight?: number
          id?: string
          leaky_body_bung?: Database["public"]["Enums"]["leaky_location"]
          observed_weight?: number
          remarks?: string | null
          s_no: number
          sealing_condition?: Database["public"]["Enums"]["sealing_condition"]
          sqc_entry_id: string
          tare_weight?: number
          updated_at?: string
          variation?: number
        }
        Update: {
          created_at?: string
          cylinder_type_id?: string | null
          dpt_date?: string | null
          gross_weight?: number
          id?: string
          leaky_body_bung?: Database["public"]["Enums"]["leaky_location"]
          observed_weight?: number
          remarks?: string | null
          s_no?: number
          sealing_condition?: Database["public"]["Enums"]["sealing_condition"]
          sqc_entry_id?: string
          tare_weight?: number
          updated_at?: string
          variation?: number
        }
        Relationships: [
          {
            foreignKeyName: "sqc_line_items_cylinder_type_id_fkey"
            columns: ["cylinder_type_id"]
            isOneToOne: false
            referencedRelation: "package_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sqc_line_items_sqc_entry_id_fkey"
            columns: ["sqc_entry_id"]
            isOneToOne: false
            referencedRelation: "sqc_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          role: Database["public"]["Enums"]["staff_role"]
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          role: Database["public"]["Enums"]["staff_role"]
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          role?: Database["public"]["Enums"]["staff_role"]
        }
        Relationships: []
      }
      stock_entries: {
        Row: {
          closing_defective_empty: number
          closing_defective_filled: number
          closing_good_empty: number
          closing_good_filled: number
          created_at: string
          defective_item_returned_to_plant: number
          filled_by: string | null
          id: string
          locked: boolean
          locked_at: string | null
          newly_identified_defective: number
          opening_defective_empty: number
          opening_defective_filled: number
          opening_good_empty: number
          opening_good_filled: number
          package_code_id: string
          received_from_consumer_against_tv: number
          received_from_consumer_refill: number
          received_from_plant: number
          refill_sale: number
          returned_to_plant: number
          stock_date: string
          sv_additional_issues: number
          sv_new_issues: number
          sv_reconnection_issues: number
          updated_at: string
        }
        Insert: {
          closing_defective_empty?: number
          closing_defective_filled?: number
          closing_good_empty?: number
          closing_good_filled?: number
          created_at?: string
          defective_item_returned_to_plant?: number
          filled_by?: string | null
          id?: string
          locked?: boolean
          locked_at?: string | null
          newly_identified_defective?: number
          opening_defective_empty?: number
          opening_defective_filled?: number
          opening_good_empty?: number
          opening_good_filled?: number
          package_code_id: string
          received_from_consumer_against_tv?: number
          received_from_consumer_refill?: number
          received_from_plant?: number
          refill_sale?: number
          returned_to_plant?: number
          stock_date: string
          sv_additional_issues?: number
          sv_new_issues?: number
          sv_reconnection_issues?: number
          updated_at?: string
        }
        Update: {
          closing_defective_empty?: number
          closing_defective_filled?: number
          closing_good_empty?: number
          closing_good_filled?: number
          created_at?: string
          defective_item_returned_to_plant?: number
          filled_by?: string | null
          id?: string
          locked?: boolean
          locked_at?: string | null
          newly_identified_defective?: number
          opening_defective_empty?: number
          opening_defective_filled?: number
          opening_good_empty?: number
          opening_good_filled?: number
          package_code_id?: string
          received_from_consumer_against_tv?: number
          received_from_consumer_refill?: number
          received_from_plant?: number
          refill_sale?: number
          returned_to_plant?: number
          stock_date?: string
          sv_additional_issues?: number
          sv_new_issues?: number
          sv_reconnection_issues?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_entries_filled_by_fkey"
            columns: ["filled_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_entries_package_code_id_fkey"
            columns: ["package_code_id"]
            isOneToOne: false
            referencedRelation: "package_codes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      connection_sv_type: "New" | "Reconnection" | "Additional" | "TV"
      consumer_scheme: "Regular" | "PMUY" | "Extended PMUY" | "PMUY-2"
      defect_seal_condition: "OK" | "Damaged" | "N/A"
      defect_source: "Truck" | "Consumer"
      leaky_location: "None" | "Body" | "Bung"
      payment_mode: "Cash" | "UPI" | "Card"
      sale_item: "Refill" | "ARB-Other"
      sealing_condition: "OK" | "Damaged"
      staff_role: "godown" | "computer_staff" | "distributor"
      tv_retrieval_state: "Filled" | "Empty" | "N/A"
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
      connection_sv_type: ["New", "Reconnection", "Additional", "TV"],
      consumer_scheme: ["Regular", "PMUY", "Extended PMUY", "PMUY-2"],
      defect_seal_condition: ["OK", "Damaged", "N/A"],
      defect_source: ["Truck", "Consumer"],
      leaky_location: ["None", "Body", "Bung"],
      payment_mode: ["Cash", "UPI", "Card"],
      sale_item: ["Refill", "ARB-Other"],
      sealing_condition: ["OK", "Damaged"],
      staff_role: ["godown", "computer_staff", "distributor"],
      tv_retrieval_state: ["Filled", "Empty", "N/A"],
    },
  },
} as const
