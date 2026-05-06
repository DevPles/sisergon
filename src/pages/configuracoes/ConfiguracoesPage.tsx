import { useState, useMemo } from 'react';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  const [activeTab, setActiveTab] = useState('empresas');
  const [empresaSearch, setEmpresaSearch] = useState('');

  const tabs = useMemo(() => [
    { value: 'empresas', label: 'Empresas' },
    { value: 'usuarios', label: 'Usuários' },
    { value: 'consultores', label: 'Consultores' },
    { value: 'planos', label: 'Planos e Contratos' },
    { value: 'laudos', label: 'Laudos' },
    { value: 'indicadores', label: 'Indicadores Globais' },
    { value: 'dashboard', label: 'Dashboard Executivo' },
    { value: 'config', label: 'Configurações Gerais' },
  ], []);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
        <p className="text-muted-foreground">Central de controle e gestão do sistema</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="px-6 pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <Select value={activeTab} onValueChange={setActiveTab}>
                <SelectTrigger className="h-10 w-64 rounded-full border border-border/40 bg-muted/20 text-sm font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tabs.map((tab) => (
                    <SelectItem key={tab.value} value={tab.value}>
                      {tab.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {activeTab === 'empresas' && (
                <div className="flex items-center gap-2 bg-muted/40 p-1 rounded-full border border-border/50 shadow-sm">
                  <Input 
                    placeholder="Buscar empresa..." 
                    value={empresaSearch}
                    onChange={(e) => setEmpresaSearch(e.target.value)}
                    className="h-8 w-40 sm:w-64 bg-transparent border-none focus-visible:ring-0 shadow-none text-sm"
                  />
                  <Button 
                    size="sm"
                    className="h-8 px-4 rounded-full bg-primary hover:bg-primary/90 text-white text-xs font-medium whitespace-nowrap shadow-md transition-all active:scale-95"
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('open-nova-empresa'));
                    }}
                  >
                    Nova Empresa
                  </Button>
                </div>
              )}
            </div>
            
            <div className="p-6">
              <TabsContent value="empresas" className="mt-0">
                <EmpresasTab externalSearch={empresaSearch} />
              </TabsContent>
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
