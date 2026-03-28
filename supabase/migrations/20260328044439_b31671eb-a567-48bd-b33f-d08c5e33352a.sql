
-- Enum for roles
CREATE TYPE public.app_role AS ENUM ('admin_master', 'consultor', 'empresa_admin', 'empresa_gestor', 'colaborador');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  empresa_id UUID,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (true);

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Empresas
CREATE TABLE public.empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT,
  cnpj TEXT,
  cnae TEXT,
  grau_risco INTEGER,
  endereco_logradouro TEXT,
  endereco_numero TEXT,
  endereco_complemento TEXT,
  endereco_bairro TEXT,
  endereco_cidade TEXT,
  endereco_uf TEXT,
  endereco_cep TEXT,
  responsavel_nome TEXT,
  responsavel_email TEXT,
  responsavel_telefone TEXT,
  ativa BOOLEAN NOT NULL DEFAULT true,
  plano_id UUID,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view empresas" ON public.empresas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and consultores can insert empresas" ON public.empresas FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'admin_master') OR public.has_role(auth.uid(), 'consultor')
);
CREATE POLICY "Admins and consultores can update empresas" ON public.empresas FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'admin_master') OR public.has_role(auth.uid(), 'consultor')
);
CREATE POLICY "Admins can delete empresas" ON public.empresas FOR DELETE TO authenticated USING (
  public.has_role(auth.uid(), 'admin_master')
);

-- Unidades
CREATE TABLE public.unidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  endereco TEXT,
  ativa BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.unidades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view unidades" ON public.unidades FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and consultores can insert unidades" ON public.unidades FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'admin_master') OR public.has_role(auth.uid(), 'consultor')
);
CREATE POLICY "Admins and consultores can update unidades" ON public.unidades FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'admin_master') OR public.has_role(auth.uid(), 'consultor')
);
CREATE POLICY "Admins and consultores can delete unidades" ON public.unidades FOR DELETE TO authenticated USING (
  public.has_role(auth.uid(), 'admin_master') OR public.has_role(auth.uid(), 'consultor')
);

-- Setores
CREATE TABLE public.setores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.setores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view setores" ON public.setores FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and consultores can insert setores" ON public.setores FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'admin_master') OR public.has_role(auth.uid(), 'consultor')
);
CREATE POLICY "Admins and consultores can update setores" ON public.setores FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'admin_master') OR public.has_role(auth.uid(), 'consultor')
);
CREATE POLICY "Admins and consultores can delete setores" ON public.setores FOR DELETE TO authenticated USING (
  public.has_role(auth.uid(), 'admin_master') OR public.has_role(auth.uid(), 'consultor')
);

-- Cargos
CREATE TABLE public.cargos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cbo TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.cargos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view cargos" ON public.cargos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and consultores can insert cargos" ON public.cargos FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'admin_master') OR public.has_role(auth.uid(), 'consultor')
);
CREATE POLICY "Admins and consultores can update cargos" ON public.cargos FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'admin_master') OR public.has_role(auth.uid(), 'consultor')
);
CREATE POLICY "Admins and consultores can delete cargos" ON public.cargos FOR DELETE TO authenticated USING (
  public.has_role(auth.uid(), 'admin_master') OR public.has_role(auth.uid(), 'consultor')
);

-- Colaboradores
CREATE TABLE public.colaboradores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_completo TEXT NOT NULL,
  matricula TEXT,
  cpf TEXT,
  data_nascimento DATE,
  sexo TEXT,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  unidade_id UUID REFERENCES public.unidades(id),
  setor_id UUID REFERENCES public.setores(id),
  cargo_id UUID REFERENCES public.cargos(id),
  data_admissao DATE,
  jornada TEXT,
  turno TEXT,
  gestor_responsavel TEXT,
  status TEXT NOT NULL DEFAULT 'ativo',
  user_id UUID REFERENCES auth.users(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.colaboradores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view colaboradores" ON public.colaboradores FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and consultores can insert colaboradores" ON public.colaboradores FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'admin_master') OR public.has_role(auth.uid(), 'consultor')
);
CREATE POLICY "Admins and consultores can update colaboradores" ON public.colaboradores FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'admin_master') OR public.has_role(auth.uid(), 'consultor')
);
CREATE POLICY "Admins and consultores can delete colaboradores" ON public.colaboradores FOR DELETE TO authenticated USING (
  public.has_role(auth.uid(), 'admin_master') OR public.has_role(auth.uid(), 'consultor')
);

-- Assessments (AEP, AET, ARP)
CREATE TABLE public.assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('aep', 'aet', 'arp')),
  title TEXT NOT NULL,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  unidade_id UUID REFERENCES public.unidades(id),
  setor_id UUID REFERENCES public.setores(id),
  cargo_id UUID REFERENCES public.cargos(id),
  colaborador_id UUID REFERENCES public.colaboradores(id),
  description TEXT,
  status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'finalizado')),
  score_total NUMERIC,
  risk_classification TEXT,
  needs_aet BOOLEAN DEFAULT false,
  evaluator_id UUID REFERENCES auth.users(id),
  finalized_at TIMESTAMPTZ,
  version INTEGER DEFAULT 1,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view assessments" ON public.assessments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and consultores can insert assessments" ON public.assessments FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'admin_master') OR public.has_role(auth.uid(), 'consultor')
);
CREATE POLICY "Admins and consultores can update assessments" ON public.assessments FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'admin_master') OR public.has_role(auth.uid(), 'consultor')
);
CREATE POLICY "Admins and consultores can delete assessments" ON public.assessments FOR DELETE TO authenticated USING (
  public.has_role(auth.uid(), 'admin_master') OR public.has_role(auth.uid(), 'consultor')
);

-- Assessment items
CREATE TABLE public.assessment_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  domain TEXT,
  question_number INTEGER,
  question_text TEXT,
  value NUMERIC,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.assessment_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view assessment_items" ON public.assessment_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and consultores can insert assessment_items" ON public.assessment_items FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'admin_master') OR public.has_role(auth.uid(), 'consultor')
);
CREATE POLICY "Admins and consultores can update assessment_items" ON public.assessment_items FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'admin_master') OR public.has_role(auth.uid(), 'consultor')
);
CREATE POLICY "Admins and consultores can delete assessment_items" ON public.assessment_items FOR DELETE TO authenticated USING (
  public.has_role(auth.uid(), 'admin_master') OR public.has_role(auth.uid(), 'consultor')
);

-- Checklists
CREATE TABLE public.checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  colaborador_id UUID REFERENCES public.colaboradores(id),
  month INTEGER,
  year INTEGER,
  responses JSONB DEFAULT '{}',
  observations TEXT,
  score NUMERIC,
  confirmed_at TIMESTAMPTZ,
  filled_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.checklists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view checklists" ON public.checklists FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert own checklists" ON public.checklists FOR INSERT TO authenticated WITH CHECK (auth.uid() = filled_by);
CREATE POLICY "Admins and consultores can update checklists" ON public.checklists FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'admin_master') OR public.has_role(auth.uid(), 'consultor')
);
CREATE POLICY "Admins and consultores can delete checklists" ON public.checklists FOR DELETE TO authenticated USING (
  public.has_role(auth.uid(), 'admin_master') OR public.has_role(auth.uid(), 'consultor')
);

-- Action Plans
CREATE TABLE public.action_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  assessment_id UUID REFERENCES public.assessments(id),
  action TEXT NOT NULL,
  priority TEXT DEFAULT 'media',
  responsible TEXT,
  due_date DATE,
  origin TEXT DEFAULT 'manual',
  status TEXT NOT NULL DEFAULT 'pendente',
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.action_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view action_plans" ON public.action_plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and consultores can insert action_plans" ON public.action_plans FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'admin_master') OR public.has_role(auth.uid(), 'consultor')
);
CREATE POLICY "Admins and consultores can update action_plans" ON public.action_plans FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'admin_master') OR public.has_role(auth.uid(), 'consultor')
);
CREATE POLICY "Admins and consultores can delete action_plans" ON public.action_plans FOR DELETE TO authenticated USING (
  public.has_role(auth.uid(), 'admin_master') OR public.has_role(auth.uid(), 'consultor')
);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_empresas_updated_at BEFORE UPDATE ON public.empresas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_colaboradores_updated_at BEFORE UPDATE ON public.colaboradores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_assessments_updated_at BEFORE UPDATE ON public.assessments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_action_plans_updated_at BEFORE UPDATE ON public.action_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Storage bucket for avatars
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Authenticated can upload avatars" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars');
CREATE POLICY "Authenticated can update avatars" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'avatars');

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
  limite_usuarios INTEGER,
  limite_colaboradores INTEGER,
  limite_avaliacoes INTEGER,
  valor_mensal NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.planos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view planos" ON public.planos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage planos" ON public.planos FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), 'admin_master')
);

-- Add FK from empresas to planos
ALTER TABLE public.empresas ADD CONSTRAINT empresas_plano_id_fkey FOREIGN KEY (plano_id) REFERENCES public.planos(id);

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
CREATE TRIGGER update_contratos_updated_at BEFORE UPDATE ON public.contratos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Consultor-empresa relationship
CREATE TABLE public.consultor_empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nivel_atuacao TEXT DEFAULT 'padrao',
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, empresa_id)
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

-- Notifications
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

-- PCMSO Eventos
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
  tipo TEXT NOT NULL DEFAULT 'medico',
  data_inicio DATE NOT NULL,
  data_fim DATE,
  dias INTEGER,
  cid TEXT,
  medico TEXT,
  crm TEXT,
  observacoes TEXT,
  arquivo_url TEXT,
  status TEXT DEFAULT 'pendente',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.atestados ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view atestados" ON public.atestados FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and consultores can insert atestados" ON public.atestados FOR INSERT TO authenticated WITH CHECK (
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
  titulo TEXT NOT NULL,
  tipo TEXT NOT NULL,
  descricao TEXT,
  arquivo_url TEXT,
  arquivo_nome TEXT,
  tamanho INTEGER,
  validade DATE,
  status TEXT DEFAULT 'ativo',
  tags TEXT[],
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view documentos" ON public.documentos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and consultores can insert documentos" ON public.documentos FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'admin_master') OR public.has_role(auth.uid(), 'consultor')
);
CREATE POLICY "Admins and consultores can update documentos" ON public.documentos FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'admin_master') OR public.has_role(auth.uid(), 'consultor')
);
CREATE POLICY "Admins and consultores can delete documentos" ON public.documentos FOR DELETE TO authenticated USING (
  public.has_role(auth.uid(), 'admin_master') OR public.has_role(auth.uid(), 'consultor')
);

-- Storage bucket for documents
INSERT INTO storage.buckets (id, name, public) VALUES ('documentos', 'documentos', false);
CREATE POLICY "Authenticated can view documentos files" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'documentos');
CREATE POLICY "Authenticated can upload documentos files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'documentos');
CREATE POLICY "Authenticated can update documentos files" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'documentos');
CREATE POLICY "Authenticated can delete documentos files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'documentos');

-- Laudos
CREATE TABLE public.laudos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  responsavel_tecnico TEXT,
  registro_profissional TEXT,
  data_emissao DATE,
  data_validade DATE,
  status TEXT DEFAULT 'rascunho',
  conteudo JSONB DEFAULT '{}',
  arquivo_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.laudos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view laudos" ON public.laudos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and consultores can insert laudos" ON public.laudos FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'admin_master') OR public.has_role(auth.uid(), 'consultor')
);
CREATE POLICY "Admins and consultores can update laudos" ON public.laudos FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'admin_master') OR public.has_role(auth.uid(), 'consultor')
);
CREATE POLICY "Admins and consultores can delete laudos" ON public.laudos FOR DELETE TO authenticated USING (
  public.has_role(auth.uid(), 'admin_master') OR public.has_role(auth.uid(), 'consultor')
);

-- Faturamento
CREATE TABLE public.faturamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  valor NUMERIC NOT NULL,
  data_vencimento DATE,
  data_pagamento DATE,
  status TEXT DEFAULT 'pendente',
  tipo TEXT DEFAULT 'mensalidade',
  observacoes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.faturamento ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view faturamento" ON public.faturamento FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage faturamento" ON public.faturamento FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), 'admin_master')
);

-- Company templates
CREATE TABLE public.company_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL,
  conteudo JSONB DEFAULT '{}',
  ativo BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.company_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view company_templates" ON public.company_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and consultores can manage company_templates" ON public.company_templates FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), 'admin_master') OR public.has_role(auth.uid(), 'consultor')
);

-- Triggers for all new tables with updated_at
CREATE TRIGGER update_pcmso_programas_updated_at BEFORE UPDATE ON public.pcmso_programas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_pcmso_eventos_updated_at BEFORE UPDATE ON public.pcmso_eventos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_atestados_updated_at BEFORE UPDATE ON public.atestados FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_documentos_updated_at BEFORE UPDATE ON public.documentos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_laudos_updated_at BEFORE UPDATE ON public.laudos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_faturamento_updated_at BEFORE UPDATE ON public.faturamento FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_company_templates_updated_at BEFORE UPDATE ON public.company_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Riscos psicossociais
CREATE TABLE public.riscos_psicossociais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  colaborador_id UUID REFERENCES public.colaboradores(id),
  setor_id UUID REFERENCES public.setores(id),
  tipo_risco TEXT NOT NULL,
  descricao TEXT,
  nivel_risco TEXT DEFAULT 'medio',
  medidas_controle TEXT,
  responsavel TEXT,
  prazo DATE,
  status TEXT DEFAULT 'identificado',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.riscos_psicossociais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view riscos_psicossociais" ON public.riscos_psicossociais FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and consultores can manage riscos_psicossociais" ON public.riscos_psicossociais FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), 'admin_master') OR public.has_role(auth.uid(), 'consultor')
);
CREATE TRIGGER update_riscos_psicossociais_updated_at BEFORE UPDATE ON public.riscos_psicossociais FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
