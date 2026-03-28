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
      assessment_instance_answers: {
        Row: {
          comentario: string | null
          created_at: string
          id: string
          instance_id: string
          option_id: string | null
          question_id: string
          valor_numerico: number | null
          valor_texto: string | null
        }
        Insert: {
          comentario?: string | null
          created_at?: string
          id?: string
          instance_id: string
          option_id?: string | null
          question_id: string
          valor_numerico?: number | null
          valor_texto?: string | null
        }
        Update: {
          comentario?: string | null
          created_at?: string
          id?: string
          instance_id?: string
          option_id?: string | null
          question_id?: string
          valor_numerico?: number | null
          valor_texto?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_instance_answers_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "assessment_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_instance_answers_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "form_template_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_instance_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "form_template_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_instances: {
        Row: {
          applied_by: string | null
          colaborador_id: string | null
          completed_at: string | null
          created_at: string
          empresa_id: string
          id: string
          resultado: Json | null
          score_total: number | null
          started_at: string | null
          status: string
          template_id: string
          template_version_id: string | null
          titulo: string | null
          updated_at: string
        }
        Insert: {
          applied_by?: string | null
          colaborador_id?: string | null
          completed_at?: string | null
          created_at?: string
          empresa_id: string
          id?: string
          resultado?: Json | null
          score_total?: number | null
          started_at?: string | null
          status?: string
          template_id: string
          template_version_id?: string | null
          titulo?: string | null
          updated_at?: string
        }
        Update: {
          applied_by?: string | null
          colaborador_id?: string | null
          completed_at?: string | null
          created_at?: string
          empresa_id?: string
          id?: string
          resultado?: Json | null
          score_total?: number | null
          started_at?: string | null
          status?: string
          template_id?: string
          template_version_id?: string | null
          titulo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_instances_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_instances_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_instances_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "form_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_instances_template_version_id_fkey"
            columns: ["template_version_id"]
            isOneToOne: false
            referencedRelation: "template_versions"
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
          cid: string | null
          colaborador_id: string
          created_at: string
          created_by: string | null
          data_fim: string | null
          data_inicio: string | null
          dias: number | null
          empresa_id: string
          id: string
          observacoes: string | null
          tipo: string | null
        }
        Insert: {
          cid?: string | null
          colaborador_id: string
          created_at?: string
          created_by?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          dias?: number | null
          empresa_id: string
          id?: string
          observacoes?: string | null
          tipo?: string | null
        }
        Update: {
          cid?: string | null
          colaborador_id?: string
          created_at?: string
          created_by?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          dias?: number | null
          empresa_id?: string
          id?: string
          observacoes?: string | null
          tipo?: string | null
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
          arquivo_url: string | null
          created_at: string
          created_by: string | null
          data_emissao: string | null
          empresa_id: string
          id: string
          proximo_vencimento: string | null
          status: string | null
          tipo_documento: string
          titulo: string
          updated_at: string
          validade: string | null
        }
        Insert: {
          arquivo_url?: string | null
          created_at?: string
          created_by?: string | null
          data_emissao?: string | null
          empresa_id: string
          id?: string
          proximo_vencimento?: string | null
          status?: string | null
          tipo_documento: string
          titulo: string
          updated_at?: string
          validade?: string | null
        }
        Update: {
          arquivo_url?: string | null
          created_at?: string
          created_by?: string | null
          data_emissao?: string | null
          empresa_id?: string
          id?: string
          proximo_vencimento?: string | null
          status?: string | null
          tipo_documento?: string
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
          applied_at: string | null
          applied_by: string | null
          colaborador_id: string
          created_at: string
          empresa_id: string
          id: string
          perfil_predominante: string | null
          respostas: Json | null
          scores: Json | null
          status: string
          test_id: string
        }
        Insert: {
          applied_at?: string | null
          applied_by?: string | null
          colaborador_id: string
          created_at?: string
          empresa_id: string
          id?: string
          perfil_predominante?: string | null
          respostas?: Json | null
          scores?: Json | null
          status?: string
          test_id: string
        }
        Update: {
          applied_at?: string | null
          applied_by?: string | null
          colaborador_id?: string
          created_at?: string
          empresa_id?: string
          id?: string
          perfil_predominante?: string | null
          respostas?: Json | null
          scores?: Json | null
          status?: string
          test_id?: string
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
          {
            foreignKeyName: "employee_test_results_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "test_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      empresa_assinaturas: {
        Row: {
          created_at: string
          empresa_id: string
          id: string
          limite_empresas_vinculadas: number | null
          limite_usuarios: number | null
          modulos_ativos: Json | null
          periodicidade: string | null
          status: string
          tipo_plano: string
          updated_at: string
          valor_implantacao: number | null
          valor_mensal: number | null
        }
        Insert: {
          created_at?: string
          empresa_id: string
          id?: string
          limite_empresas_vinculadas?: number | null
          limite_usuarios?: number | null
          modulos_ativos?: Json | null
          periodicidade?: string | null
          status?: string
          tipo_plano?: string
          updated_at?: string
          valor_implantacao?: number | null
          valor_mensal?: number | null
        }
        Update: {
          created_at?: string
          empresa_id?: string
          id?: string
          limite_empresas_vinculadas?: number | null
          limite_usuarios?: number | null
          modulos_ativos?: Json | null
          periodicidade?: string | null
          status?: string
          tipo_plano?: string
          updated_at?: string
          valor_implantacao?: number | null
          valor_mensal?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "empresa_assinaturas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      empresa_contratos: {
        Row: {
          arquivo_url: string | null
          created_at: string
          created_by: string | null
          data_assinatura: string | null
          empresa_id: string
          id: string
          nome: string
          status: string
          tipo: string | null
          updated_at: string
          validade: string | null
        }
        Insert: {
          arquivo_url?: string | null
          created_at?: string
          created_by?: string | null
          data_assinatura?: string | null
          empresa_id: string
          id?: string
          nome: string
          status?: string
          tipo?: string | null
          updated_at?: string
          validade?: string | null
        }
        Update: {
          arquivo_url?: string | null
          created_at?: string
          created_by?: string | null
          data_assinatura?: string | null
          empresa_id?: string
          id?: string
          nome?: string
          status?: string
          tipo?: string | null
          updated_at?: string
          validade?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "empresa_contratos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      empresa_pagamentos: {
        Row: {
          created_at: string
          created_by: string | null
          data_pagamento: string | null
          data_vencimento: string | null
          empresa_id: string
          forma_pagamento: string | null
          id: string
          observacoes: string | null
          status: string
          valor: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data_pagamento?: string | null
          data_vencimento?: string | null
          empresa_id: string
          forma_pagamento?: string | null
          id?: string
          observacoes?: string | null
          status?: string
          valor?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data_pagamento?: string | null
          data_vencimento?: string | null
          empresa_id?: string
          forma_pagamento?: string | null
          id?: string
          observacoes?: string | null
          status?: string
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
          data_inicio_contrato: string | null
          email: string | null
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
          proxima_cobranca: string | null
          razao_social: string
          responsavel_email: string | null
          responsavel_nome: string | null
          responsavel_telefone: string | null
          status_financeiro: string | null
          telefone: string | null
          updated_at: string
          valor_em_aberto: number | null
        }
        Insert: {
          ativa?: boolean
          cnae?: string | null
          cnpj?: string | null
          created_at?: string
          created_by?: string | null
          data_inicio_contrato?: string | null
          email?: string | null
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
          proxima_cobranca?: string | null
          razao_social: string
          responsavel_email?: string | null
          responsavel_nome?: string | null
          responsavel_telefone?: string | null
          status_financeiro?: string | null
          telefone?: string | null
          updated_at?: string
          valor_em_aberto?: number | null
        }
        Update: {
          ativa?: boolean
          cnae?: string | null
          cnpj?: string | null
          created_at?: string
          created_by?: string | null
          data_inicio_contrato?: string | null
          email?: string | null
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
          proxima_cobranca?: string | null
          razao_social?: string
          responsavel_email?: string | null
          responsavel_nome?: string | null
          responsavel_telefone?: string | null
          status_financeiro?: string | null
          telefone?: string | null
          updated_at?: string
          valor_em_aberto?: number | null
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
      form_template_options: {
        Row: {
          created_at: string
          id: string
          ordem: number
          perfil: string | null
          peso: number | null
          question_id: string
          texto: string
          valor: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          ordem?: number
          perfil?: string | null
          peso?: number | null
          question_id: string
          texto: string
          valor?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          ordem?: number
          perfil?: string | null
          peso?: number | null
          question_id?: string
          texto?: string
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "form_template_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "form_template_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      form_template_questions: {
        Row: {
          ativa: boolean | null
          created_at: string
          eliminatoria: boolean | null
          id: string
          obrigatoria: boolean | null
          observacao: string | null
          ordem: number
          permite_comentario: boolean | null
          peso: number | null
          section_id: string | null
          template_id: string
          texto: string
          tipo_resposta: string
          updated_at: string
        }
        Insert: {
          ativa?: boolean | null
          created_at?: string
          eliminatoria?: boolean | null
          id?: string
          obrigatoria?: boolean | null
          observacao?: string | null
          ordem?: number
          permite_comentario?: boolean | null
          peso?: number | null
          section_id?: string | null
          template_id: string
          texto: string
          tipo_resposta?: string
          updated_at?: string
        }
        Update: {
          ativa?: boolean | null
          created_at?: string
          eliminatoria?: boolean | null
          id?: string
          obrigatoria?: boolean | null
          observacao?: string | null
          ordem?: number
          permite_comentario?: boolean | null
          peso?: number | null
          section_id?: string | null
          template_id?: string
          texto?: string
          tipo_resposta?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_template_questions_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "form_template_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_template_questions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "form_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      form_template_sections: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          nome: string
          ordem: number
          template_id: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          ordem?: number
          template_id: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          ordem?: number
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_template_sections_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "form_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      form_templates: {
        Row: {
          created_at: string
          created_by: string | null
          descricao: string | null
          empresa_id: string | null
          id: string
          is_global: boolean | null
          modulo_destino: string | null
          nome: string
          parent_template_id: string | null
          status: string
          tipo: string
          updated_at: string
          versao: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          empresa_id?: string | null
          id?: string
          is_global?: boolean | null
          modulo_destino?: string | null
          nome: string
          parent_template_id?: string | null
          status?: string
          tipo: string
          updated_at?: string
          versao?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          empresa_id?: string | null
          id?: string
          is_global?: boolean | null
          modulo_destino?: string | null
          nome?: string
          parent_template_id?: string | null
          status?: string
          tipo?: string
          updated_at?: string
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "form_templates_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_templates_parent_template_id_fkey"
            columns: ["parent_template_id"]
            isOneToOne: false
            referencedRelation: "form_templates"
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
      template_versions: {
        Row: {
          created_at: string
          id: string
          snapshot: Json
          template_id: string
          versao: number
        }
        Insert: {
          created_at?: string
          id?: string
          snapshot: Json
          template_id: string
          versao: number
        }
        Update: {
          created_at?: string
          id?: string
          snapshot?: Json
          template_id?: string
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "template_versions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "form_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      test_options: {
        Row: {
          created_at: string
          id: string
          ordem: number
          perfil: string | null
          question_id: string
          texto: string
          valor: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          ordem?: number
          perfil?: string | null
          question_id: string
          texto: string
          valor?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          ordem?: number
          perfil?: string | null
          question_id?: string
          texto?: string
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "test_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "test_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      test_questions: {
        Row: {
          ativa: boolean | null
          created_at: string
          id: string
          ordem: number
          test_id: string
          texto: string
        }
        Insert: {
          ativa?: boolean | null
          created_at?: string
          id?: string
          ordem?: number
          test_id: string
          texto: string
        }
        Update: {
          ativa?: boolean | null
          created_at?: string
          id?: string
          ordem?: number
          test_id?: string
          texto?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_questions_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "test_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      test_templates: {
        Row: {
          categorias: Json | null
          created_at: string
          created_by: string | null
          descricao: string | null
          empresa_id: string | null
          id: string
          is_global: boolean | null
          logica_calculo: string | null
          nome: string
          status: string
          tipo: string
          updated_at: string
          versao: number
        }
        Insert: {
          categorias?: Json | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          empresa_id?: string | null
          id?: string
          is_global?: boolean | null
          logica_calculo?: string | null
          nome: string
          status?: string
          tipo?: string
          updated_at?: string
          versao?: number
        }
        Update: {
          categorias?: Json | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          empresa_id?: string | null
          id?: string
          is_global?: boolean | null
          logica_calculo?: string | null
          nome?: string
          status?: string
          tipo?: string
          updated_at?: string
          versao?: number
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
