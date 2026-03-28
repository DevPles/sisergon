import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export type AppRole = 'admin_master' | 'consultor' | 'empresa_gestor' | 'empresa_admin' | 'colaborador';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: { full_name: string; email: string; empresa_id: string | null } | null;
  roles: AppRole[];
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
  hasAnyRole: (...roles: AppRole[]) => boolean;
  isAdmin: boolean;
  isConsultor: boolean;
  isGestor: boolean;
  isEmpresaAdmin: boolean;
  isColaborador: boolean;
  primaryRole: AppRole | null;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ROLE_PRIORITY: AppRole[] = ['admin_master', 'consultor', 'empresa_admin', 'empresa_gestor', 'colaborador'];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AuthContextType['profile']>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (userId: string) => {
    try {
      const [profileRes, rolesRes] = await Promise.all([
        supabase.from('profiles').select('full_name, email, empresa_id').eq('id', userId).maybeSingle(),
        supabase.from('user_roles').select('role').eq('user_id', userId),
      ]);

      setProfile(profileRes.data ?? null);
      setRoles((rolesRes.data ?? []).map((r) => r.role as AppRole));
    } catch (error) {
      console.error('Erro ao carregar perfil/roles:', error);
      setProfile(null);
      setRoles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const handleSession = async (nextSession: Session | null) => {
      if (!isMounted) return;

      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (!nextSession?.user) {
        setProfile(null);
        setRoles([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      await fetchUserData(nextSession.user.id);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      // Evita deadlock do supabase-js ao consultar DB dentro do callback
      setTimeout(() => {
        void handleSession(nextSession);
      }, 0);
    });

    void supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      await handleSession(initialSession);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setRoles([]);
    window.location.href = '/';
  };

  const hasRole = (role: AppRole) => roles.includes(role);
  const hasAnyRole = (...rs: AppRole[]) => rs.some(r => roles.includes(r));
  const isAdmin = hasRole('admin_master');
  const isConsultor = hasRole('consultor');
  const isGestor = hasRole('empresa_gestor');
  const isEmpresaAdmin = hasRole('empresa_admin');
  const isColaborador = hasRole('colaborador');
  const primaryRole = ROLE_PRIORITY.find(r => roles.includes(r)) || null;

  const refreshProfile = async () => {
    if (user?.id) await fetchUserData(user.id);
  };

  return (
    <AuthContext.Provider value={{
      session, user, profile, roles, loading,
      signIn, signOut, hasRole, hasAnyRole,
      isAdmin, isConsultor, isGestor, isEmpresaAdmin, isColaborador,
      primaryRole, refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
