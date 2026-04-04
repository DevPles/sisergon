
CREATE TABLE public.avaliacoes_psicossociais_likert (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  setor_id UUID REFERENCES public.setores(id),
  respondente_hash TEXT,
  respostas JSONB NOT NULL DEFAULT '{}',
  scores JSONB DEFAULT '{}',
  score_total NUMERIC,
  classificacao TEXT,
  alerta_violencia BOOLEAN DEFAULT false,
  enfermeira_id UUID,
  status TEXT NOT NULL DEFAULT 'em_andamento',
  finalizado_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.avaliacoes_psicossociais_likert ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view avaliacoes_psicossociais_likert"
  ON public.avaliacoes_psicossociais_likert FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins and consultores can manage avaliacoes_psicossociais_likert"
  ON public.avaliacoes_psicossociais_likert FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin_master') OR has_role(auth.uid(), 'consultor'))
  WITH CHECK (has_role(auth.uid(), 'admin_master') OR has_role(auth.uid(), 'consultor'));

CREATE POLICY "Anyone can insert avaliacoes_psicossociais_likert"
  ON public.avaliacoes_psicossociais_likert FOR INSERT TO authenticated
  WITH CHECK (true);
