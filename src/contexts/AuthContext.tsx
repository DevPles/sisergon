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
    const [profileRes, rolesRes] = await Promise.all([
      supabase.from('profiles').select('full_name, email, empresa_id').eq('id', userId).single(),
      supabase.from('user_roles').select('role').eq('user_id', userId),
    ]);
    if (profileRes.data) setProfile(profileRes.data);
    if (rolesRes.data) setRoles(rolesRes.data.map((r) => r.role as AppRole));
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(() => fetchUserData(session.user.id), 0);
      } else {
        setProfile(null);
        setRoles([]);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) fetchUserData(session.user.id);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
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
