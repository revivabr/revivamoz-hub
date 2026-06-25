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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_provedores: {
        Row: {
          api_key: string
          base_url: string | null
          default_model: string
          enabled: boolean
          provedor: Database["public"]["Enums"]["ai_provedor_tipo"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          api_key: string
          base_url?: string | null
          default_model: string
          enabled?: boolean
          provedor: Database["public"]["Enums"]["ai_provedor_tipo"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          api_key?: string
          base_url?: string | null
          default_model?: string
          enabled?: boolean
          provedor?: Database["public"]["Enums"]["ai_provedor_tipo"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      assistente_conversas: {
        Row: {
          created_at: string
          id: string
          mensagens: Json
          titulo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mensagens?: Json
          titulo?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mensagens?: Json
          titulo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          actor_email: string | null
          actor_id: string | null
          created_at: string
          id: string
          new_data: Json | null
          old_data: Json | null
          operation: string
          projeto_id: string | null
          record_id: string | null
          table_name: string
        }
        Insert: {
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation: string
          projeto_id?: string | null
          record_id?: string | null
          table_name: string
        }
        Update: {
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation?: string
          projeto_id?: string | null
          record_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      backup_runs: {
        Row: {
          created_at: string
          error: string | null
          file_path: string | null
          finished_at: string | null
          id: string
          lancamentos_count: number | null
          projetos_count: number | null
          size_bytes: number | null
          started_at: string
          status: string
          trigger: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          file_path?: string | null
          finished_at?: string | null
          id?: string
          lancamentos_count?: number | null
          projetos_count?: number | null
          size_bytes?: number | null
          started_at?: string
          status?: string
          trigger?: string
        }
        Update: {
          created_at?: string
          error?: string | null
          file_path?: string | null
          finished_at?: string | null
          id?: string
          lancamentos_count?: number | null
          projetos_count?: number | null
          size_bytes?: number | null
          started_at?: string
          status?: string
          trigger?: string
        }
        Relationships: []
      }
      categorias: {
        Row: {
          cor: string | null
          created_at: string
          icone: string | null
          id: string
          nome: string
          projeto_id: string | null
          tipo: Database["public"]["Enums"]["lancamento_tipo"]
          updated_at: string
        }
        Insert: {
          cor?: string | null
          created_at?: string
          icone?: string | null
          id?: string
          nome: string
          projeto_id?: string | null
          tipo: Database["public"]["Enums"]["lancamento_tipo"]
          updated_at?: string
        }
        Update: {
          cor?: string | null
          created_at?: string
          icone?: string | null
          id?: string
          nome?: string
          projeto_id?: string | null
          tipo?: Database["public"]["Enums"]["lancamento_tipo"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categorias_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
        ]
      }
      etapas: {
        Row: {
          created_at: string
          data_fim: string | null
          data_inicio: string | null
          descricao: string | null
          id: string
          nome: string
          ordem: number
          peso: number
          progresso: number
          projeto_id: string
          updated_at: string
          valor_previsto: number
        }
        Insert: {
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          descricao?: string | null
          id?: string
          nome: string
          ordem?: number
          peso?: number
          progresso?: number
          projeto_id: string
          updated_at?: string
          valor_previsto?: number
        }
        Update: {
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          ordem?: number
          peso?: number
          progresso?: number
          projeto_id?: string
          updated_at?: string
          valor_previsto?: number
        }
        Relationships: [
          {
            foreignKeyName: "etapas_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
        ]
      }
      lancamentos: {
        Row: {
          categoria_id: string | null
          comprovante_path: string | null
          created_at: string
          created_by: string
          data: string
          descricao: string | null
          etapa_id: string | null
          id: string
          projeto_id: string
          tipo: Database["public"]["Enums"]["lancamento_tipo"]
          updated_at: string
          valor: number
        }
        Insert: {
          categoria_id?: string | null
          comprovante_path?: string | null
          created_at?: string
          created_by: string
          data?: string
          descricao?: string | null
          etapa_id?: string | null
          id?: string
          projeto_id: string
          tipo: Database["public"]["Enums"]["lancamento_tipo"]
          updated_at?: string
          valor: number
        }
        Update: {
          categoria_id?: string | null
          comprovante_path?: string | null
          created_at?: string
          created_by?: string
          data?: string
          descricao?: string | null
          etapa_id?: string | null
          id?: string
          projeto_id?: string
          tipo?: Database["public"]["Enums"]["lancamento_tipo"]
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "lancamentos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_etapa_id_fkey"
            columns: ["etapa_id"]
            isOneToOne: false
            referencedRelation: "etapas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
        ]
      }
      notificacoes: {
        Row: {
          created_at: string
          email_enviado: boolean
          id: string
          lida: boolean
          link: string | null
          mensagem: string
          tipo: string
          titulo: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_enviado?: boolean
          id?: string
          lida?: boolean
          link?: string | null
          mensagem: string
          tipo?: string
          titulo: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_enviado?: boolean
          id?: string
          lida?: boolean
          link?: string | null
          mensagem?: string
          tipo?: string
          titulo?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          language: string
          phone: string | null
          position: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          language?: string
          phone?: string | null
          position?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          language?: string
          phone?: string | null
          position?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      projeto_convites: {
        Row: {
          accepted_at: string | null
          convidado_por: string
          created_at: string
          email: string
          estado: Database["public"]["Enums"]["convite_estado"]
          id: string
          papel: Database["public"]["Enums"]["projeto_papel"]
          projeto_id: string
        }
        Insert: {
          accepted_at?: string | null
          convidado_por: string
          created_at?: string
          email: string
          estado?: Database["public"]["Enums"]["convite_estado"]
          id?: string
          papel?: Database["public"]["Enums"]["projeto_papel"]
          projeto_id: string
        }
        Update: {
          accepted_at?: string | null
          convidado_por?: string
          created_at?: string
          email?: string
          estado?: Database["public"]["Enums"]["convite_estado"]
          id?: string
          papel?: Database["public"]["Enums"]["projeto_papel"]
          projeto_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projeto_convites_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
        ]
      }
      projeto_membros: {
        Row: {
          created_at: string
          id: string
          papel: Database["public"]["Enums"]["projeto_papel"]
          projeto_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          papel?: Database["public"]["Enums"]["projeto_papel"]
          projeto_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          papel?: Database["public"]["Enums"]["projeto_papel"]
          projeto_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projeto_membros_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
        ]
      }
      projetos: {
        Row: {
          created_at: string
          created_by: string
          data_fim: string | null
          data_inicio: string | null
          descricao: string | null
          estado: Database["public"]["Enums"]["projeto_estado"]
          id: string
          logo_path: string | null
          moeda: string
          nome: string
          orcamento: number
          tipo: Database["public"]["Enums"]["projeto_tipo"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          data_fim?: string | null
          data_inicio?: string | null
          descricao?: string | null
          estado?: Database["public"]["Enums"]["projeto_estado"]
          id?: string
          logo_path?: string | null
          moeda?: string
          nome: string
          orcamento?: number
          tipo?: Database["public"]["Enums"]["projeto_tipo"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          data_fim?: string | null
          data_inicio?: string | null
          descricao?: string | null
          estado?: Database["public"]["Enums"]["projeto_estado"]
          id?: string
          logo_path?: string | null
          moeda?: string
          nome?: string
          orcamento?: number
          tipo?: Database["public"]["Enums"]["projeto_tipo"]
          updated_at?: string
        }
        Relationships: []
      }
      relatorio_partilhas: {
        Row: {
          created_at: string
          created_by: string
          data_fim: string
          data_inicio: string
          expires_at: string
          id: string
          projeto_id: string
          revoked: boolean
          token: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          data_fim: string
          data_inicio: string
          expires_at: string
          id?: string
          projeto_id: string
          revoked?: boolean
          token?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          data_fim?: string
          data_inicio?: string
          expires_at?: string
          id?: string
          projeto_id?: string
          revoked?: boolean
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "relatorio_partilhas_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
        ]
      }
      super_admin_seed: {
        Row: {
          created_at: string
          email: string
        }
        Insert: {
          created_at?: string
          email: string
        }
        Update: {
          created_at?: string
          email?: string
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
      accept_projeto_convite: { Args: { _convite_id: string }; Returns: string }
      get_relatorio_publico: { Args: { _token: string }; Returns: Json }
      grant_super_admin_by_email: { Args: { _email: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_projeto_gestor: {
        Args: { _projeto_id: string; _user_id: string }
        Returns: boolean
      }
      is_projeto_member: {
        Args: { _projeto_id: string; _user_id: string }
        Returns: boolean
      }
      list_ai_provedores_publico: {
        Args: never
        Returns: {
          default_model: string
          enabled: boolean
          provedor: Database["public"]["Enums"]["ai_provedor_tipo"]
        }[]
      }
      list_super_admins: {
        Args: never
        Returns: {
          email: string
          status: string
        }[]
      }
      revoke_super_admin_by_email: { Args: { _email: string }; Returns: string }
    }
    Enums: {
      ai_provedor_tipo: "openai" | "gemini" | "opencode_go"
      app_role: "super_admin" | "gestor" | "financiador"
      convite_estado: "pendente" | "aceite" | "revogado"
      lancamento_tipo: "entrada" | "saida"
      projeto_estado:
        | "planeado"
        | "ativo"
        | "pausado"
        | "concluido"
        | "cancelado"
      projeto_papel: "gestor" | "financiador" | "leitor"
      projeto_tipo:
        | "programa_social"
        | "projeto_sazonal"
        | "caixa_administrativo"
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
      ai_provedor_tipo: ["openai", "gemini", "opencode_go"],
      app_role: ["super_admin", "gestor", "financiador"],
      convite_estado: ["pendente", "aceite", "revogado"],
      lancamento_tipo: ["entrada", "saida"],
      projeto_estado: [
        "planeado",
        "ativo",
        "pausado",
        "concluido",
        "cancelado",
      ],
      projeto_papel: ["gestor", "financiador", "leitor"],
      projeto_tipo: [
        "programa_social",
        "projeto_sazonal",
        "caixa_administrativo",
      ],
    },
  },
} as const
