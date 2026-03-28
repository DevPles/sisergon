import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import PCMSODashboard from './components/PCMSODashboard';
import PCMSOProgramas from './components/PCMSOProgramas';
import PCMSOEventos from './components/PCMSOEventos';
import PCMSOHistorico from './components/PCMSOHistorico';

const PCMSOPage = () => {
  const [empresaFilter, setEmpresaFilter] = useState('all');

  const { data: empresas = [] } = useQuery({
    queryKey: ['empresas-pcmso'],
    queryFn: async () => {
      const { data } = await supabase.from('empresas').select('id, razao_social').eq('ativa', true).order('razao_social');
      return data ?? [];
    },
  });

  const { data: programas = [] } = useQuery({
    queryKey: ['pcmso-programas', empresaFilter],
    queryFn: async () => {
      let q = supabase.from('pcmso_programas').select('*, empresas:empresa_id(razao_social)').order('created_at', { ascending: false });
      if (empresaFilter !== 'all') q = q.eq('empresa_id', empresaFilter);
      const { data } = await q;
      return (data ?? []) as any[];
    },
  });

  const { data: eventos = [] } = useQuery({
    queryKey: ['pcmso-eventos', empresaFilter],
    queryFn: async () => {
      let q = supabase.from('pcmso_eventos').select('*, colaboradores:colaborador_id(nome_completo), empresas:empresa_id(razao_social)').order('data_prevista', { ascending: true });
      if (empresaFilter !== 'all') q = q.eq('empresa_id', empresaFilter);
      const { data } = await q.limit(500);
      return (data ?? []) as any[];
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">PCMSO — Saúde Ocupacional</h1>
          <p className="text-muted-foreground text-sm">Gestão ativa, controle contínuo e evidência estruturada (NR-07)</p>
        </div>
        <Select value={empresaFilter} onValueChange={setEmpresaFilter}>
          <SelectTrigger className="w-64"><SelectValue placeholder="Todas as empresas" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {empresas.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.razao_social}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <Tabs defaultValue="dashboard">
        <TabsList><TabsTrigger value="dashboard">Painel</TabsTrigger><TabsTrigger value="programas">Programas</TabsTrigger><TabsTrigger value="eventos">Exames / Eventos</TabsTrigger><TabsTrigger value="historico">Histórico</TabsTrigger></TabsList>
        <TabsContent value="dashboard"><PCMSODashboard eventos={eventos} programas={programas} /></TabsContent>
        <TabsContent value="programas"><PCMSOProgramas empresas={empresas as any[]} programas={programas} eventos={eventos} /></TabsContent>
        <TabsContent value="eventos"><PCMSOEventos empresas={empresas as any[]} eventos={eventos} empresaFilter={empresaFilter} /></TabsContent>
        <TabsContent value="historico"><PCMSOHistorico eventos={eventos} /></TabsContent>
      </Tabs>
    </div>
  );
};

export default PCMSOPage;
