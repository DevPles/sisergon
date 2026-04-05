import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth, AppRole } from "@/contexts/AuthContext";

import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import LandingPage from "./pages/LandingPage";
import Home from "./pages/Home";
import AppLayout from "./components/AppLayout";
import EmpresaDetail from "./pages/empresas/EmpresaDetail";
import CadastrosPage from "./pages/cadastros/CadastrosPage";
import AEPList from "./pages/aep/AEPList";
import AEPForm from "./pages/aep/AEPForm";
import AETList from "./pages/aet/AETList";
import AETForm from "./pages/aet/AETForm";
import RiscosPsicossociaisList from "./pages/riscos/RiscosPsicossociaisList";
import LikertQuestionnaireForm from "./pages/riscos/LikertQuestionnaireForm";
import ARPForm from "./pages/riscos/ARPForm";
import ChecklistsList from "./pages/checklists/ChecklistsList";
import ChecklistForm from "./pages/checklists/ChecklistForm";
import PlanosAcaoList from "./pages/planos/PlanosAcaoList";
import PlanoAcaoForm from "./pages/planos/PlanoAcaoForm";
import LaudosList from "./pages/laudos/LaudosList";
import DashboardPage from "./pages/dashboard/DashboardPage";
import ConfiguracoesPage from "./pages/configuracoes/ConfiguracoesPage";
import ColaboradorPortal from "./pages/colaborador/ColaboradorPortal";
import ConsultorDashboard from "./pages/consultor/ConsultorDashboard";
import EmpresaAdminDashboard from "./pages/empresa/EmpresaAdminDashboard";
import EmpresaGestorDashboard from "./pages/empresa/EmpresaGestorDashboard";
import PCMSOPage from "./pages/pcmso/PCMSOPage";
import AtestadosPage from "./pages/atestados/AtestadosPage";
import DocumentosPage from "./pages/documentos/DocumentosPage";
import NotificacoesPage from "./pages/notificacoes/NotificacoesPage";

import MeuPerfil from "./pages/perfil/MeuPerfil";
import NotFound from "./pages/NotFound";
import LoadingScreen from "./components/LoadingScreen";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (session) return <Navigate to="/painel" replace />;
  return <>{children}</>;
};

const RoleGuard = ({ children, allowed }: { children: React.ReactNode; allowed: AppRole[] }) => {
  const { hasAnyRole, loading, primaryRole } = useAuth();
  if (loading) return null;
  if (!hasAnyRole(...allowed)) {
    if (primaryRole === 'colaborador') return <Navigate to="/meu-painel" replace />;
    if (primaryRole === 'consultor') return <Navigate to="/painel-consultor" replace />;
    if (primaryRole === 'empresa_admin') return <Navigate to="/painel-empresa" replace />;
    if (primaryRole === 'empresa_gestor') return <Navigate to="/painel-gestor" replace />;
    return <Navigate to="/painel" replace />;
  }
  return <>{children}</>;
};

const RoleBasedHome = () => {
  const { primaryRole, loading } = useAuth();
  if (loading) return null;
  if (primaryRole === 'colaborador') return <Navigate to="/meu-painel" replace />;
  if (primaryRole === 'consultor') return <Navigate to="/painel-consultor" replace />;
  if (primaryRole === 'empresa_admin') return <Navigate to="/painel-empresa" replace />;
  if (primaryRole === 'empresa_gestor') return <Navigate to="/painel-gestor" replace />;
  return <Home />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/painel" element={<RoleBasedHome />} />
              
              <Route path="/meu-painel" element={
                <RoleGuard allowed={['colaborador']}><ColaboradorPortal /></RoleGuard>
              } />
              <Route path="/painel-consultor" element={
                <RoleGuard allowed={['consultor']}><ConsultorDashboard /></RoleGuard>
              } />
              <Route path="/painel-empresa" element={
                <RoleGuard allowed={['empresa_admin']}><EmpresaAdminDashboard /></RoleGuard>
              } />
              <Route path="/painel-gestor" element={
                <RoleGuard allowed={['empresa_gestor']}><EmpresaGestorDashboard /></RoleGuard>
              } />

              <Route path="/cadastros" element={
                <RoleGuard allowed={['admin_master', 'consultor', 'empresa_admin', 'empresa_gestor']}><CadastrosPage /></RoleGuard>
              } />
              <Route path="/empresas/:id" element={
                <RoleGuard allowed={['admin_master', 'consultor', 'empresa_admin', 'empresa_gestor']}><EmpresaDetail /></RoleGuard>
              } />
              <Route path="/aep" element={
                <RoleGuard allowed={['admin_master', 'consultor']}><AEPList /></RoleGuard>
              } />
              <Route path="/aep/:id" element={
                <RoleGuard allowed={['admin_master', 'consultor']}><AEPForm /></RoleGuard>
              } />
              <Route path="/aet" element={
                <RoleGuard allowed={['admin_master', 'consultor']}><AETList /></RoleGuard>
              } />
              <Route path="/aet/:id" element={
                <RoleGuard allowed={['admin_master', 'consultor']}><AETForm /></RoleGuard>
              } />
              <Route path="/riscos-psicossociais" element={
                <RoleGuard allowed={['admin_master', 'consultor']}><RiscosPsicossociaisList /></RoleGuard>
              } />
              <Route path="/riscos-psicossociais/likert" element={
                <RoleGuard allowed={['admin_master', 'consultor']}><LikertQuestionnaireForm /></RoleGuard>
              } />
              <Route path="/riscos-psicossociais/:id" element={
                <RoleGuard allowed={['admin_master', 'consultor']}><ARPForm /></RoleGuard>
              } />
              <Route path="/checklists" element={
                <RoleGuard allowed={['admin_master', 'consultor', 'empresa_admin', 'empresa_gestor', 'colaborador']}><ChecklistsList /></RoleGuard>
              } />
              <Route path="/checklists/:id" element={
                <RoleGuard allowed={['admin_master', 'consultor', 'empresa_admin', 'empresa_gestor', 'colaborador']}><ChecklistForm /></RoleGuard>
              } />
              <Route path="/planos-acao" element={
                <RoleGuard allowed={['admin_master', 'consultor', 'empresa_admin', 'empresa_gestor']}><PlanosAcaoList /></RoleGuard>
              } />
              <Route path="/planos-acao/:id" element={
                <RoleGuard allowed={['admin_master', 'consultor', 'empresa_admin', 'empresa_gestor']}><PlanoAcaoForm /></RoleGuard>
              } />
              <Route path="/laudos" element={
                <RoleGuard allowed={['admin_master', 'consultor', 'empresa_admin', 'empresa_gestor']}><LaudosList /></RoleGuard>
              } />
              <Route path="/pcmso" element={
                <RoleGuard allowed={['admin_master', 'consultor', 'empresa_admin', 'empresa_gestor']}><PCMSOPage /></RoleGuard>
              } />
              <Route path="/atestados" element={
                <RoleGuard allowed={['admin_master', 'consultor', 'empresa_admin', 'empresa_gestor']}><AtestadosPage /></RoleGuard>
              } />
              <Route path="/documentos" element={
                <RoleGuard allowed={['admin_master', 'consultor', 'empresa_admin', 'empresa_gestor']}><DocumentosPage /></RoleGuard>
              } />
              <Route path="/meu-perfil" element={<MeuPerfil />} />
              <Route path="/notificacoes" element={<NotificacoesPage />} />
              <Route path="/dashboard" element={
                <RoleGuard allowed={['admin_master', 'consultor', 'empresa_admin', 'empresa_gestor']}><DashboardPage /></RoleGuard>
              } />
              <Route path="/faturamento" element={<Navigate to="/cadastros" replace />} />
              <Route path="/configuracoes" element={
                <RoleGuard allowed={['admin_master']}><ConfiguracoesPage /></RoleGuard>
              } />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
