import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook that checks if the user's company is financially blocked (inadimplente).
 * Returns { isBlocked, status } so components can restrict access.
 */
export const useFinancialAccess = () => {
  const { profile, isAdmin, isConsultor } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['financial-access', profile?.empresa_id],
    queryFn: async () => {
      if (!profile?.empresa_id) return { isBlocked: false, status: 'adimplente' };
      
      const { data: empresa } = await supabase
        .from('empresas')
        .select('status_financeiro, ativa')
        .eq('id', profile.empresa_id)
        .single();

      if (!empresa) return { isBlocked: false, status: 'adimplente' };

      // Admins and consultors are never blocked
      const blocked = empresa.status_financeiro === 'inadimplente' && !empresa.ativa;
      
      return {
        isBlocked: blocked,
        status: empresa.status_financeiro || 'adimplente',
        isActive: empresa.ativa,
      };
    },
    enabled: !!profile?.empresa_id && !isAdmin && !isConsultor,
  });

  // Admins and consultors are never blocked
  if (isAdmin || isConsultor) {
    return { isBlocked: false, status: 'adimplente', isLoading: false };
  }

  return {
    isBlocked: data?.isBlocked ?? false,
    status: data?.status ?? 'adimplente',
    isLoading,
  };
};
