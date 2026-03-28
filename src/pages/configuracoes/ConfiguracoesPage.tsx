import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import EmpresasTab from './tabs/EmpresasTab';
import UsuariosTab from './tabs/UsuariosTab';
import ConsultoresTab from './tabs/ConsultoresTab';
import PlanosTab from './tabs/PlanosTab';
import LaudosTab from './tabs/LaudosTab';
import IndicadoresTab from './tabs/IndicadoresTab';
import DashboardExecutivoTab from './tabs/DashboardExecutivoTab';
import ConfigGeraisTab from './tabs/ConfigGeraisTab';

const ConfiguracoesPage = () => {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
        <p className="text-muted-foreground">Central de controle e gestão do sistema</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Tabs defaultValue="empresas">
            <div className="px-6 pt-6 overflow-x-auto">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="empresas">Empresas</TabsTrigger>
                <TabsTrigger value="usuarios">Usuários</TabsTrigger>
                <TabsTrigger value="consultores">Consultores</TabsTrigger>
                <TabsTrigger value="planos">Planos e Contratos</TabsTrigger>
                <TabsTrigger value="laudos">Laudos</TabsTrigger>
                <TabsTrigger value="indicadores">Indicadores Globais</TabsTrigger>
                <TabsTrigger value="dashboard">Dashboard Executivo</TabsTrigger>
                <TabsTrigger value="config">Configurações Gerais</TabsTrigger>
              </TabsList>
            </div>

            <div className="p-6">
              <TabsContent value="empresas" className="mt-0"><EmpresasTab /></TabsContent>
              <TabsContent value="usuarios" className="mt-0"><UsuariosTab /></TabsContent>
              <TabsContent value="consultores" className="mt-0"><ConsultoresTab /></TabsContent>
              <TabsContent value="planos" className="mt-0"><PlanosTab /></TabsContent>
              <TabsContent value="laudos" className="mt-0"><LaudosTab /></TabsContent>
              <TabsContent value="indicadores" className="mt-0"><IndicadoresTab /></TabsContent>
              <TabsContent value="dashboard" className="mt-0"><DashboardExecutivoTab /></TabsContent>
              <TabsContent value="config" className="mt-0"><ConfigGeraisTab /></TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConfiguracoesPage;
