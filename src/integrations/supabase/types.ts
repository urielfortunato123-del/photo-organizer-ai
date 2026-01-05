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
      obras_aprendizado: {
        Row: {
          aplicado: boolean | null
          created_at: string
          id: string
          identificacao_correta: string
          identificacao_errada: string | null
          obra_id: string | null
          texto_ocr: string
          user_id: string | null
        }
        Insert: {
          aplicado?: boolean | null
          created_at?: string
          id?: string
          identificacao_correta: string
          identificacao_errada?: string | null
          obra_id?: string | null
          texto_ocr: string
          user_id?: string | null
        }
        Update: {
          aplicado?: boolean | null
          created_at?: string
          id?: string
          identificacao_correta?: string
          identificacao_errada?: string | null
          obra_id?: string | null
          texto_ocr?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "obras_aprendizado_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras_conhecimento"
            referencedColumns: ["id"]
          },
        ]
      }
      obras_conhecimento: {
        Row: {
          ativo: boolean | null
          codigo_normalizado: string
          confianca: number | null
          contratada: string | null
          contrato: string | null
          created_at: string
          created_by: string | null
          descricao: string | null
          especificacoes: Json | null
          id: string
          km_fim: number | null
          km_inicio: number | null
          latitude: number | null
          longitude: number | null
          nome_exibicao: string
          origem: string | null
          rodovia: string | null
          sentido: string | null
          tipo: string
          updated_at: string
          variacoes: string[]
          vezes_identificado: number | null
        }
        Insert: {
          ativo?: boolean | null
          codigo_normalizado: string
          confianca?: number | null
          contratada?: string | null
          contrato?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          especificacoes?: Json | null
          id?: string
          km_fim?: number | null
          km_inicio?: number | null
          latitude?: number | null
          longitude?: number | null
          nome_exibicao: string
          origem?: string | null
          rodovia?: string | null
          sentido?: string | null
          tipo: string
          updated_at?: string
          variacoes?: string[]
          vezes_identificado?: number | null
        }
        Update: {
          ativo?: boolean | null
          codigo_normalizado?: string
          confianca?: number | null
          contratada?: string | null
          contrato?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          especificacoes?: Json | null
          id?: string
          km_fim?: number | null
          km_inicio?: number | null
          latitude?: number | null
          longitude?: number | null
          nome_exibicao?: string
          origem?: string | null
          rodovia?: string | null
          sentido?: string | null
          tipo?: string
          updated_at?: string
          variacoes?: string[]
          vezes_identificado?: number | null
        }
        Relationships: []
      }
      obras_documentacao: {
        Row: {
          conteudo: string
          created_at: string
          fonte: string | null
          id: string
          idioma: string | null
          obra_id: string | null
          tipo: string | null
          titulo: string
          updated_at: string
        }
        Insert: {
          conteudo: string
          created_at?: string
          fonte?: string | null
          id?: string
          idioma?: string | null
          obra_id?: string | null
          tipo?: string | null
          titulo: string
          updated_at?: string
        }
        Update: {
          conteudo?: string
          created_at?: string
          fonte?: string | null
          id?: string
          idioma?: string | null
          obra_id?: string | null
          tipo?: string | null
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "obras_documentacao_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras_conhecimento"
            referencedColumns: ["id"]
          },
        ]
      }
      obras_sinonimos: {
        Row: {
          categoria: string
          created_at: string
          id: string
          idioma: string | null
          termo_normalizado: string
          termo_original: string
        }
        Insert: {
          categoria: string
          created_at?: string
          id?: string
          idioma?: string | null
          termo_normalizado: string
          termo_original: string
        }
        Update: {
          categoria?: string
          created_at?: string
          id?: string
          idioma?: string | null
          termo_normalizado?: string
          termo_original?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          empresa: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          empresa?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          empresa?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      trial_sessions: {
        Row: {
          created_at: string
          id: string
          last_session_date: string
          session_count_today: number
          session_count_week: number
          session_start: string
          user_id: string
          week_start_date: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_session_date?: string
          session_count_today?: number
          session_count_week?: number
          session_start?: string
          user_id: string
          week_start_date?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_session_date?: string
          session_count_today?: number
          session_count_week?: number
          session_start?: string
          user_id?: string
          week_start_date?: string
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
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
