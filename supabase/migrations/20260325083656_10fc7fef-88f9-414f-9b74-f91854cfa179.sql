
-- Subscriptions table (planos e assinaturas da empresa)
CREATE TABLE public.empresa_assinaturas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  tipo_plano TEXT NOT NULL DEFAULT 'basico',
  valor_mensal NUMERIC DEFAULT 0,
  valor_implantacao NUMERIC DEFAULT 0,
  periodicidade TEXT DEFAULT 'mensal',
  limite_usuarios INTEGER DEFAULT NULL,
  limite_empresas_vinculadas INTEGER DEFAULT NULL,
  modulos_ativos JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Financial control / payments table
CREATE TABLE public.empresa_pagamentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  valor NUMERIC NOT NULL DEFAULT 0,
  data_vencimento DATE,
  data_pagamento DATE,
  status TEXT NOT NULL DEFAULT 'pendente',
  forma_pagamento TEXT,
  observacoes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Billing contracts table
CREATE TABLE public.empresa_contratos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo TEXT DEFAULT 'contrato_inicial',
  data_assinatura DATE,
  validade DATE,
  status TEXT NOT NULL DEFAULT 'vigente',
  arquivo_url TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Company identity (logo for reports)
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS telefone TEXT;
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS email TEXT;

-- Financial status on empresa
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS status_financeiro TEXT DEFAULT 'adimplente';
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS data_inicio_contrato DATE;
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS proxima_cobranca DATE;
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS valor_em_aberto NUMERIC DEFAULT 0;

-- RLS
ALTER TABLE public.empresa_assinaturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresa_pagamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresa_contratos ENABLE ROW LEVEL SECURITY;

-- Assinaturas policies
CREATE POLICY "Authenticated can view empresa_assinaturas" ON public.empresa_assinaturas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and consultores can insert empresa_assinaturas" ON public.empresa_assinaturas FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role) OR has_role(auth.uid(), 'consultor'::app_role));
CREATE POLICY "Admins and consultores can update empresa_assinaturas" ON public.empresa_assinaturas FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin_master'::app_role) OR has_role(auth.uid(), 'consultor'::app_role));
CREATE POLICY "Admins and consultores can delete empresa_assinaturas" ON public.empresa_assinaturas FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin_master'::app_role) OR has_role(auth.uid(), 'consultor'::app_role));

-- Pagamentos policies
CREATE POLICY "Authenticated can view empresa_pagamentos" ON public.empresa_pagamentos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and consultores can insert empresa_pagamentos" ON public.empresa_pagamentos FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role) OR has_role(auth.uid(), 'consultor'::app_role));
CREATE POLICY "Admins and consultores can update empresa_pagamentos" ON public.empresa_pagamentos FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin_master'::app_role) OR has_role(auth.uid(), 'consultor'::app_role));
CREATE POLICY "Admins and consultores can delete empresa_pagamentos" ON public.empresa_pagamentos FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin_master'::app_role) OR has_role(auth.uid(), 'consultor'::app_role));

-- Contratos policies
CREATE POLICY "Authenticated can view empresa_contratos" ON public.empresa_contratos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and consultores can insert empresa_contratos" ON public.empresa_contratos FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role) OR has_role(auth.uid(), 'consultor'::app_role));
CREATE POLICY "Admins and consultores can update empresa_contratos" ON public.empresa_contratos FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin_master'::app_role) OR has_role(auth.uid(), 'consultor'::app_role));
CREATE POLICY "Admins and consultores can delete empresa_contratos" ON public.empresa_contratos FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin_master'::app_role) OR has_role(auth.uid(), 'consultor'::app_role));

-- Storage bucket for contracts
INSERT INTO storage.buckets (id, name, public) VALUES ('contratos', 'contratos', false) ON CONFLICT DO NOTHING;

-- Storage policies for contratos bucket
CREATE POLICY "Authenticated can upload contratos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'contratos');
CREATE POLICY "Authenticated can view contratos" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'contratos');
CREATE POLICY "Admins can delete contratos files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'contratos' AND has_role(auth.uid(), 'admin_master'::app_role));
