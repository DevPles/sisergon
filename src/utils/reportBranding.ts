import { supabase } from '@/integrations/supabase/client';

export async function fetchCompanyLogoUrl(empresaId?: string | null): Promise<string | undefined> {
  if (!empresaId) return undefined;

  // Company logo_url (from Identidade Visual in Cadastro)
  const { data: empresa } = await supabase
    .from('empresas')
    .select('logo_url')
    .eq('id', empresaId)
    .maybeSingle();

  if (empresa?.logo_url) return empresa.logo_url;

  // Fallback to profile avatar
  const { data: profile } = await supabase
    .from('profiles')
    .select('avatar_url')
    .eq('empresa_id', empresaId)
    .not('avatar_url', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return profile?.avatar_url || undefined;
}

export async function fetchEvaluatorLabel(evaluatorId?: string | null, fallback = ''): Promise<string> {
  if (!evaluatorId) return fallback;

  const { data, error } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', evaluatorId)
    .maybeSingle();

  if (error) return fallback;
  return data?.full_name || data?.email || fallback;
}

export async function fetchCompanyBranding(empresaId?: string | null) {
  if (!empresaId) return null;

  const { data } = await supabase
    .from('empresas')
    .select('logo_url, razao_social, nome_fantasia, cnpj, endereco_logradouro, endereco_numero, endereco_bairro, endereco_cidade, endereco_uf, endereco_cep, responsavel_telefone, responsavel_email')
    .eq('id', empresaId)
    .maybeSingle();

  return data;
}
