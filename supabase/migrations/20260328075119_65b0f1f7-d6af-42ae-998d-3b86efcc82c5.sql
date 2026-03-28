
CREATE TABLE public.empresa_assinaturas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  tipo_plano TEXT NOT NULL DEFAULT 'basico',
  valor_mensal NUMERIC DEFAULT 0,
  valor_implantacao NUMERIC DEFAULT 0,
  periodicidade TEXT DEFAULT 'mensal',
  limite_usuarios INTEGER,
  limite_empresas_vinculadas INTEGER,
  modulos_ativos TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'ativo',
  pagamento_recorrente BOOLEAN DEFAULT false,
  metodo_pagamento TEXT DEFAULT 'boleto',
  dia_cobranca INTEGER DEFAULT 1,
  mp_subscription_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.empresa_assinaturas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage empresa_assinaturas" ON public.empresa_assinaturas
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master'::app_role));

CREATE POLICY "Authenticated can view empresa_assinaturas" ON public.empresa_assinaturas
  FOR SELECT TO authenticated
  USING (true);
