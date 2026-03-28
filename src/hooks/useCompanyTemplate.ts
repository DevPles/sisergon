import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook to load the active template for a given company and module type.
 * Falls back to global template if no company-specific one exists.
 */
export const useCompanyTemplate = (empresaId: string | undefined, tipo: string) => {
  return useQuery({
    queryKey: ['company-template', empresaId, tipo],
    queryFn: async () => {
      if (!empresaId || !tipo) return null;

      // 1. Try company-specific template
      const { data: companyTemplate } = await supabase
        .from('form_templates' as any)
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('tipo', tipo)
        .eq('status', 'ativo')
        .order('versao', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (companyTemplate) return companyTemplate as any;

      // 2. Fallback to global template
      const { data: globalTemplate } = await supabase
        .from('form_templates' as any)
        .select('*')
        .eq('is_global', true)
        .eq('tipo', tipo)
        .eq('status', 'ativo')
        .order('versao', { ascending: false })
        .limit(1)
        .maybeSingle();

      return (globalTemplate as any) || null;
    },
    enabled: !!empresaId && !!tipo,
  });
};

/**
 * Load template questions with their options
 */
export const useTemplateQuestions = (templateId: string | undefined) => {
  const sectionsQuery = useQuery({
    queryKey: ['template-sections-full', templateId],
    queryFn: async () => {
      if (!templateId) return [];
      const { data } = await supabase
        .from('form_template_sections' as any)
        .select('*')
        .eq('template_id', templateId)
        .order('ordem');
      return (data || []) as any[];
    },
    enabled: !!templateId,
  });

  const questionsQuery = useQuery({
    queryKey: ['template-questions-full', templateId],
    queryFn: async () => {
      if (!templateId) return [];
      const { data } = await supabase
        .from('form_template_questions' as any)
        .select('*')
        .eq('template_id', templateId)
        .eq('ativa', true)
        .order('ordem');
      return (data || []) as any[];
    },
    enabled: !!templateId,
  });

  const optionsQuery = useQuery({
    queryKey: ['template-options-full', templateId],
    queryFn: async () => {
      if (!questionsQuery.data?.length) return [];
      const qIds = questionsQuery.data.map((q: any) => q.id);
      const { data } = await supabase
        .from('form_template_options' as any)
        .select('*')
        .in('question_id', qIds)
        .order('ordem');
      return (data || []) as any[];
    },
    enabled: !!questionsQuery.data?.length,
  });

  return {
    sections: sectionsQuery.data || [],
    questions: questionsQuery.data || [],
    options: optionsQuery.data || [],
    isLoading: questionsQuery.isLoading || sectionsQuery.isLoading,
    getOptionsForQuestion: (questionId: string) =>
      (optionsQuery.data || []).filter((o: any) => o.question_id === questionId),
  };
};

/**
 * Create a version snapshot of a template before applying it
 */
export const createTemplateVersion = async (templateId: string) => {
  // Get template with all questions and options
  const { data: template } = await supabase
    .from('form_templates' as any)
    .select('*')
    .eq('id', templateId)
    .single();

  if (!template) throw new Error('Template not found');

  const { data: questions } = await supabase
    .from('form_template_questions' as any)
    .select('*')
    .eq('template_id', templateId)
    .order('ordem');

  const { data: sections } = await supabase
    .from('form_template_sections' as any)
    .select('*')
    .eq('template_id', templateId)
    .order('ordem');

  let options: any[] = [];
  if (questions && questions.length > 0) {
    const { data: opts } = await supabase
      .from('form_template_options' as any)
      .select('*')
      .in('question_id', (questions as any[]).map(q => q.id))
      .order('ordem');
    options = (opts || []) as any[];
  }

  const snapshot = { template, sections, questions, options };

  const { data: version, error } = await supabase
    .from('template_versions' as any)
    .insert({
      template_id: templateId,
      versao: (template as any).versao,
      snapshot,
    } as any)
    .select('id')
    .single();

  if (error) throw error;
  return version;
};

/**
 * Get company logo for reports
 */
export const useCompanyLogo = (empresaId: string | undefined) => {
  return useQuery({
    queryKey: ['company-logo', empresaId],
    queryFn: async () => {
      if (!empresaId) return null;
      const { data } = await supabase
        .from('empresas')
        .select('logo_url, razao_social, nome_fantasia, cnpj')
        .eq('id', empresaId)
        .single();
      return data as any;
    },
    enabled: !!empresaId,
  });
};
