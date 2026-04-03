
-- Table to track INSS referral actions and return-to-work evaluations
CREATE TABLE public.afastamento_acoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  cid TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'encaminhamento_inss',
  status TEXT NOT NULL DEFAULT 'pendente',
  data_encaminhamento DATE,
  data_pericia DATE,
  resultado_pericia TEXT,
  data_retorno_previsto DATE,
  data_retorno_efetivo DATE,
  observacoes TEXT,
  parecer_retorno TEXT,
  restricoes_retorno TEXT,
  evidencia_url TEXT,
  evidencia_pericia_url TEXT,
  evidencia_retorno_url TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.afastamento_acoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and consultores can manage afastamento_acoes"
  ON public.afastamento_acoes FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin_master'::app_role) OR has_role(auth.uid(), 'consultor'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role) OR has_role(auth.uid(), 'consultor'::app_role));

CREATE POLICY "Authenticated can view afastamento_acoes"
  ON public.afastamento_acoes FOR SELECT TO authenticated
  USING (true);

-- Storage bucket for INSS evidence files
INSERT INTO storage.buckets (id, name, public) VALUES ('afastamento-evidencias', 'afastamento-evidencias', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Auth users can upload afastamento evidence"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'afastamento-evidencias');

CREATE POLICY "Auth users can read afastamento evidence"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'afastamento-evidencias');

-- Also create the atestados bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public) VALUES ('atestados', 'atestados', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Auth users can upload atestados"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'atestados');

CREATE POLICY "Auth users can read atestados"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'atestados');
