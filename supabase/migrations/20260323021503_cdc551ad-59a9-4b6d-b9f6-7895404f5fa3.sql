
-- Add missing column question_text to assessment_items
ALTER TABLE public.assessment_items ADD COLUMN question_text TEXT;

-- Add missing columns to checklists
ALTER TABLE public.checklists ADD COLUMN score NUMERIC;
ALTER TABLE public.checklists ADD COLUMN confirmed_at TIMESTAMPTZ;

-- Add endereco to unidades
ALTER TABLE public.unidades ADD COLUMN endereco TEXT;

-- Audit logs
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  entity TEXT,
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view audit_logs" ON public.audit_logs FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin_master')
);
CREATE POLICY "Authenticated can insert audit_logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Planos (subscription plans)
CREATE TABLE public.planos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  preco NUMERIC,
  recursos JSONB,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.planos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view planos" ON public.planos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage planos" ON public.planos FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), 'admin_master')
);

-- Contratos
CREATE TABLE public.contratos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  plano_id UUID REFERENCES public.planos(id),
  data_inicio DATE,
  data_fim DATE,
  status TEXT DEFAULT 'ativo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view contratos" ON public.contratos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage contratos" ON public.contratos FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), 'admin_master')
);

-- Add plano_id to empresas
ALTER TABLE public.empresas ADD COLUMN plano_id UUID REFERENCES public.planos(id);

-- Consultor-empresa relationship
CREATE TABLE public.consultor_empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(consultor_id, empresa_id)
);
ALTER TABLE public.consultor_empresas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view consultor_empresas" ON public.consultor_empresas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage consultor_empresas" ON public.consultor_empresas FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), 'admin_master')
);

-- Risk events
CREATE TABLE public.risk_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
  type TEXT,
  description TEXT,
  severity TEXT,
  date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.risk_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view risk_events" ON public.risk_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage risk_events" ON public.risk_events FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), 'admin_master') OR public.has_role(auth.uid(), 'consultor')
);

-- Triggers for new tables
CREATE TRIGGER update_contratos_updated_at BEFORE UPDATE ON public.contratos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
