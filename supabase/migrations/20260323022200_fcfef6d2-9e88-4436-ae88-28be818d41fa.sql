
-- Notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
  entity_id UUID,
  entity_type TEXT,
  priority TEXT NOT NULL DEFAULT 'info' CHECK (priority IN ('info', 'warning', 'critical')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'viewed', 'resolved')),
  action_link TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'admin_master') OR public.has_role(auth.uid(), 'consultor')
);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- PCMSO Programas
CREATE TABLE public.pcmso_programas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  vigencia_inicio DATE,
  vigencia_fim DATE,
  responsavel_medico TEXT,
  crm TEXT,
  status TEXT DEFAULT 'ativo',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pcmso_programas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view pcmso_programas" ON public.pcmso_programas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and consultores can manage pcmso_programas" ON public.pcmso_programas FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'admin_master') OR public.has_role(auth.uid(), 'consultor')
);
CREATE POLICY "Admins and consultores can update pcmso_programas" ON public.pcmso_programas FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'admin_master') OR public.has_role(auth.uid(), 'consultor')
);
CREATE POLICY "Admins and consultores can delete pcmso_programas" ON public.pcmso_programas FOR DELETE TO authenticated USING (
  public.has_role(auth.uid(), 'admin_master') OR public.has_role(auth.uid(), 'consultor')
);

-- PCMSO Eventos (exames, consultas)
CREATE TABLE public.pcmso_eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  colaborador_id UUID REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  programa_id UUID REFERENCES public.pcmso_programas(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL DEFAULT 'exame',
  subtipo TEXT,
  data_prevista DATE,
  data_realizada DATE,
  resultado TEXT,
  aptidao TEXT,
  observacoes TEXT,
  status TEXT DEFAULT 'pendente',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pcmso_eventos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view pcmso_eventos" ON public.pcmso_eventos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and consultores can manage pcmso_eventos" ON public.pcmso_eventos FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'admin_master') OR public.has_role(auth.uid(), 'consultor')
);
CREATE POLICY "Admins and consultores can update pcmso_eventos" ON public.pcmso_eventos FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'admin_master') OR public.has_role(auth.uid(), 'consultor')
);
CREATE POLICY "Admins and consultores can delete pcmso_eventos" ON public.pcmso_eventos FOR DELETE TO authenticated USING (
  public.has_role(auth.uid(), 'admin_master') OR public.has_role(auth.uid(), 'consultor')
);

-- Atestados
CREATE TABLE public.atestados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  cid TEXT,
  dias INTEGER DEFAULT 1,
  data_inicio DATE,
  data_fim DATE,
  tipo TEXT DEFAULT 'nao_ocupacional',
  observacoes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.atestados ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view atestados" ON public.atestados FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and consultores can manage atestados" ON public.atestados FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'admin_master') OR public.has_role(auth.uid(), 'consultor')
);
CREATE POLICY "Admins and consultores can update atestados" ON public.atestados FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'admin_master') OR public.has_role(auth.uid(), 'consultor')
);
CREATE POLICY "Admins and consultores can delete atestados" ON public.atestados FOR DELETE TO authenticated USING (
  public.has_role(auth.uid(), 'admin_master') OR public.has_role(auth.uid(), 'consultor')
);

-- Documentos
CREATE TABLE public.documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  tipo_documento TEXT NOT NULL,
  titulo TEXT NOT NULL,
  data_emissao DATE,
  validade DATE,
  proximo_vencimento DATE,
  arquivo_url TEXT,
  status TEXT DEFAULT 'vigente',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view documentos" ON public.documentos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and consultores can manage documentos" ON public.documentos FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'admin_master') OR public.has_role(auth.uid(), 'consultor')
);
CREATE POLICY "Admins and consultores can update documentos" ON public.documentos FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'admin_master') OR public.has_role(auth.uid(), 'consultor')
);
CREATE POLICY "Admins and consultores can delete documentos" ON public.documentos FOR DELETE TO authenticated USING (
  public.has_role(auth.uid(), 'admin_master') OR public.has_role(auth.uid(), 'consultor')
);

-- Triggers for updated_at
CREATE TRIGGER update_pcmso_programas_updated_at BEFORE UPDATE ON public.pcmso_programas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_pcmso_eventos_updated_at BEFORE UPDATE ON public.pcmso_eventos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_documentos_updated_at BEFORE UPDATE ON public.documentos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
