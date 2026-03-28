
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
  filled_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.checklists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view checklists" ON public.checklists FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert checklists" ON public.checklists FOR INSERT TO authenticated WITH CHECK (true);
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
CREATE POLICY "Authenticated can insert action_plans from assessments" ON public.action_plans FOR INSERT TO authenticated WITH CHECK (true);
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
