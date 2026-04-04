import { useState } from 'react';
import { useAuth, AppRole } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import NotificationBell from '@/components/NotificationBell';
import logoIcon from '@/assets/logo-ergon-icon.png';
import { Menu, X } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

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
  const isMobile = useIsMobile();
  const [menuOpen, setMenuOpen] = useState(false);

  const roleLabel = primaryRole ? ROLE_LABELS[primaryRole] : '';
  const homeRoute = primaryRole === 'colaborador' ? '/meu-painel' : '/painel';

  const navAction = (path: string) => {
    navigate(path);
    setMenuOpen(false);
  };

  return (
    <header
      className="neu-card relative"
      style={{ borderRadius: '0 0 22px 22px', marginBottom: 8 }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => navAction(homeRoute)}
          >
            <img src={logoIcon} alt="Ergon" className="h-8 sm:h-10 w-auto" />
          </div>

          {/* Desktop nav */}
          <div className="hidden sm:flex items-center gap-3">
            <Button onClick={() => navigate(homeRoute)} size="sm">Menu</Button>
            <NotificationBell />
            <div
              className="text-right cursor-pointer hover:opacity-80"
              onClick={() => navigate('/meu-perfil')}
            >
              <p className="text-sm font-medium" style={{ color: '#4c5563' }}>{profile?.full_name || user?.email}</p>
              <p className="text-xs" style={{ color: '#7a8599' }}>{roleLabel}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/meu-perfil')}>Meu Perfil</Button>
            <Button variant="outline" size="sm" onClick={signOut}>Sair</Button>
          </div>

          {/* Mobile nav buttons */}
          <div className="flex sm:hidden items-center gap-2">
            <NotificationBell />
            <Button variant="ghost" size="icon" onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {isMobile && menuOpen && (
        <div className="sm:hidden absolute left-0 right-0 top-full bg-background border-t shadow-lg rounded-b-xl z-50 animate-in slide-in-from-top-2 duration-200">
          <div className="px-4 py-3 border-b">
            <p className="text-sm font-medium" style={{ color: '#4c5563' }}>{profile?.full_name || user?.email}</p>
            <p className="text-xs" style={{ color: '#7a8599' }}>{roleLabel}</p>
          </div>
          <div className="flex flex-col p-2 gap-1">
            <Button variant="ghost" className="justify-start" onClick={() => navAction(homeRoute)}>Painel Principal</Button>
            <Button variant="ghost" className="justify-start" onClick={() => navAction('/meu-perfil')}>Meu Perfil</Button>
            <Button variant="ghost" className="justify-start" onClick={() => navAction('/notificacoes')}>Notificações</Button>
            <Button variant="ghost" className="justify-start text-destructive hover:text-destructive" onClick={() => { signOut(); setMenuOpen(false); }}>Sair</Button>
          </div>
        </div>
      )}
    </header>
  );
};

export default TopNav;
