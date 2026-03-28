import { useAuth, AppRole } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import NotificationBell from '@/components/NotificationBell';
import logoIcon from '@/assets/logo-ergon-icon.png';

const ROLE_LABELS: Record<AppRole, string> = {
  admin_master: 'Admin Master',
  consultor: 'Consultor',
  empresa_admin: 'Admin Empresa',
  empresa_gestor: 'Gestor',
  colaborador: 'Colaborador',
};

const TopNav = () => {
  const { user, profile, primaryRole, signOut } = useAuth();
  const navigate = useNavigate();

  const roleLabel = primaryRole ? ROLE_LABELS[primaryRole] : '';
  const homeRoute = primaryRole === 'colaborador' ? '/meu-painel' : '/painel';

  return (
    <header
      className="neu-card"
      style={{ borderRadius: '0 0 22px 22px', marginBottom: 8 }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => navigate(homeRoute)}
          >
            <img src={logoIcon} alt="Ergon" className="h-10 w-auto" />
          </div>

          <Button
            onClick={() => navigate(homeRoute)}
            size="sm"
          >
            Menu
          </Button>

          <div className="flex items-center gap-4">
            <NotificationBell />
            <div
              className="text-right hidden sm:block cursor-pointer hover:opacity-80"
              onClick={() => navigate('/meu-perfil')}
            >
              <p className="text-sm font-medium" style={{ color: '#4c5563' }}>{profile?.full_name || user?.email}</p>
              <p className="text-xs" style={{ color: '#7a8599' }}>{roleLabel}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/meu-perfil')}
            >
              Meu Perfil
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={signOut}
            >
              Sair
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopNav;
