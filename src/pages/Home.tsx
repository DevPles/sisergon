import { useNavigate } from 'react-router-dom';
import { useAuth, AppRole } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import AnimatedCard from '@/components/AnimatedCard';
import PageTransition from '@/components/PageTransition';

interface NavCard {
  title: string;
  description: string;
  path: string;
  countQuery?: string;
  allowedRoles: AppRole[];
}

const navCards: NavCard[] = [
  {
    title: 'Cadastros',
    description: 'Gestão de empresas, colaboradores, unidades, setores e cargos',
    path: '/cadastros',
    countQuery: 'empresas',
    allowedRoles: ['admin_master', 'consultor', 'empresa_admin', 'empresa_gestor'],
  },
  {
    title: 'Avaliações AEP',
    description: 'Avaliação Ergonômica Preliminar com formulário completo e score automático',
    path: '/aep',
    countQuery: 'aep',
    allowedRoles: ['admin_master', 'consultor'],
  },
  {
    title: 'Análises AET',
    description: 'Análise Ergonômica do Trabalho aprofundada conforme NR-17',
    path: '/aet',
    countQuery: 'aet',
    allowedRoles: ['admin_master', 'consultor'],
  },
  {
    title: 'Riscos Psicossociais',
    description: 'Avaliação de fatores psicossociais e organizacionais com matriz S×P',
    path: '/riscos-psicossociais',
    countQuery: 'arp',
    allowedRoles: ['admin_master', 'consultor'],
  },
  {
    title: 'PCMSO',
    description: 'Programa de Controle Médico de Saúde Ocupacional — NR-07',
    path: '/pcmso',
    allowedRoles: ['admin_master', 'consultor', 'empresa_admin', 'empresa_gestor'],
  },
  {
    title: 'Atestados',
    description: 'Controle de atestados médicos e afastamentos',
    path: '/atestados',
    allowedRoles: ['admin_master', 'consultor', 'empresa_admin', 'empresa_gestor'],
  },
  {
    title: 'Checklists Mensais',
    description: 'Monitoramento contínuo mensal dos colaboradores',
    path: '/checklists',
    countQuery: 'checklists',
    allowedRoles: ['admin_master', 'consultor', 'empresa_admin', 'empresa_gestor'],
  },
  {
    title: 'Planos de Ação',
    description: 'Gestão de ações corretivas e preventivas',
    path: '/planos-acao',
    countQuery: 'action_plans',
    allowedRoles: ['admin_master', 'consultor', 'empresa_admin', 'empresa_gestor'],
  },
  {
    title: 'Documentos',
    description: 'Gestão centralizada de documentos e laudos SST',
    path: '/documentos',
    allowedRoles: ['admin_master', 'consultor', 'empresa_admin', 'empresa_gestor'],
  },
  {
    title: 'Laudos e Relatórios',
    description: 'Geração e gestão de documentos e laudos em PDF',
    path: '/laudos',
    allowedRoles: ['admin_master', 'consultor', 'empresa_admin', 'empresa_gestor'],
  },
  {
    title: 'Dashboard',
    description: 'Indicadores, gráficos e visão gerencial',
    path: '/dashboard',
    allowedRoles: ['admin_master', 'consultor', 'empresa_admin', 'empresa_gestor'],
  },
  {
    title: 'Configurações',
    description: 'Usuários, perfis, templates e parâmetros do sistema',
    path: '/configuracoes',
    allowedRoles: ['admin_master'],
  },
];
const ROLE_LABELS: Record<AppRole, string> = {
  admin_master: 'Administrador Master',
  consultor: 'Consultor / Avaliador',
  empresa_admin: 'Administrador da Empresa',
  empresa_gestor: 'Gestor da Empresa',
  colaborador: 'Colaborador',
};

const Home = () => {
  const navigate = useNavigate();
  const { hasAnyRole, primaryRole } = useAuth();

  const { data: counts } = useQuery({
    queryKey: ['home-counts'],
    queryFn: async () => {
      const [empresas, colaboradores, aep, aet, arp, checklists, action_plans] = await Promise.all([
        supabase.from('empresas').select('id', { count: 'exact', head: true }),
        supabase.from('colaboradores').select('id', { count: 'exact', head: true }),
        supabase.from('assessments').select('id', { count: 'exact', head: true }).eq('type', 'aep'),
        supabase.from('assessments').select('id', { count: 'exact', head: true }).eq('type', 'aet'),
        supabase.from('assessments').select('id', { count: 'exact', head: true }).eq('type', 'arp'),
        supabase.from('checklists').select('id', { count: 'exact', head: true }),
        supabase.from('action_plans').select('id', { count: 'exact', head: true }),
      ]);
      return {
        empresas: empresas.count ?? 0,
        colaboradores: colaboradores.count ?? 0,
        aep: aep.count ?? 0,
        aet: aet.count ?? 0,
        arp: arp.count ?? 0,
        checklists: checklists.count ?? 0,
        action_plans: action_plans.count ?? 0,
      };
    },
  });

  const visibleCards = navCards.filter((card) =>
    hasAnyRole(...card.allowedRoles)
  );

  return (
    <PageTransition>
      <div style={{ minHeight: '100%' }}>
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: 'Space Grotesk', color: '#4c5563' }}>Painel Principal</h1>
          <p className="mt-1" style={{ color: '#7a8599' }}>
            {primaryRole ? ROLE_LABELS[primaryRole] : 'Selecione um módulo para começar'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {visibleCards.map((card, idx) => (
            <AnimatedCard
              key={card.path}
              index={idx}
              className="cursor-pointer group h-full flex flex-col p-4 sm:p-6 rounded-[18px] sm:rounded-[22px]"
              style={{
                background: '#dde2e8',
                boxShadow: '9px 9px 18px #a4afc2, -9px -9px 18px #ffffff',
              }}
              className="cursor-pointer group h-full flex flex-col p-4 sm:p-6 rounded-[18px] sm:rounded-[22px] transition-all duration-300 hover:bg-[#1E40AF] hover:scale-[1.02]"
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#1E40AF';
                e.currentTarget.style.boxShadow = '12px 12px 24px #1E3A8A, -12px -12px 24px #ffffff00';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#dde2e8';
                e.currentTarget.style.boxShadow = '9px 9px 18px #a4afc2, -9px -9px 18px #ffffff';
              }}
              onClick={() => navigate(card.path)}
            >
              <h3 className="text-lg font-semibold transition-all duration-300 group-hover:text-white group-hover:text-xl" style={{ fontFamily: 'Space Grotesk', color: '#4c5563' }}>
                {card.title}
              </h3>
              <p className="text-sm mt-2 leading-relaxed flex-1 transition-all duration-300 group-hover:text-blue-50 group-hover:text-base" style={{ color: '#7a8599' }}>
                {card.description}
              </p>
              <div className="mt-4 pt-4 transition-all duration-300 group-hover:border-blue-400" style={{ borderTop: '1px solid #c5ccd6' }}>
                {card.countQuery && counts ? (
                  <>
                    <span className="text-2xl font-bold transition-all duration-300 group-hover:text-white group-hover:text-3xl" style={{ color: '#4c5563' }}>
                      {counts[card.countQuery as keyof typeof counts] ?? 0}
                    </span>
                    <span className="text-sm ml-2 transition-all duration-300 group-hover:text-blue-100 group-hover:text-base" style={{ color: '#7a8599' }}>registros</span>
                  </>
                ) : (
                  <span className="text-sm transition-all duration-300 group-hover:text-blue-100 group-hover:text-base" style={{ color: '#7a8599' }}>Acessar módulo</span>
                )}
              </div>
            </AnimatedCard>
          ))}
        </div>
      </div>
    </PageTransition>
  );
};

export default Home;
