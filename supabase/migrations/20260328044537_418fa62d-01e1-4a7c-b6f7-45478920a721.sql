
-- Add missing columns to empresas
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS valor_em_aberto NUMERIC DEFAULT 0;
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS proxima_cobranca DATE;

-- Add missing columns to empresa_contratos
ALTER TABLE public.empresa_contratos ADD COLUMN IF NOT EXISTS nome TEXT;
ALTER TABLE public.empresa_contratos ADD COLUMN IF NOT EXISTS validade DATE;
