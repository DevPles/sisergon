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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      action_plans: {
        Row: {
          action: string
          assessment_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          due_date: string | null
          empresa_id: string
          id: string
          origin: string | null
          priority: string | null
          responsible: string | null
          status: string
          updated_at: string
        }
        Insert: {
          action: string
          assessment_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          empresa_id: string
          id?: string
          origin?: string | null
          priority?: string | null
          responsible?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          action?: string
          assessment_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          empresa_id?: string
          id?: string
          origin?: string | null
          priority?: string | null
          responsible?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "action_plans_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_plans_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_items: {
        Row: {
          assessment_id: string
          comment: string | null
          created_at: string
          domain: string | null
          id: string
          question_number: number | null
          question_text: string | null
          value: number | null
        }
        Insert: {
          assessment_id: string
          comment?: string | null
          created_at?: string
          domain?: string | null
          id?: string
          question_number?: number | null
          question_text?: string | null
          value?: number | null
        }
        Update: {
          assessment_id?: string
          comment?: string | null
          created_at?: string
          domain?: string | null
          id?: string
          question_number?: number | null
          question_text?: string | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_items_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      assessments: {
        Row: {
          cargo_id: string | null
          colaborador_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          empresa_id: string
          evaluator_id: string | null
          finalized_at: string | null
          id: string
          needs_aet: boolean | null
          risk_classification: string | null
          score_total: number | null
          setor_id: string | null
          status: string
          title: string
          type: string
          unidade_id: string | null
          updated_at: string
          version: number | null
        }
        Insert: {
          cargo_id?: string | null
          colaborador_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          empresa_id: string
          evaluator_id?: string | null
          finalized_at?: string | null
          id?: string
          needs_aet?: boolean | null
          risk_classification?: string | null
          score_total?: number | null
          setor_id?: string | null
          status?: string
          title: string
          type: string
          unidade_id?: string | null
          updated_at?: string
          version?: number | null
        }
        Update: {
          cargo_id?: string | null
          colaborador_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          empresa_id?: string
          evaluator_id?: string | null
          finalized_at?: string | null
          id?: string
          needs_aet?: boolean | null
          risk_classification?: string | null
          score_total?: number | null
          setor_id?: string | null
          status?: string
          title?: string
          type?: string
          unidade_id?: string | null
          updated_at?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assessments_cargo_id_fkey"
            columns: ["cargo_id"]
            isOneToOne: false
            referencedRelation: "cargos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      atestados: {
        Row: {
          arquivo_url: string | null
          cid: string | null
          colaborador_id: string
          created_at: string
          created_by: string | null
          crm: string | null
          data_fim: string | null
          data_inicio: string
          dias: number | null
          empresa_id: string
          id: string
          medico: string | null
          observacoes: string | null
          status: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          arquivo_url?: string | null
          cid?: string | null
          colaborador_id: string
          created_at?: string
          created_by?: string | null
          crm?: string | null
          data_fim?: string | null
          data_inicio: string
          dias?: number | null
          empresa_id: string
          id?: string
          medico?: string | null
          observacoes?: string | null
          status?: string | null
          tipo?: string
          updated_at?: string
        }
        Update: {
          arquivo_url?: string | null
          cid?: string | null
          colaborador_id?: string
          created_at?: string
          created_by?: string | null
          crm?: string | null
          data_fim?: string | null
          data_inicio?: string
          dias?: number | null
          empresa_id?: string
          id?: string
          medico?: string | null
          observacoes?: string | null
          status?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "atestados_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atestados_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity: string | null
          entity_id: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity?: string | null
          entity_id?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity?: string | null
          entity_id?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      cargos: {
        Row: {
          ativo: boolean | null
          cbo: string | null
          created_at: string
          empresa_id: string
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean | null
          cbo?: string | null
          created_at?: string
          empresa_id: string
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean | null
          cbo?: string | null
          created_at?: string
          empresa_id?: string
          id?: string
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "cargos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      checklists: {
        Row: {
          colaborador_id: string | null
          confirmed_at: string | null
          created_at: string
          empresa_id: string
          filled_by: string | null
          id: string
          month: number | null
          observations: string | null
          responses: Json | null
          score: number | null
          year: number | null
        }
        Insert: {
          colaborador_id?: string | null
          confirmed_at?: string | null
          created_at?: string
          empresa_id: string
          filled_by?: string | null
          id?: string
          month?: number | null
          observations?: string | null
          responses?: Json | null
          score?: number | null
          year?: number | null
        }
        Update: {
          colaborador_id?: string | null
          confirmed_at?: string | null
          created_at?: string
          empresa_id?: string
          filled_by?: string | null
          id?: string
          month?: number | null
          observations?: string | null
          responses?: Json | null
          score?: number | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "checklists_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklists_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      colaboradores: {
        Row: {
          cargo_id: string | null
          cpf: string | null
          created_at: string
          created_by: string | null
          data_admissao: string | null
          data_nascimento: string | null
          empresa_id: string
          gestor_responsavel: string | null
          id: string
          jornada: string | null
          matricula: string | null
          nome_completo: string
          setor_id: string | null
          sexo: string | null
          status: string
          turno: string | null
          unidade_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          cargo_id?: string | null
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          data_admissao?: string | null
          data_nascimento?: string | null
          empresa_id: string
          gestor_responsavel?: string | null
          id?: string
          jornada?: string | null
          matricula?: string | null
          nome_completo: string
          setor_id?: string | null
          sexo?: string | null
          status?: string
          turno?: string | null
          unidade_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          cargo_id?: string | null
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          data_admissao?: string | null
          data_nascimento?: string | null
          empresa_id?: string
          gestor_responsavel?: string | null
          id?: string
          jornada?: string | null
          matricula?: string | null
          nome_completo?: string
          setor_id?: string | null
          sexo?: string | null
          status?: string
          turno?: string | null
          unidade_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "colaboradores_cargo_id_fkey"
            columns: ["cargo_id"]
            isOneToOne: false
            referencedRelation: "cargos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "colaboradores_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "colaboradores_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "colaboradores_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      company_templates: {
        Row: {
          ativo: boolean | null
          conteudo: Json | null
          created_at: string
          created_by: string | null
          empresa_id: string
          id: string
          nome: string
          tipo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean | null
          conteudo?: Json | null
          created_at?: string
          created_by?: string | null
          empresa_id: string
          id?: string
          nome: string
          tipo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean | null
          conteudo?: Json | null
          created_at?: string
          created_by?: string | null
          empresa_id?: string
          id?: string
          nome?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_templates_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      consultor_empresas: {
        Row: {
          ativo: boolean | null
          created_at: string
          empresa_id: string
          id: string
          nivel_atuacao: string | null
          user_id: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string
          empresa_id: string
          id?: string
          nivel_atuacao?: string | null
          user_id: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string
          empresa_id?: string
          id?: string
          nivel_atuacao?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultor_empresas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      contratos: {
        Row: {
          created_at: string
          data_fim: string | null
          data_inicio: string | null
          empresa_id: string
          id: string
          plano_id: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          empresa_id: string
          id?: string
          plano_id?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          empresa_id?: string
          id?: string
          plano_id?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contratos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_plano_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "planos"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos: {
        Row: {
          arquivo_nome: string | null
          arquivo_url: string | null
          created_at: string
          created_by: string | null
          descricao: string | null
          empresa_id: string
          id: string
          status: string | null
          tags: string[] | null
          tamanho: number | null
          tipo: string
          titulo: string
          updated_at: string
          validade: string | null
        }
        Insert: {
          arquivo_nome?: string | null
          arquivo_url?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          empresa_id: string
          id?: string
          status?: string | null
          tags?: string[] | null
          tamanho?: number | null
          tipo: string
          titulo: string
          updated_at?: string
          validade?: string | null
        }
        Update: {
          arquivo_nome?: string | null
          arquivo_url?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          empresa_id?: string
          id?: string
          status?: string | null
          tags?: string[] | null
          tamanho?: number | null
          tipo?: string
          titulo?: string
          updated_at?: string
          validade?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documentos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_test_results: {
        Row: {
          colaborador_id: string | null
          created_at: string
          created_by: string | null
          data_teste: string | null
          empresa_id: string
          id: string
          observacoes: string | null
          resultado: string | null
          tipo: string
        }
        Insert: {
          colaborador_id?: string | null
          created_at?: string
          created_by?: string | null
          data_teste?: string | null
          empresa_id: string
          id?: string
          observacoes?: string | null
          resultado?: string | null
          tipo: string
        }
        Update: {
          colaborador_id?: string | null
          created_at?: string
          created_by?: string | null
          data_teste?: string | null
          empresa_id?: string
          id?: string
          observacoes?: string | null
          resultado?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_test_results_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_test_results_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      empresa_contratos: {
        Row: {
          created_at: string
          data_fim: string | null
          data_inicio: string | null
          empresa_id: string
          id: string
          plano_id: string | null
          status: string | null
          updated_at: string
          valor: number | null
        }
        Insert: {
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          empresa_id: string
          id?: string
          plano_id?: string | null
          status?: string | null
          updated_at?: string
          valor?: number | null
        }
        Update: {
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          empresa_id?: string
          id?: string
          plano_id?: string | null
          status?: string | null
          updated_at?: string
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "empresa_contratos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empresa_contratos_plano_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "planos"
            referencedColumns: ["id"]
          },
        ]
      }
      empresa_pagamentos: {
        Row: {
          created_at: string
          data_pagamento: string | null
          data_vencimento: string | null
          descricao: string | null
          empresa_id: string
          id: string
          status: string | null
          updated_at: string
          valor: number
        }
        Insert: {
          created_at?: string
          data_pagamento?: string | null
          data_vencimento?: string | null
          descricao?: string | null
          empresa_id: string
          id?: string
          status?: string | null
          updated_at?: string
          valor: number
        }
        Update: {
          created_at?: string
          data_pagamento?: string | null
          data_vencimento?: string | null
          descricao?: string | null
          empresa_id?: string
          id?: string
          status?: string | null
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "empresa_pagamentos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas: {
        Row: {
          ativa: boolean
          cnae: string | null
          cnpj: string | null
          created_at: string
          created_by: string | null
          endereco_bairro: string | null
          endereco_cep: string | null
          endereco_cidade: string | null
          endereco_complemento: string | null
          endereco_logradouro: string | null
          endereco_numero: string | null
          endereco_uf: string | null
          grau_risco: number | null
          id: string
          logo_url: string | null
          nome_fantasia: string | null
          plano_id: string | null
          razao_social: string
          responsavel_email: string | null
          responsavel_nome: string | null
          responsavel_telefone: string | null
          status_financeiro: string | null
          updated_at: string
        }
        Insert: {
          ativa?: boolean
          cnae?: string | null
          cnpj?: string | null
          created_at?: string
          created_by?: string | null
          endereco_bairro?: string | null
          endereco_cep?: string | null
          endereco_cidade?: string | null
          endereco_complemento?: string | null
          endereco_logradouro?: string | null
          endereco_numero?: string | null
          endereco_uf?: string | null
          grau_risco?: number | null
          id?: string
          logo_url?: string | null
          nome_fantasia?: string | null
          plano_id?: string | null
          razao_social: string
          responsavel_email?: string | null
          responsavel_nome?: string | null
          responsavel_telefone?: string | null
          status_financeiro?: string | null
          updated_at?: string
        }
        Update: {
          ativa?: boolean
          cnae?: string | null
          cnpj?: string | null
          created_at?: string
          created_by?: string | null
          endereco_bairro?: string | null
          endereco_cep?: string | null
          endereco_cidade?: string | null
          endereco_complemento?: string | null
          endereco_logradouro?: string | null
          endereco_numero?: string | null
          endereco_uf?: string | null
          grau_risco?: number | null
          id?: string
          logo_url?: string | null
          nome_fantasia?: string | null
          plano_id?: string | null
          razao_social?: string
          responsavel_email?: string | null
          responsavel_nome?: string | null
          responsavel_telefone?: string | null
          status_financeiro?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "empresas_plano_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "planos"
            referencedColumns: ["id"]
          },
        ]
      }
      faturamento: {
        Row: {
          created_at: string
          created_by: string | null
          data_pagamento: string | null
          data_vencimento: string | null
          descricao: string
          empresa_id: string
          id: string
          observacoes: string | null
          status: string | null
          tipo: string | null
          updated_at: string
          valor: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data_pagamento?: string | null
          data_vencimento?: string | null
          descricao: string
          empresa_id: string
          id?: string
          observacoes?: string | null
          status?: string | null
          tipo?: string | null
          updated_at?: string
          valor: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data_pagamento?: string | null
          data_vencimento?: string | null
          descricao?: string
          empresa_id?: string
          id?: string
          observacoes?: string | null
          status?: string | null
          tipo?: string | null
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "faturamento_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      form_templates: {
        Row: {
          ativo: boolean | null
          conteudo: Json | null
          created_at: string
          created_by: string | null
          empresa_id: string | null
          id: string
          is_global: boolean | null
          nome: string
          status: string | null
          tipo: string
          updated_at: string
          versao: number | null
        }
        Insert: {
          ativo?: boolean | null
          conteudo?: Json | null
          created_at?: string
          created_by?: string | null
          empresa_id?: string | null
          id?: string
          is_global?: boolean | null
          nome: string
          status?: string | null
          tipo: string
          updated_at?: string
          versao?: number | null
        }
        Update: {
          ativo?: boolean | null
          conteudo?: Json | null
          created_at?: string
          created_by?: string | null
          empresa_id?: string | null
          id?: string
          is_global?: boolean | null
          nome?: string
          status?: string | null
          tipo?: string
          updated_at?: string
          versao?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "form_templates_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      laudos: {
        Row: {
          arquivo_url: string | null
          conteudo: Json | null
          created_at: string
          created_by: string | null
          data_emissao: string | null
          data_validade: string | null
          descricao: string | null
          empresa_id: string
          id: string
          registro_profissional: string | null
          responsavel_tecnico: string | null
          status: string | null
          tipo: string
          titulo: string
          updated_at: string
        }
        Insert: {
          arquivo_url?: string | null
          conteudo?: Json | null
          created_at?: string
          created_by?: string | null
          data_emissao?: string | null
          data_validade?: string | null
          descricao?: string | null
          empresa_id: string
          id?: string
          registro_profissional?: string | null
          responsavel_tecnico?: string | null
          status?: string | null
          tipo: string
          titulo: string
          updated_at?: string
        }
        Update: {
          arquivo_url?: string | null
          conteudo?: Json | null
          created_at?: string
          created_by?: string | null
          data_emissao?: string | null
          data_validade?: string | null
          descricao?: string | null
          empresa_id?: string
          id?: string
          registro_profissional?: string | null
          responsavel_tecnico?: string | null
          status?: string | null
          tipo?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "laudos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_link: string | null
          company_id: string | null
          created_at: string
          description: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          priority: string
          read_at: string | null
          status: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_link?: string | null
          company_id?: string | null
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          priority?: string
          read_at?: string | null
          status?: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          action_link?: string | null
          company_id?: string | null
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          priority?: string
          read_at?: string | null
          status?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      pcmso_eventos: {
        Row: {
          aptidao: string | null
          colaborador_id: string | null
          created_at: string
          created_by: string | null
          data_prevista: string | null
          data_realizada: string | null
          empresa_id: string
          id: string
          observacoes: string | null
          programa_id: string | null
          resultado: string | null
          status: string | null
          subtipo: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          aptidao?: string | null
          colaborador_id?: string | null
          created_at?: string
          created_by?: string | null
          data_prevista?: string | null
          data_realizada?: string | null
          empresa_id: string
          id?: string
          observacoes?: string | null
          programa_id?: string | null
          resultado?: string | null
          status?: string | null
          subtipo?: string | null
          tipo?: string
          updated_at?: string
        }
        Update: {
          aptidao?: string | null
          colaborador_id?: string | null
          created_at?: string
          created_by?: string | null
          data_prevista?: string | null
          data_realizada?: string | null
          empresa_id?: string
          id?: string
          observacoes?: string | null
          programa_id?: string | null
          resultado?: string | null
          status?: string | null
          subtipo?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pcmso_eventos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pcmso_eventos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pcmso_eventos_programa_id_fkey"
            columns: ["programa_id"]
            isOneToOne: false
            referencedRelation: "pcmso_programas"
            referencedColumns: ["id"]
          },
        ]
      }
      pcmso_programas: {
        Row: {
          created_at: string
          created_by: string | null
          crm: string | null
          descricao: string | null
          empresa_id: string
          id: string
          responsavel_medico: string | null
          status: string | null
          titulo: string
          updated_at: string
          vigencia_fim: string | null
          vigencia_inicio: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          crm?: string | null
          descricao?: string | null
          empresa_id: string
          id?: string
          responsavel_medico?: string | null
          status?: string | null
          titulo: string
          updated_at?: string
          vigencia_fim?: string | null
          vigencia_inicio?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          crm?: string | null
          descricao?: string | null
          empresa_id?: string
          id?: string
          responsavel_medico?: string | null
          status?: string | null
          titulo?: string
          updated_at?: string
          vigencia_fim?: string | null
          vigencia_inicio?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pcmso_programas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      planos: {
        Row: {
          ativo: boolean | null
          created_at: string
          descricao: string | null
          id: string
          limite_avaliacoes: number | null
          limite_colaboradores: number | null
          limite_usuarios: number | null
          nome: string
          preco: number | null
          recursos: Json | null
          valor_mensal: number | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string
          descricao?: string | null
          id?: string
          limite_avaliacoes?: number | null
          limite_colaboradores?: number | null
          limite_usuarios?: number | null
          nome: string
          preco?: number | null
          recursos?: Json | null
          valor_mensal?: number | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string
          descricao?: string | null
          id?: string
          limite_avaliacoes?: number | null
          limite_colaboradores?: number | null
          limite_usuarios?: number | null
          nome?: string
          preco?: number | null
          recursos?: Json | null
          valor_mensal?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          empresa_id: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          empresa_id?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          empresa_id?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      riscos_psicossociais: {
        Row: {
          colaborador_id: string | null
          created_at: string
          created_by: string | null
          descricao: string | null
          empresa_id: string
          id: string
          medidas_controle: string | null
          nivel_risco: string | null
          prazo: string | null
          responsavel: string | null
          setor_id: string | null
          status: string | null
          tipo_risco: string
          updated_at: string
        }
        Insert: {
          colaborador_id?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          empresa_id: string
          id?: string
          medidas_controle?: string | null
          nivel_risco?: string | null
          prazo?: string | null
          responsavel?: string | null
          setor_id?: string | null
          status?: string | null
          tipo_risco: string
          updated_at?: string
        }
        Update: {
          colaborador_id?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          empresa_id?: string
          id?: string
          medidas_controle?: string | null
          nivel_risco?: string | null
          prazo?: string | null
          responsavel?: string | null
          setor_id?: string | null
          status?: string | null
          tipo_risco?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "riscos_psicossociais_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "riscos_psicossociais_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "riscos_psicossociais_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_events: {
        Row: {
          created_at: string
          date: string | null
          description: string | null
          empresa_id: string | null
          id: string
          severity: string | null
          type: string | null
        }
        Insert: {
          created_at?: string
          date?: string | null
          description?: string | null
          empresa_id?: string | null
          id?: string
          severity?: string | null
          type?: string | null
        }
        Update: {
          created_at?: string
          date?: string | null
          description?: string | null
          empresa_id?: string | null
          id?: string
          severity?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "risk_events_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      setores: {
        Row: {
          ativo: boolean | null
          created_at: string
          descricao: string | null
          empresa_id: string
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string
          descricao?: string | null
          empresa_id: string
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string
          descricao?: string | null
          empresa_id?: string
          id?: string
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "setores_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      test_templates: {
        Row: {
          ativo: boolean | null
          conteudo: Json | null
          created_at: string
          created_by: string | null
          empresa_id: string | null
          id: string
          is_global: boolean | null
          nome: string
          status: string | null
          tipo: string
          updated_at: string
          versao: number | null
        }
        Insert: {
          ativo?: boolean | null
          conteudo?: Json | null
          created_at?: string
          created_by?: string | null
          empresa_id?: string | null
          id?: string
          is_global?: boolean | null
          nome: string
          status?: string | null
          tipo: string
          updated_at?: string
          versao?: number | null
        }
        Update: {
          ativo?: boolean | null
          conteudo?: Json | null
          created_at?: string
          created_by?: string | null
          empresa_id?: string | null
          id?: string
          is_global?: boolean | null
          nome?: string
          status?: string | null
          tipo?: string
          updated_at?: string
          versao?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "test_templates_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      unidades: {
        Row: {
          ativa: boolean | null
          created_at: string
          empresa_id: string
          endereco: string | null
          id: string
          nome: string
        }
        Insert: {
          ativa?: boolean | null
          created_at?: string
          empresa_id: string
          endereco?: string | null
          id?: string
          nome: string
        }
        Update: {
          ativa?: boolean | null
          created_at?: string
          empresa_id?: string
          endereco?: string | null
          id?: string
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "unidades_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      app_role:
        | "admin_master"
        | "consultor"
        | "empresa_admin"
        | "empresa_gestor"
        | "colaborador"
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
      app_role: [
        "admin_master",
        "consultor",
        "empresa_admin",
        "empresa_gestor",
        "colaborador",
      ],
    },
  },
} as const
