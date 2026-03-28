
-- ═══════════════════════════════════════════
-- FORM TEMPLATES SYSTEM
-- ═══════════════════════════════════════════

-- Main templates table
CREATE TABLE public.form_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL,
  descricao TEXT,
  status TEXT NOT NULL DEFAULT 'ativo',
  versao INTEGER NOT NULL DEFAULT 1,
  modulo_destino TEXT,
  is_global BOOLEAN DEFAULT false,
  parent_template_id UUID REFERENCES public.form_templates(id),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Template sections/blocks
CREATE TABLE public.form_template_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.form_templates(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Template questions
CREATE TABLE public.form_template_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.form_templates(id) ON DELETE CASCADE,
  section_id UUID REFERENCES public.form_template_sections(id) ON DELETE SET NULL,
  texto TEXT NOT NULL,
  tipo_resposta TEXT NOT NULL DEFAULT 'escala',
  ordem INTEGER NOT NULL DEFAULT 0,
  peso NUMERIC DEFAULT 1,
  obrigatoria BOOLEAN DEFAULT true,
  eliminatoria BOOLEAN DEFAULT false,
  ativa BOOLEAN DEFAULT true,
  observacao TEXT,
  permite_comentario BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Question options (for multiple choice, scale, etc.)
CREATE TABLE public.form_template_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID NOT NULL REFERENCES public.form_template_questions(id) ON DELETE CASCADE,
  texto TEXT NOT NULL,
  valor NUMERIC DEFAULT 0,
  peso NUMERIC DEFAULT 1,
  ordem INTEGER NOT NULL DEFAULT 0,
  perfil TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Template versions (frozen snapshots)
CREATE TABLE public.template_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.form_templates(id) ON DELETE CASCADE,
  versao INTEGER NOT NULL,
  snapshot JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════
-- ASSESSMENT INSTANCES (applied evaluations)
-- ═══════════════════════════════════════════

CREATE TABLE public.assessment_instances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  colaborador_id UUID REFERENCES public.colaboradores(id) ON DELETE SET NULL,
  template_id UUID NOT NULL REFERENCES public.form_templates(id),
  template_version_id UUID REFERENCES public.template_versions(id),
  titulo TEXT,
  status TEXT NOT NULL DEFAULT 'em_andamento',
  score_total NUMERIC,
  resultado JSONB,
  applied_by UUID,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Instance answers
CREATE TABLE public.assessment_instance_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  instance_id UUID NOT NULL REFERENCES public.assessment_instances(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.form_template_questions(id),
  option_id UUID REFERENCES public.form_template_options(id),
  valor_numerico NUMERIC,
  valor_texto TEXT,
  comentario TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════
-- TEST SYSTEM (behavioral, DISC, etc.)
-- ═══════════════════════════════════════════

CREATE TABLE public.test_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'comportamental',
  descricao TEXT,
  status TEXT NOT NULL DEFAULT 'ativo',
  versao INTEGER NOT NULL DEFAULT 1,
  is_global BOOLEAN DEFAULT false,
  categorias JSONB DEFAULT '[]'::jsonb,
  logica_calculo TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.test_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  test_id UUID NOT NULL REFERENCES public.test_templates(id) ON DELETE CASCADE,
  texto TEXT NOT NULL,
  ordem INTEGER NOT NULL DEFAULT 0,
  ativa BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.test_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID NOT NULL REFERENCES public.test_questions(id) ON DELETE CASCADE,
  texto TEXT NOT NULL,
  perfil TEXT,
  valor NUMERIC DEFAULT 0,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.employee_test_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  test_id UUID NOT NULL REFERENCES public.test_templates(id),
  respostas JSONB,
  scores JSONB,
  perfil_predominante TEXT,
  status TEXT NOT NULL DEFAULT 'concluido',
  applied_by UUID,
  applied_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════
-- RLS POLICIES
-- ═══════════════════════════════════════════

ALTER TABLE public.form_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_template_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_template_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_template_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_instance_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_test_results ENABLE ROW LEVEL SECURITY;

-- SELECT policies (all authenticated)
CREATE POLICY "auth_select" ON public.form_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_select" ON public.form_template_sections FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_select" ON public.form_template_questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_select" ON public.form_template_options FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_select" ON public.template_versions FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_select" ON public.assessment_instances FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_select" ON public.assessment_instance_answers FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_select" ON public.test_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_select" ON public.test_questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_select" ON public.test_options FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_select" ON public.employee_test_results FOR SELECT TO authenticated USING (true);

-- INSERT policies (admin/consultor)
CREATE POLICY "admin_insert" ON public.form_templates FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role) OR has_role(auth.uid(), 'consultor'::app_role));
CREATE POLICY "admin_insert" ON public.form_template_sections FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role) OR has_role(auth.uid(), 'consultor'::app_role));
CREATE POLICY "admin_insert" ON public.form_template_questions FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role) OR has_role(auth.uid(), 'consultor'::app_role));
CREATE POLICY "admin_insert" ON public.form_template_options FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role) OR has_role(auth.uid(), 'consultor'::app_role));
CREATE POLICY "admin_insert" ON public.template_versions FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role) OR has_role(auth.uid(), 'consultor'::app_role));
CREATE POLICY "admin_insert" ON public.assessment_instances FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role) OR has_role(auth.uid(), 'consultor'::app_role));
CREATE POLICY "admin_insert" ON public.assessment_instance_answers FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role) OR has_role(auth.uid(), 'consultor'::app_role));
CREATE POLICY "admin_insert" ON public.test_templates FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role) OR has_role(auth.uid(), 'consultor'::app_role));
CREATE POLICY "admin_insert" ON public.test_questions FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role) OR has_role(auth.uid(), 'consultor'::app_role));
CREATE POLICY "admin_insert" ON public.test_options FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role) OR has_role(auth.uid(), 'consultor'::app_role));
CREATE POLICY "admin_insert" ON public.employee_test_results FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role) OR has_role(auth.uid(), 'consultor'::app_role));

-- UPDATE policies
CREATE POLICY "admin_update" ON public.form_templates FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin_master'::app_role) OR has_role(auth.uid(), 'consultor'::app_role));
CREATE POLICY "admin_update" ON public.form_template_sections FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin_master'::app_role) OR has_role(auth.uid(), 'consultor'::app_role));
CREATE POLICY "admin_update" ON public.form_template_questions FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin_master'::app_role) OR has_role(auth.uid(), 'consultor'::app_role));
CREATE POLICY "admin_update" ON public.form_template_options FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin_master'::app_role) OR has_role(auth.uid(), 'consultor'::app_role));
CREATE POLICY "admin_update" ON public.assessment_instances FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin_master'::app_role) OR has_role(auth.uid(), 'consultor'::app_role));
CREATE POLICY "admin_update" ON public.assessment_instance_answers FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin_master'::app_role) OR has_role(auth.uid(), 'consultor'::app_role));
CREATE POLICY "admin_update" ON public.test_templates FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin_master'::app_role) OR has_role(auth.uid(), 'consultor'::app_role));
CREATE POLICY "admin_update" ON public.test_questions FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin_master'::app_role) OR has_role(auth.uid(), 'consultor'::app_role));
CREATE POLICY "admin_update" ON public.test_options FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin_master'::app_role) OR has_role(auth.uid(), 'consultor'::app_role));
CREATE POLICY "admin_update" ON public.employee_test_results FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin_master'::app_role) OR has_role(auth.uid(), 'consultor'::app_role));

-- DELETE policies
CREATE POLICY "admin_delete" ON public.form_templates FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin_master'::app_role) OR has_role(auth.uid(), 'consultor'::app_role));
CREATE POLICY "admin_delete" ON public.form_template_sections FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin_master'::app_role) OR has_role(auth.uid(), 'consultor'::app_role));
CREATE POLICY "admin_delete" ON public.form_template_questions FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin_master'::app_role) OR has_role(auth.uid(), 'consultor'::app_role));
CREATE POLICY "admin_delete" ON public.form_template_options FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin_master'::app_role) OR has_role(auth.uid(), 'consultor'::app_role));
CREATE POLICY "admin_delete" ON public.template_versions FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin_master'::app_role) OR has_role(auth.uid(), 'consultor'::app_role));
CREATE POLICY "admin_delete" ON public.assessment_instances FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin_master'::app_role) OR has_role(auth.uid(), 'consultor'::app_role));
CREATE POLICY "admin_delete" ON public.assessment_instance_answers FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin_master'::app_role) OR has_role(auth.uid(), 'consultor'::app_role));
CREATE POLICY "admin_delete" ON public.test_templates FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin_master'::app_role) OR has_role(auth.uid(), 'consultor'::app_role));
CREATE POLICY "admin_delete" ON public.test_questions FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin_master'::app_role) OR has_role(auth.uid(), 'consultor'::app_role));
CREATE POLICY "admin_delete" ON public.test_options FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin_master'::app_role) OR has_role(auth.uid(), 'consultor'::app_role));
CREATE POLICY "admin_delete" ON public.employee_test_results FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin_master'::app_role) OR has_role(auth.uid(), 'consultor'::app_role));
