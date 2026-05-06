import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
  
  // Este estado será passado para o EmpresasTab ou usado para filtrar
  // Mas o pedido é para colocar o FILTRO e BOTÃO na mesma linha do seletor.

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
        <p className="text-muted-foreground">Central de controle e gestão do sistema</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Tabs defaultValue="empresas" onValueChange={setActiveTab}>
            <div className="px-6 pt-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="overflow-x-auto pb-1">
                <TabsList className="w-auto justify-start inline-flex">
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
              
              {activeTab === 'empresas' && (
                <div className="flex items-center gap-2 bg-muted/30 p-1.5 rounded-full border border-border/50">
                  <Input 
                    placeholder="Buscar empresa..." 
                    value={empresaSearch}
                    onChange={(e) => setEmpresaSearch(e.target.value)}
                    className="h-9 w-40 sm:w-60 bg-background rounded-full border-none focus-visible:ring-1 focus-visible:ring-primary"
                  />
                  <Button 
                    size="sm"
                    className="h-9 px-4 rounded-full bg-primary hover:bg-primary/90 text-white text-xs whitespace-nowrap"
                    onClick={() => {
                      // Disparar evento para o componente filho ou usar estado global
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
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
        <p className="text-muted-foreground">Central de controle e gestão do sistema</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Tabs defaultValue="empresas">
            <div className="px-6 pt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div className="overflow-x-auto">
                <TabsList className="w-auto justify-start inline-flex">
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
              
              {/* Espaço para os filtros dinâmicos que virão dos componentes filhos via render prop ou similar, 
                  mas para manter a simplicidade e atender o pedido diretamente: */}
              <div id="tabs-actions-container" className="flex items-center gap-3">
                {/* O conteúdo aqui será injetado ou controlado pelo estado da página */}
              </div>
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
