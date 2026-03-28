CREATE TABLE IF NOT EXISTS public.form_template_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.form_templates(id) ON DELETE CASCADE,
  nome text NOT NULL,
  descricao text,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.form_template_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.form_templates(id) ON DELETE CASCADE,
  section_id uuid REFERENCES public.form_template_sections(id) ON DELETE SET NULL,
  texto text NOT NULL,
  tipo_resposta text NOT NULL DEFAULT 'multipla_escolha',
  ordem integer NOT NULL DEFAULT 0,
  peso numeric,
  obrigatoria boolean NOT NULL DEFAULT true,
  eliminatoria boolean NOT NULL DEFAULT false,
  ativa boolean NOT NULL DEFAULT true,
  observacao text,
  permite_comentario boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.form_template_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.form_template_questions(id) ON DELETE CASCADE,
  texto text NOT NULL,
  valor numeric,
  peso numeric,
  ordem integer NOT NULL DEFAULT 0,
  perfil text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.test_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL REFERENCES public.test_templates(id) ON DELETE CASCADE,
  texto text NOT NULL,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.test_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.test_questions(id) ON DELETE CASCADE,
  texto text NOT NULL,
  perfil text,
  valor numeric,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_form_template_sections_template_id ON public.form_template_sections(template_id);
CREATE INDEX IF NOT EXISTS idx_form_template_questions_template_id ON public.form_template_questions(template_id);
CREATE INDEX IF NOT EXISTS idx_form_template_questions_section_id ON public.form_template_questions(section_id);
CREATE INDEX IF NOT EXISTS idx_form_template_options_question_id ON public.form_template_options(question_id);
CREATE INDEX IF NOT EXISTS idx_test_questions_test_id ON public.test_questions(test_id);
CREATE INDEX IF NOT EXISTS idx_test_options_question_id ON public.test_options(question_id);

ALTER TABLE public.form_template_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_template_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_template_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_options ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can view form_template_sections" ON public.form_template_sections;
CREATE POLICY "Authenticated can view form_template_sections"
ON public.form_template_sections
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Admins and consultores can manage form_template_sections" ON public.form_template_sections;
CREATE POLICY "Admins and consultores can manage form_template_sections"
ON public.form_template_sections
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin_master') OR public.has_role(auth.uid(), 'consultor'))
WITH CHECK (public.has_role(auth.uid(), 'admin_master') OR public.has_role(auth.uid(), 'consultor'));

DROP POLICY IF EXISTS "Authenticated can view form_template_questions" ON public.form_template_questions;
CREATE POLICY "Authenticated can view form_template_questions"
ON public.form_template_questions
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Admins and consultores can manage form_template_questions" ON public.form_template_questions;
CREATE POLICY "Admins and consultores can manage form_template_questions"
ON public.form_template_questions
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin_master') OR public.has_role(auth.uid(), 'consultor'))
WITH CHECK (public.has_role(auth.uid(), 'admin_master') OR public.has_role(auth.uid(), 'consultor'));

DROP POLICY IF EXISTS "Authenticated can view form_template_options" ON public.form_template_options;
CREATE POLICY "Authenticated can view form_template_options"
ON public.form_template_options
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Admins and consultores can manage form_template_options" ON public.form_template_options;
CREATE POLICY "Admins and consultores can manage form_template_options"
ON public.form_template_options
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin_master') OR public.has_role(auth.uid(), 'consultor'))
WITH CHECK (public.has_role(auth.uid(), 'admin_master') OR public.has_role(auth.uid(), 'consultor'));

DROP POLICY IF EXISTS "Authenticated can view test_questions" ON public.test_questions;
CREATE POLICY "Authenticated can view test_questions"
ON public.test_questions
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Admins and consultores can manage test_questions" ON public.test_questions;
CREATE POLICY "Admins and consultores can manage test_questions"
ON public.test_questions
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin_master') OR public.has_role(auth.uid(), 'consultor'))
WITH CHECK (public.has_role(auth.uid(), 'admin_master') OR public.has_role(auth.uid(), 'consultor'));

DROP POLICY IF EXISTS "Authenticated can view test_options" ON public.test_options;
CREATE POLICY "Authenticated can view test_options"
ON public.test_options
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Admins and consultores can manage test_options" ON public.test_options;
CREATE POLICY "Admins and consultores can manage test_options"
ON public.test_options
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin_master') OR public.has_role(auth.uid(), 'consultor'))
WITH CHECK (public.has_role(auth.uid(), 'admin_master') OR public.has_role(auth.uid(), 'consultor'));

DROP TRIGGER IF EXISTS trg_form_template_sections_updated_at ON public.form_template_sections;
CREATE TRIGGER trg_form_template_sections_updated_at
BEFORE UPDATE ON public.form_template_sections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_form_template_questions_updated_at ON public.form_template_questions;
CREATE TRIGGER trg_form_template_questions_updated_at
BEFORE UPDATE ON public.form_template_questions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_form_template_options_updated_at ON public.form_template_options;
CREATE TRIGGER trg_form_template_options_updated_at
BEFORE UPDATE ON public.form_template_options
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_test_questions_updated_at ON public.test_questions;
CREATE TRIGGER trg_test_questions_updated_at
BEFORE UPDATE ON public.test_questions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_test_options_updated_at ON public.test_options;
CREATE TRIGGER trg_test_options_updated_at
BEFORE UPDATE ON public.test_options
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();