import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { generateColaboradorDossiePdf, generateEmpresaDossiePdf } from '@/utils/dossiePdfReport';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend, AreaChart, Area,
} from 'recharts';
import { format, subMonths, parseISO, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const RISK_COLORS = {
  critico: 'hsl(0, 72%, 51%)',
  alto: 'hsl(25, 95%, 53%)',
  moderado: 'hsl(45, 93%, 47%)',
  baixo: 'hsl(142, 60%, 40%)',
};
const CHART_COLORS = ['hsl(215, 60%, 35%)', 'hsl(200, 70%, 50%)', 'hsl(38, 92%, 50%)', 'hsl(142, 60%, 40%)', 'hsl(280, 60%, 50%)'];
const STATUS_MAP: Record<string, string> = {
  adimplente: 'Adimplente',
  inadimplente: 'Inadimplente',
  em_atraso: 'Em Atraso',
};

const fmtDate = (d: string | null) => d ? format(parseISO(d), 'dd/MM/yyyy', { locale: ptBR }) : '—';

const DashboardPage = () => {
  const [activeTab, setActiveTab] = useState('visao-geral');
  const [selectedEmpresa, setSelectedEmpresa] = useState<string>('all');
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportType, setReportType] = useState<'colaborador' | 'empresa'>('colaborador');
  const [selectedReportColab, setSelectedReportColab] = useState('');
  const [selectedReportEmpresa, setSelectedReportEmpresa] = useState('');
  const [generatingPdf, setGeneratingPdf] = useState(false);
  // Dossiê filters
  const [dossieEmpresa, setDossieEmpresa] = useState<string>('all');
  const [dossieSearch, setDossieSearch] = useState('');
  const [dossieDateFrom, setDossieDateFrom] = useState('');
  const [dossieDateTo, setDossieDateTo] = useState('');
  // History modal
  const [historyColabId, setHistoryColabId] = useState<string | null>(null);
  const { toast } = useToast();

  // ─── Core data ───
  const { data: coreData, isLoading } = useQuery({
    queryKey: ['dashboard-core'],
    queryFn: async () => {
      const [empresas, colaboradores, assessments, actionPlans, checklists, pagamentos, contratos, profiles, userRoles, atestados, pcmsoEventos, testResults] = await Promise.all([
        supabase.from('empresas').select('*'),
        supabase.from('colaboradores').select('*, cargos(nome), setores(nome), unidades(nome)'),
        supabase.from('assessments').select('*'),
        supabase.from('action_plans').select('*'),
        supabase.from('checklists').select('*'),
        supabase.from('empresa_pagamentos').select('*'),
        supabase.from('empresa_contratos').select('*'),
        supabase.from('profiles').select('*'),
        supabase.from('user_roles').select('*'),
        supabase.from('atestados').select('*'),
        supabase.from('pcmso_eventos').select('*'),
        supabase.from('employee_test_results').select('*, test_templates(nome, tipo)'),
      ]);
      return {
        empresas: empresas.data ?? [],
        colaboradores: colaboradores.data ?? [],
        assessments: assessments.data ?? [],
        actionPlans: actionPlans.data ?? [],
        checklists: checklists.data ?? [],
        pagamentos: pagamentos.data ?? [],
        contratos: contratos.data ?? [],
        profiles: profiles.data ?? [],
        userRoles: userRoles.data ?? [],
        atestados: atestados.data ?? [],
        pcmsoEventos: pcmsoEventos.data ?? [],
        testResults: testResults.data ?? [],
      };
    },
  });

  if (isLoading || !coreData) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  const { empresas, colaboradores, assessments, actionPlans, checklists, pagamentos, contratos, profiles, userRoles, atestados, pcmsoEventos, testResults } = coreData;

  // Filters
  const filterByEmpresa = <T extends { empresa_id?: string }>(arr: T[]) =>
    selectedEmpresa === 'all' ? arr : arr.filter(i => i.empresa_id === selectedEmpresa);

  const filteredAssessments = filterByEmpresa(assessments as any[]);
  const filteredColabs = filterByEmpresa(colaboradores as any[]);
  const filteredPlans = filterByEmpresa(actionPlans as any[]);
  const filteredChecklists = filterByEmpresa(checklists as any[]);
  const filteredPagamentos = filterByEmpresa(pagamentos as any[]);
  const filteredAtestados = filterByEmpresa(atestados as any[]);

  // ─── KPIs ───
  const totalEmpresas = empresas.length;
  const totalColabs = filteredColabs.length;
  const totalAEP = filteredAssessments.filter((a: any) => a.type === 'aep').length;
  const totalAET = filteredAssessments.filter((a: any) => a.type === 'aet').length;
  const totalARP = filteredAssessments.filter((a: any) => a.type === 'arp').length;
  const totalChecklists = filteredChecklists.length;
  const riscosAltos = filteredAssessments.filter((a: any) => a.risk_classification === 'alto').length;
  const riscosCriticos = filteredAssessments.filter((a: any) => a.risk_classification === 'critico').length;
  const planosPendentes = filteredPlans.filter((p: any) => p.status === 'pendente').length;
  const planosVencidos = filteredPlans.filter((p: any) => p.status === 'vencido').length;

  const totalRecebido = filteredPagamentos.filter((p: any) => p.status === 'pago').reduce((s: number, p: any) => s + Number(p.valor || 0), 0);
  const totalPendente = filteredPagamentos.filter((p: any) => p.status === 'pendente').reduce((s: number, p: any) => s + Number(p.valor || 0), 0);
  const inadimplentes = empresas.filter((e: any) => e.status_financeiro === 'inadimplente').length;

  // ─── Charts Data ───
  const last12Months = Array.from({ length: 12 }, (_, i) => {
    const d = subMonths(new Date(), 11 - i);
    return format(d, 'yyyy-MM');
  });
  const monthlyAssessments = last12Months.map(month => ({
    month: format(parseISO(`${month}-01`), 'MMM/yy', { locale: ptBR }),
    aep: filteredAssessments.filter((a: any) => a.type === 'aep' && a.created_at?.startsWith(month)).length,
    aet: filteredAssessments.filter((a: any) => a.type === 'aet' && a.created_at?.startsWith(month)).length,
    arp: filteredAssessments.filter((a: any) => a.type === 'arp' && a.created_at?.startsWith(month)).length,
  }));

  const riskPieData = [
    { name: 'Crítico', value: riscosCriticos, color: RISK_COLORS.critico },
    { name: 'Alto', value: riscosAltos, color: RISK_COLORS.alto },
    { name: 'Moderado', value: filteredAssessments.filter((a: any) => a.risk_classification === 'moderado').length, color: RISK_COLORS.moderado },
    { name: 'Baixo', value: filteredAssessments.filter((a: any) => a.risk_classification === 'baixo').length, color: RISK_COLORS.baixo },
  ].filter(d => d.value > 0);

  const planStatusData = [
    { name: 'Concluídos', value: filteredPlans.filter((p: any) => p.status === 'concluido').length },
    { name: 'Em Andamento', value: filteredPlans.filter((p: any) => p.status === 'em_andamento').length },
    { name: 'Pendentes', value: planosPendentes },
    { name: 'Vencidos', value: planosVencidos },
  ].filter(d => d.value > 0);

  const monthlyRevenue = last12Months.map(month => ({
    month: format(parseISO(`${month}-01`), 'MMM/yy', { locale: ptBR }),
    recebido: filteredPagamentos.filter((p: any) => p.status === 'pago' && p.data_pagamento?.startsWith(month)).reduce((s: number, p: any) => s + Number(p.valor || 0), 0),
    pendente: filteredPagamentos.filter((p: any) => p.status === 'pendente' && p.data_vencimento?.startsWith(month)).reduce((s: number, p: any) => s + Number(p.valor || 0), 0),
  }));

  const empresaRanking = empresas.map((e: any) => {
    const eAssessments = assessments.filter((a: any) => a.empresa_id === e.id);
    const eColabs = colaboradores.filter((c: any) => c.empresa_id === e.id);
    const ePlans = actionPlans.filter((p: any) => p.empresa_id === e.id);
    return {
      id: e.id, nome: e.nome_fantasia || e.razao_social, colaboradores: eColabs.length,
      avaliacoes: eAssessments.length,
      riscos_criticos: eAssessments.filter((a: any) => a.risk_classification === 'critico').length,
      riscos_altos: eAssessments.filter((a: any) => a.risk_classification === 'alto').length,
      planos_pendentes: ePlans.filter((p: any) => p.status === 'pendente').length,
      status_financeiro: e.status_financeiro || 'adimplente',
      valor_aberto: Number(e.valor_em_aberto || 0),
    };
  }).sort((a, b) => (b.riscos_criticos + b.riscos_altos) - (a.riscos_criticos + a.riscos_altos));

  const roleLabels: Record<string, string> = {
    admin_master: 'Admin Master', consultor: 'Consultor', empresa_admin: 'Admin Empresa',
    empresa_gestor: 'Gestor Empresa', colaborador: 'Colaborador',
  };
  const roleCounts = Object.entries(roleLabels).map(([role, label]) => ({
    role, label, count: userRoles.filter((r: any) => r.role === role).length,
  }));

  // ─── Dossiê data with its own filters ───
  const dossieColabs = colaboradores.filter((c: any) => {
    if (dossieEmpresa !== 'all' && c.empresa_id !== dossieEmpresa) return false;
    if (dossieSearch && !c.nome_completo?.toLowerCase().includes(dossieSearch.toLowerCase()) && !c.matricula?.toLowerCase().includes(dossieSearch.toLowerCase())) return false;
    if (dossieDateFrom) {
      const admissao = c.data_admissao ? new Date(c.data_admissao) : null;
      if (!admissao || isBefore(admissao, startOfDay(new Date(dossieDateFrom)))) return false;
    }
    if (dossieDateTo) {
      const admissao = c.data_admissao ? new Date(c.data_admissao) : null;
      if (!admissao || isAfter(admissao, endOfDay(new Date(dossieDateTo)))) return false;
    }
    return true;
  }) as any[];

  const dossieData = dossieColabs.map((c: any) => {
    const cAssessments = assessments.filter((a: any) => a.colaborador_id === c.id);
    const cAtestados = atestados.filter((a: any) => a.colaborador_id === c.id);
    const cChecklists = checklists.filter((ch: any) => ch.colaborador_id === c.id);
    const cPcmso = pcmsoEventos.filter((e: any) => e.colaborador_id === c.id);
    const cTests = testResults.filter((t: any) => t.colaborador_id === c.id);
    const empresa = empresas.find((e: any) => e.id === c.empresa_id);
    return {
      id: c.id, nome: c.nome_completo, matricula: c.matricula, status: c.status,
      empresaNome: (empresa as any)?.nome_fantasia || (empresa as any)?.razao_social || '—',
      cargo: (c.cargos as any)?.nome || '—',
      setor: (c.setores as any)?.nome || '—',
      totalAvaliacoes: cAssessments.length,
      ultimaAvaliacao: cAssessments.sort((a: any, b: any) => (b.created_at || '').localeCompare(a.created_at || ''))[0]?.created_at,
      riscoMaisAlto: cAssessments.reduce((max: string, a: any) => {
        const order = ['baixo', 'moderado', 'alto', 'critico'];
        return order.indexOf(a.risk_classification || '') > order.indexOf(max) ? a.risk_classification : max;
      }, ''),
      atestados: cAtestados.length,
      diasAfastamento: cAtestados.reduce((s: number, a: any) => s + (a.dias || 0), 0),
      checklists: cChecklists.length,
      pcmso: cPcmso.length,
      testes: cTests.length,
      assessmentsData: cAssessments,
      atestadosData: cAtestados,
      checklistsData: cChecklists,
      pcmsoData: cPcmso,
      testesData: cTests,
    };
  }).sort((a, b) => {
    const order = ['critico', 'alto', 'moderado', 'baixo', ''];
    return order.indexOf(a.riscoMaisAlto) - order.indexOf(b.riscoMaisAlto);
  });

  const historyColab = historyColabId ? dossieData.find(d => d.id === historyColabId) : null;

  const KpiCard = ({ label, value, subtitle, variant }: any) => (
    <Card className="relative overflow-hidden group hover:shadow-lg transition-shadow">
      <CardContent className="p-5">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
          <p className={`text-2xl font-bold mt-1 ${variant === 'danger' ? 'text-destructive' : variant === 'success' ? 'text-emerald-600' : 'text-foreground'}`}>
            {value}
          </p>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      </CardContent>
    </Card>
  );

  const riskBadge = (classification: string) => {
    const map: Record<string, { label: string; variant: 'destructive' | 'secondary' | 'default' | 'outline' }> = {
      critico: { label: 'Crítico', variant: 'destructive' },
      alto: { label: 'Alto', variant: 'destructive' },
      moderado: { label: 'Moderado', variant: 'secondary' },
      baixo: { label: 'Baixo', variant: 'outline' },
    };
    const m = map[classification];
    if (!m) return <span className="text-muted-foreground">—</span>;
    return <Badge variant={m.variant}>{m.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'Space Grotesk' }}>
            Dashboard Executivo
          </h1>
          <p className="text-muted-foreground">Visão consolidada de indicadores, riscos e faturamento</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedEmpresa} onValueChange={setSelectedEmpresa}>
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder="Todas as empresas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as empresas</SelectItem>
              {empresas.map((e: any) => (
                <SelectItem key={e.id} value={e.id}>{(e as any).nome_fantasia || (e as any).razao_social}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="visao-geral">Visão Geral</TabsTrigger>
          <TabsTrigger value="empresas">Empresas</TabsTrigger>
          <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
          <TabsTrigger value="perfis">Perfis</TabsTrigger>
          <TabsTrigger value="dossie">Dossiê</TabsTrigger>
        </TabsList>

        {/* ═══════════ VISÃO GERAL ═══════════ */}
        <TabsContent value="visao-geral" className="space-y-6 mt-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <KpiCard label="Empresas" value={totalEmpresas} />
            <KpiCard label="Colaboradores" value={totalColabs} />
            <KpiCard label="Avaliações" value={totalAEP + totalAET + totalARP} subtitle={`AEP: ${totalAEP} | AET: ${totalAET} | ARP: ${totalARP}`} />
            <KpiCard label="Checklists" value={totalChecklists} />
            <KpiCard label="Riscos Altos/Críticos" value={riscosAltos + riscosCriticos} variant={riscosAltos + riscosCriticos > 0 ? 'danger' : undefined} />
            <KpiCard label="Planos de Ação" value={filteredPlans.length} subtitle={`Pend: ${planosPendentes} | Venc: ${planosVencidos}`} variant={planosVencidos > 0 ? 'danger' : undefined} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Evolução de Avaliações (12 meses)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={monthlyAssessments}>
                    <defs>
                      <linearGradient id="gradAEP" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(215, 60%, 35%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(215, 60%, 35%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" fontSize={11} />
                    <YAxis fontSize={11} />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="aep" name="AEP" stroke="hsl(215, 60%, 35%)" fill="url(#gradAEP)" strokeWidth={2} />
                    <Area type="monotone" dataKey="aet" name="AET" stroke="hsl(200, 70%, 50%)" fill="hsl(200, 70%, 50%)" fillOpacity={0.1} strokeWidth={2} />
                    <Area type="monotone" dataKey="arp" name="ARP" stroke="hsl(38, 92%, 50%)" fill="hsl(38, 92%, 50%)" fillOpacity={0.1} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Distribuição de Risco</CardTitle>
              </CardHeader>
              <CardContent>
                {riskPieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={riskPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {riskPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip formatter={(value: number) => [value, 'Avaliações']} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[280px] text-muted-foreground">Sem dados de risco disponíveis</div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Status dos Planos de Ação</CardTitle>
              </CardHeader>
              <CardContent>
                {planStatusData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={planStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3}
                        label={({ name, value }) => `${name}: ${value}`}>
                        {planStatusData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[250px] text-muted-foreground">Sem planos de ação</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Resumo Financeiro</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl bg-primary/10 p-4 text-center">
                    <p className="text-xs text-muted-foreground uppercase">Recebido</p>
                    <p className="text-xl font-bold text-primary">R$ {totalRecebido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="rounded-xl bg-destructive/10 p-4 text-center">
                    <p className="text-xs text-muted-foreground uppercase">Pendente</p>
                    <p className="text-xl font-bold text-destructive">R$ {totalPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="rounded-xl bg-orange-500/10 p-4 text-center col-span-2">
                    <p className="text-xs text-muted-foreground uppercase">Empresas Inadimplentes</p>
                    <p className="text-xl font-bold text-orange-600">{inadimplentes}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ═══════════ EMPRESAS ═══════════ */}
        <TabsContent value="empresas" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ranking de Empresas</CardTitle>
              <CardDescription>Ordenado por quantidade de riscos críticos e altos</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empresa</TableHead>
                    <TableHead className="text-center">Colaboradores</TableHead>
                    <TableHead className="text-center">Avaliações</TableHead>
                    <TableHead className="text-center">Riscos Críticos</TableHead>
                    <TableHead className="text-center">Riscos Altos</TableHead>
                    <TableHead className="text-center">Planos Pendentes</TableHead>
                    <TableHead>Status Financeiro</TableHead>
                    <TableHead className="text-right">Valor em Aberto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {empresaRanking.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium">{e.nome}</TableCell>
                      <TableCell className="text-center">{e.colaboradores}</TableCell>
                      <TableCell className="text-center">{e.avaliacoes}</TableCell>
                      <TableCell className="text-center">
                        {e.riscos_criticos > 0 ? <Badge variant="destructive">{e.riscos_criticos}</Badge> : '0'}
                      </TableCell>
                      <TableCell className="text-center">
                        {e.riscos_altos > 0 ? <Badge variant="destructive">{e.riscos_altos}</Badge> : '0'}
                      </TableCell>
                      <TableCell className="text-center">{e.planos_pendentes}</TableCell>
                      <TableCell>
                        <Badge variant={e.status_financeiro === 'inadimplente' ? 'destructive' : 'outline'}>
                          {STATUS_MAP[e.status_financeiro] || e.status_financeiro}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        R$ {e.valor_aberto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════ FINANCEIRO ═══════════ */}
        <TabsContent value="financeiro" className="space-y-6 mt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard label="Total Recebido" value={`R$ ${totalRecebido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} variant="success" />
            <KpiCard label="Total Pendente" value={`R$ ${totalPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} variant="danger" />
            <KpiCard label="Inadimplentes" value={inadimplentes} variant={inadimplentes > 0 ? 'danger' : undefined} />
            <KpiCard label="Contratos Ativos" value={contratos.filter((c: any) => c.status === 'vigente').length} />
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Faturamento Mensal (12 meses)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" fontSize={11} />
                  <YAxis fontSize={11} tickFormatter={(v: number) => `R$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, '']} />
                  <Legend />
                  <Bar dataKey="recebido" name="Recebido" fill="hsl(142, 60%, 40%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="pendente" name="Pendente" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pagamentos Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Pagamento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Forma</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPagamentos.slice(0, 20).map((p: any) => {
                    const emp = empresas.find((e: any) => e.id === p.empresa_id);
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{emp ? (emp as any).nome_fantasia || (emp as any).razao_social : '—'}</TableCell>
                        <TableCell>R$ {Number(p.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell>{p.data_vencimento ? format(parseISO(p.data_vencimento), 'dd/MM/yyyy') : '—'}</TableCell>
                        <TableCell>{p.data_pagamento ? format(parseISO(p.data_pagamento), 'dd/MM/yyyy') : '—'}</TableCell>
                        <TableCell>
                          <Badge variant={p.status === 'pago' ? 'outline' : 'destructive'}>{p.status}</Badge>
                        </TableCell>
                        <TableCell>{p.forma_pagamento || '—'}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════ PERFIS ═══════════ */}
        <TabsContent value="perfis" className="space-y-6 mt-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {roleCounts.map(rc => (
              <KpiCard key={rc.role} label={rc.label} value={rc.count} />
            ))}
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Distribuição de Perfis</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={roleCounts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" fontSize={11} />
                  <YAxis dataKey="label" type="category" fontSize={11} width={120} />
                  <Tooltip />
                  <Bar dataKey="count" name="Usuários" fill="hsl(215, 60%, 35%)" radius={[0, 4, 4, 0]}>
                    {roleCounts.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Usuários Cadastrados</CardTitle>
              <CardDescription>{profiles.length} usuários no sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Perfil</TableHead>
                    <TableHead>Empresa Vinculada</TableHead>
                    <TableHead>Cadastro</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profiles.map((p: any) => {
                    const role = userRoles.find((r: any) => r.user_id === p.id);
                    const empresa = empresas.find((e: any) => e.id === p.empresa_id);
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.full_name || '—'}</TableCell>
                        <TableCell>{p.email || '—'}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{role ? roleLabels[role.role] || role.role : '—'}</Badge>
                        </TableCell>
                        <TableCell>{empresa ? (empresa as any).nome_fantasia || (empresa as any).razao_social : '—'}</TableCell>
                        <TableCell>{p.created_at ? format(parseISO(p.created_at), 'dd/MM/yyyy') : '—'}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════ DOSSIÊ ═══════════ */}
        <TabsContent value="dossie" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle className="text-base">Dossiê de Colaboradores</CardTitle>
                  <CardDescription>
                    Histórico completo — clique no nome para ver detalhes
                  </CardDescription>
                </div>
                <Button
                  onClick={() => setShowReportModal(true)}
                  className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_4px_14px_0_hsl(var(--primary)/0.4)] transition-all duration-200 whitespace-nowrap"
                >
                  Gerar Relatório PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex flex-col md:flex-row gap-3 mb-6">
                <Input
                  placeholder="Buscar por nome ou matrícula..."
                  value={dossieSearch}
                  onChange={e => setDossieSearch(e.target.value)}
                  className="md:w-[260px]"
                />
                <Select value={dossieEmpresa} onValueChange={setDossieEmpresa}>
                  <SelectTrigger className="md:w-[220px]">
                    <SelectValue placeholder="Todas as empresas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as empresas</SelectItem>
                    {empresas.map((e: any) => (
                      <SelectItem key={e.id} value={e.id}>{(e as any).nome_fantasia || (e as any).razao_social}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">Admissão de:</span>
                  <Input type="date" value={dossieDateFrom} onChange={e => setDossieDateFrom(e.target.value)} className="w-[150px]" />
                  <span className="text-sm text-muted-foreground">até</span>
                  <Input type="date" value={dossieDateTo} onChange={e => setDossieDateTo(e.target.value)} className="w-[150px]" />
                </div>
                {(dossieSearch || dossieEmpresa !== 'all' || dossieDateFrom || dossieDateTo) && (
                  <Button variant="ghost" size="sm" onClick={() => { setDossieSearch(''); setDossieEmpresa('all'); setDossieDateFrom(''); setDossieDateTo(''); }}>
                    Limpar filtros
                  </Button>
                )}
              </div>

              {/* Summary KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="rounded-xl bg-primary/10 p-4 text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Colaboradores</p>
                  <p className="text-2xl font-bold text-primary">{dossieData.length}</p>
                </div>
                <div className="rounded-xl bg-destructive/10 p-4 text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Com Risco Crítico</p>
                  <p className="text-2xl font-bold text-destructive">{dossieData.filter(d => d.riscoMaisAlto === 'critico').length}</p>
                </div>
                <div className="rounded-xl bg-orange-500/10 p-4 text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Atestados</p>
                  <p className="text-2xl font-bold text-orange-600">{dossieData.reduce((s, d) => s + d.atestados, 0)}</p>
                </div>
                <div className="rounded-xl bg-secondary p-4 text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Dias Afastamento</p>
                  <p className="text-2xl font-bold text-foreground">{dossieData.reduce((s, d) => s + d.diasAfastamento, 0)}</p>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Matrícula</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Aval.</TableHead>
                    <TableHead>Risco Máx.</TableHead>
                    <TableHead className="text-center">Atest.</TableHead>
                    <TableHead className="text-center">Dias Af.</TableHead>
                    <TableHead className="text-center">PCMSO</TableHead>
                    <TableHead className="text-center">Testes</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dossieData.map((d) => (
                    <TableRow key={d.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setHistoryColabId(d.id)}>
                      <TableCell className="font-medium text-primary underline-offset-2 hover:underline">{d.nome}</TableCell>
                      <TableCell className="text-sm">{d.empresaNome}</TableCell>
                      <TableCell>{d.matricula || '—'}</TableCell>
                      <TableCell>
                        <Badge variant={d.status === 'ativo' ? 'outline' : 'secondary'}>{d.status}</Badge>
                      </TableCell>
                      <TableCell className="text-center font-medium">{d.totalAvaliacoes}</TableCell>
                      <TableCell>{riskBadge(d.riscoMaisAlto)}</TableCell>
                      <TableCell className="text-center">{d.atestados}</TableCell>
                      <TableCell className="text-center font-medium">{d.diasAfastamento}</TableCell>
                      <TableCell className="text-center">{d.pcmso}</TableCell>
                      <TableCell className="text-center">{d.testes}</TableCell>
                      <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setHistoryColabId(d.id)}>
                            Ver Histórico
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={generatingPdf}
                            onClick={async () => {
                              setGeneratingPdf(true);
                              try {
                                await generateColaboradorDossiePdf(d.id);
                                toast({ title: 'PDF gerado com sucesso' });
                              } catch (e: any) {
                                toast({ title: 'Erro ao gerar PDF', description: e.message, variant: 'destructive' });
                              } finally {
                                setGeneratingPdf(false);
                              }
                            }}
                          >
                            PDF
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {dossieData.length === 0 && (
                    <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground py-8">Nenhum colaborador encontrado</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ═══════════ MODAL HISTÓRICO DO COLABORADOR ═══════════ */}
      <Dialog open={!!historyColabId} onOpenChange={(open) => !open && setHistoryColabId(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Histórico Completo — {historyColab?.nome || ''}</DialogTitle>
            <DialogDescription>
              {historyColab?.empresaNome} | {historyColab?.cargo} | {historyColab?.setor}
            </DialogDescription>
          </DialogHeader>
          {historyColab && (
            <div className="space-y-6 pt-2">
              {/* Resumo */}
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                {[
                  { label: 'Avaliações', value: historyColab.totalAvaliacoes },
                  { label: 'Atestados', value: historyColab.atestados },
                  { label: 'Dias Afast.', value: historyColab.diasAfastamento },
                  { label: 'Checklists', value: historyColab.checklists },
                  { label: 'PCMSO', value: historyColab.pcmso },
                  { label: 'Testes', value: historyColab.testes },
                ].map(item => (
                  <div key={item.label} className="rounded-lg bg-muted/50 p-3 text-center">
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="text-lg font-bold text-foreground">{item.value}</p>
                  </div>
                ))}
              </div>

              {/* Avaliações */}
              {historyColab.assessmentsData.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2">Avaliações ({historyColab.assessmentsData.length})</h3>
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>Tipo</TableHead><TableHead>Título</TableHead><TableHead>Data</TableHead><TableHead>Status</TableHead><TableHead>Risco</TableHead><TableHead>Score</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {historyColab.assessmentsData.map((a: any) => (
                        <TableRow key={a.id}>
                          <TableCell>{(a.type || '').toUpperCase()}</TableCell>
                          <TableCell>{a.title || '—'}</TableCell>
                          <TableCell>{fmtDate(a.created_at)}</TableCell>
                          <TableCell>{a.status || '—'}</TableCell>
                          <TableCell>{riskBadge(a.risk_classification || '')}</TableCell>
                          <TableCell>{a.score_total != null ? String(a.score_total) : '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Atestados */}
              {historyColab.atestadosData.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2">Atestados ({historyColab.atestadosData.length})</h3>
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>Tipo</TableHead><TableHead>CID</TableHead><TableHead>Início</TableHead><TableHead>Fim</TableHead><TableHead>Dias</TableHead><TableHead>Obs</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {historyColab.atestadosData.map((a: any) => (
                        <TableRow key={a.id}>
                          <TableCell>{a.tipo || '—'}</TableCell>
                          <TableCell>{a.cid || '—'}</TableCell>
                          <TableCell>{fmtDate(a.data_inicio)}</TableCell>
                          <TableCell>{fmtDate(a.data_fim)}</TableCell>
                          <TableCell>{a.dias || 0}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{a.observacoes || '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* PCMSO */}
              {historyColab.pcmsoData.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2">Eventos PCMSO ({historyColab.pcmsoData.length})</h3>
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>Tipo</TableHead><TableHead>Subtipo</TableHead><TableHead>Data Prevista</TableHead><TableHead>Aptidão</TableHead><TableHead>Status</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {historyColab.pcmsoData.map((e: any) => (
                        <TableRow key={e.id}>
                          <TableCell>{e.tipo || '—'}</TableCell>
                          <TableCell>{e.subtipo || '—'}</TableCell>
                          <TableCell>{fmtDate(e.data_prevista)}</TableCell>
                          <TableCell>{e.aptidao || '—'}</TableCell>
                          <TableCell>{e.status || '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Testes */}
              {historyColab.testesData.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2">Testes Comportamentais ({historyColab.testesData.length})</h3>
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>Teste</TableHead><TableHead>Data</TableHead><TableHead>Perfil</TableHead><TableHead>Status</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {historyColab.testesData.map((t: any) => (
                        <TableRow key={t.id}>
                          <TableCell>{(t.test_templates as any)?.nome || '—'}</TableCell>
                          <TableCell>{fmtDate(t.applied_at || t.created_at)}</TableCell>
                          <TableCell>{t.perfil_predominante || '—'}</TableCell>
                          <TableCell>{t.status || '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Checklists */}
              {historyColab.checklistsData.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2">Checklists ({historyColab.checklistsData.length})</h3>
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>Data</TableHead><TableHead>Mês/Ano</TableHead><TableHead>Score</TableHead><TableHead>Confirmado</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {historyColab.checklistsData.map((ch: any) => (
                        <TableRow key={ch.id}>
                          <TableCell>{fmtDate(ch.created_at)}</TableCell>
                          <TableCell>{ch.month && ch.year ? `${String(ch.month).padStart(2, '0')}/${ch.year}` : '—'}</TableCell>
                          <TableCell>{ch.score != null ? String(ch.score) : '—'}</TableCell>
                          <TableCell>{ch.confirmed_at ? 'Sim' : 'Não'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* PDF button */}
              <div className="flex justify-end pt-2">
                <Button
                  disabled={generatingPdf}
                  onClick={async () => {
                    setGeneratingPdf(true);
                    try {
                      await generateColaboradorDossiePdf(historyColab.id);
                      toast({ title: 'PDF gerado com sucesso' });
                    } catch (e: any) {
                      toast({ title: 'Erro ao gerar PDF', description: e.message, variant: 'destructive' });
                    } finally {
                      setGeneratingPdf(false);
                    }
                  }}
                  className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {generatingPdf ? 'Gerando...' : 'Gerar PDF do Colaborador'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Gerar Relatório */}
      <Dialog open={showReportModal} onOpenChange={setShowReportModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Gerar Relatório PDF</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pt-2">
            <div className="flex gap-3">
              <Button variant={reportType === 'colaborador' ? 'default' : 'outline'} onClick={() => setReportType('colaborador')} className="flex-1">
                Dossiê do Colaborador
              </Button>
              <Button variant={reportType === 'empresa' ? 'default' : 'outline'} onClick={() => setReportType('empresa')} className="flex-1">
                Relatório da Empresa
              </Button>
            </div>

            {reportType === 'colaborador' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Selecione o colaborador</label>
                <Select value={selectedReportColab} onValueChange={setSelectedReportColab}>
                  <SelectTrigger><SelectValue placeholder="Escolha um colaborador..." /></SelectTrigger>
                  <SelectContent>
                    {(colaboradores as any[]).map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.nome_completo} {c.matricula ? `(${c.matricula})` : ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Inclui dados pessoais, avaliações, atestados, PCMSO, testes comportamentais, checklists e planos de ação.
                </p>
              </div>
            )}

            {reportType === 'empresa' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Selecione a empresa</label>
                <Select value={selectedReportEmpresa} onValueChange={setSelectedReportEmpresa}>
                  <SelectTrigger><SelectValue placeholder="Escolha uma empresa..." /></SelectTrigger>
                  <SelectContent>
                    {empresas.map((e: any) => (
                      <SelectItem key={e.id} value={e.id}>{(e as any).nome_fantasia || (e as any).razao_social}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Inclui dados da empresa, colaboradores, avaliações, PCMSO, testes, planos de ação, atestados e financeiro.
                </p>
              </div>
            )}

            <Button
              className="w-full rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_4px_14px_0_hsl(var(--primary)/0.4)]"
              disabled={generatingPdf || (reportType === 'colaborador' ? !selectedReportColab : !selectedReportEmpresa)}
              onClick={async () => {
                setGeneratingPdf(true);
                try {
                  if (reportType === 'colaborador') {
                    await generateColaboradorDossiePdf(selectedReportColab);
                  } else {
                    await generateEmpresaDossiePdf(selectedReportEmpresa);
                  }
                  toast({ title: 'PDF gerado com sucesso' });
                  setShowReportModal(false);
                } catch (e: any) {
                  toast({ title: 'Erro ao gerar PDF', description: e.message, variant: 'destructive' });
                } finally {
                  setGeneratingPdf(false);
                }
              }}
            >
              {generatingPdf ? 'Gerando...' : 'Gerar PDF'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DashboardPage;
