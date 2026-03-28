
-- Add missing columns to empresas
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS status_financeiro TEXT DEFAULT 'em_dia';

-- Empresa pagamentos
CREATE TABLE public.empresa_pagamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  valor NUMERIC NOT NULL,
  data_vencimento DATE,
  data_pagamento DATE,
  status TEXT DEFAULT 'pendente',
  descricao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.empresa_pagamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view empresa_pagamentos" ON public.empresa_pagamentos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage empresa_pagamentos" ON public.empresa_pagamentos FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), 'admin_master')
);

-- Empresa contratos
CREATE TABLE public.empresa_contratos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  plano_id UUID REFERENCES public.planos(id),
  data_inicio DATE,
  data_fim DATE,
  status TEXT DEFAULT 'ativo',
  valor NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.empresa_contratos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view empresa_contratos" ON public.empresa_contratos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage empresa_contratos" ON public.empresa_contratos FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), 'admin_master')
);

-- Employee test results
CREATE TABLE public.employee_test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  colaborador_id UUID REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  resultado TEXT,
  data_teste DATE,
  observacoes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.employee_test_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view employee_test_results" ON public.employee_test_results FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and consultores can manage employee_test_results" ON public.employee_test_results FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), 'admin_master') OR public.has_role(auth.uid(), 'consultor')
);

-- Form templates
CREATE TABLE public.form_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL,
  conteudo JSONB DEFAULT '{}',
  is_global BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'ativo',
  versao INTEGER DEFAULT 1,
  ativo BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.form_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view form_templates" ON public.form_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and consultores can manage form_templates" ON public.form_templates FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), 'admin_master') OR public.has_role(auth.uid(), 'consultor')
);

-- Test templates
CREATE TABLE public.test_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL,
  conteudo JSONB DEFAULT '{}',
  is_global BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'ativo',
  versao INTEGER DEFAULT 1,
  ativo BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.test_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view test_templates" ON public.test_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and consultores can manage test_templates" ON public.test_templates FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), 'admin_master') OR public.has_role(auth.uid(), 'consultor')
);

-- Triggers
CREATE TRIGGER update_empresa_pagamentos_updated_at BEFORE UPDATE ON public.empresa_pagamentos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_empresa_contratos_updated_at BEFORE UPDATE ON public.empresa_contratos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_form_templates_updated_at BEFORE UPDATE ON public.form_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_test_templates_updated_at BEFORE UPDATE ON public.test_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
