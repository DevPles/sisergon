
-- Add missing columns to consultor_empresas
ALTER TABLE public.consultor_empresas RENAME COLUMN consultor_id TO user_id;
ALTER TABLE public.consultor_empresas ADD COLUMN nivel_atuacao TEXT DEFAULT 'padrao';
ALTER TABLE public.consultor_empresas ADD COLUMN ativo BOOLEAN DEFAULT true;

-- Drop the old unique constraint and recreate with new column name
ALTER TABLE public.consultor_empresas DROP CONSTRAINT IF EXISTS consultor_empresas_consultor_id_empresa_id_key;
ALTER TABLE public.consultor_empresas ADD CONSTRAINT consultor_empresas_user_id_empresa_id_key UNIQUE (user_id, empresa_id);
