
-- Test assignments: assigns tests to employees/sectors/companies
CREATE TABLE public.test_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  setor_id uuid,
  colaborador_id uuid,
  tipo_teste text NOT NULL, -- disc, psicossocial, aet, aep, checklist
  recorrencia text NOT NULL DEFAULT 'mensal', -- mensal, trimestral, semestral, anual, unico
  data_inicio date NOT NULL DEFAULT CURRENT_DATE,
  data_fim_validade date,
  dia_limite integer DEFAULT 15, -- day of month/period by which test must be completed
  ativo boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.test_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and consultores can manage test_assignments"
  ON public.test_assignments FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin_master'::app_role) OR has_role(auth.uid(), 'consultor'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role) OR has_role(auth.uid(), 'consultor'::app_role));

CREATE POLICY "Authenticated can view test_assignments"
  ON public.test_assignments FOR SELECT TO authenticated
  USING (true);

CREATE TRIGGER update_test_assignments_updated_at
  BEFORE UPDATE ON public.test_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Test assignment instances: one per employee per period
CREATE TABLE public.test_assignment_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.test_assignments(id) ON DELETE CASCADE,
  colaborador_id uuid NOT NULL,
  empresa_id uuid NOT NULL,
  tipo_teste text NOT NULL,
  data_inicio_periodo date NOT NULL,
  data_fim_periodo date NOT NULL,
  status text NOT NULL DEFAULT 'pendente', -- pendente, em_andamento, concluido, vencido
  concluido_em timestamptz,
  resultado_id uuid,
  notificado_vencido boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.test_assignment_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and consultores can manage test_assignment_instances"
  ON public.test_assignment_instances FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin_master'::app_role) OR has_role(auth.uid(), 'consultor'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role) OR has_role(auth.uid(), 'consultor'::app_role));

CREATE POLICY "Colaboradores can update own instances"
  ON public.test_assignment_instances FOR UPDATE TO authenticated
  USING (colaborador_id IN (SELECT c.id FROM colaboradores c WHERE c.user_id = auth.uid()));

CREATE POLICY "Authenticated can view test_assignment_instances"
  ON public.test_assignment_instances FOR SELECT TO authenticated
  USING (true);

CREATE TRIGGER update_test_assignment_instances_updated_at
  BEFORE UPDATE ON public.test_assignment_instances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- DISC questions: standard pre-built
CREATE TABLE public.disc_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo integer NOT NULL,
  ordem integer NOT NULL DEFAULT 0,
  texto_mais text NOT NULL,
  texto_menos text NOT NULL,
  perfil_mais text NOT NULL, -- D, I, S, C
  perfil_menos text NOT NULL, -- D, I, S, C
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.disc_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view disc_questions"
  ON public.disc_questions FOR SELECT TO authenticated
  USING (true);

-- DISC responses
CREATE TABLE public.disc_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid REFERENCES public.test_assignment_instances(id) ON DELETE SET NULL,
  colaborador_id uuid NOT NULL,
  empresa_id uuid NOT NULL,
  respostas jsonb NOT NULL DEFAULT '{}',
  scores jsonb DEFAULT '{}', -- {D: n, I: n, S: n, C: n}
  perfil_dominante text, -- D, I, S, C
  status text NOT NULL DEFAULT 'em_andamento',
  finalizado_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.disc_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and consultores can manage disc_responses"
  ON public.disc_responses FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin_master'::app_role) OR has_role(auth.uid(), 'consultor'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role) OR has_role(auth.uid(), 'consultor'::app_role));

CREATE POLICY "Colaboradores can insert own disc_responses"
  ON public.disc_responses FOR INSERT TO authenticated
  WITH CHECK (colaborador_id IN (SELECT c.id FROM colaboradores c WHERE c.user_id = auth.uid()));

CREATE POLICY "Colaboradores can update own disc_responses"
  ON public.disc_responses FOR UPDATE TO authenticated
  USING (colaborador_id IN (SELECT c.id FROM colaboradores c WHERE c.user_id = auth.uid()));

CREATE POLICY "Authenticated can view disc_responses"
  ON public.disc_responses FOR SELECT TO authenticated
  USING (true);

CREATE TRIGGER update_disc_responses_updated_at
  BEFORE UPDATE ON public.disc_responses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_test_assignments_empresa ON public.test_assignments(empresa_id);
CREATE INDEX idx_test_assignment_instances_colab ON public.test_assignment_instances(colaborador_id);
CREATE INDEX idx_test_assignment_instances_status ON public.test_assignment_instances(status);
CREATE INDEX idx_disc_responses_colab ON public.disc_responses(colaborador_id);
