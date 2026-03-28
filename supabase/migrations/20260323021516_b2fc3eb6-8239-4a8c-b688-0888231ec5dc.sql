
-- Add missing columns to planos
ALTER TABLE public.planos ADD COLUMN limite_usuarios INTEGER;
ALTER TABLE public.planos ADD COLUMN limite_colaboradores INTEGER;
ALTER TABLE public.planos ADD COLUMN limite_avaliacoes INTEGER;
ALTER TABLE public.planos ADD COLUMN valor_mensal NUMERIC;

-- Add ativa/ativo columns to unidades, setores, cargos
ALTER TABLE public.unidades ADD COLUMN ativa BOOLEAN DEFAULT true;
ALTER TABLE public.setores ADD COLUMN descricao TEXT;
ALTER TABLE public.setores ADD COLUMN ativo BOOLEAN DEFAULT true;
ALTER TABLE public.cargos ADD COLUMN ativo BOOLEAN DEFAULT true;

-- Add version to assessments
ALTER TABLE public.assessments ADD COLUMN version INTEGER DEFAULT 1;
