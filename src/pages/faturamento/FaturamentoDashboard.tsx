import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const COLORS = ['hsl(142 76% 36%)', 'hsl(48 96% 53%)', 'hsl(0 84% 60%)', 'hsl(215 20% 65%)'];

const FaturamentoDashboard = () => {
  // Summary stats across all companies
  const { data: stats } = useQuery({
    queryKey: ['faturamento-dashboard-stats'],
    queryFn: async () => {
      const [totalEmpresas, adimplentes, inadimplentes, emAtraso] = await Promise.all([
        supabase.from('empresas').select('id', { count: 'exact', head: true }).eq('ativa', true),
        supabase.from('empresas').select('id', { count: 'exact', head: true }).eq('status_financeiro', 'adimplente'),
        supabase.from('empresas').select('id', { count: 'exact', head: true }).eq('status_financeiro', 'inadimplente'),
        supabase.from('empresas').select('id', { count: 'exact', head: true }).eq('status_financeiro', 'em_atraso'),
      ]);

      const { data: pagos } = await supabase.from('empresa_pagamentos').select('valor').eq('status', 'pago');
      const { data: pendentes } = await supabase.from('empresa_pagamentos').select('valor').eq('status', 'pendente');
      const { data: valorAberto } = await supabase.from('empresas').select('valor_em_aberto');

      const totalRecebido = (pagos || []).reduce((s, p) => s + Number(p.valor), 0);
      const totalPendente = (pendentes || []).reduce((s, p) => s + Number(p.valor), 0);
      const totalAberto = (valorAberto || []).reduce((s, e) => s + Number(e.valor_em_aberto || 0), 0);

      return {
        totalEmpresas: totalEmpresas.count ?? 0,
        adimplentes: adimplentes.count ?? 0,
        inadimplentes: inadimplentes.count ?? 0,
        emAtraso: emAtraso.count ?? 0,
        totalRecebido,
        totalPendente,
        totalAberto,
      };
    },
  });

  // Monthly revenue for chart (last 12 months)
  const { data: monthlyData } = useQuery({
    queryKey: ['faturamento-monthly'],
    queryFn: async () => {
      const months = [];
      for (let i = 11; i >= 0; i--) {
        const d = subMonths(new Date(), i);
        const start = startOfMonth(d).toISOString();
        const end = endOfMonth(d).toISOString();
        months.push({ date: d, start, end });
      }

      const results = [];
      for (const m of months) {
        const { data: pagos } = await supabase
          .from('empresa_pagamentos')
          .select('valor')
          .eq('status', 'pago')
          .gte('data_pagamento', m.start.split('T')[0])
          .lte('data_pagamento', m.end.split('T')[0]);

        const { data: pendentes } = await supabase
          .from('empresa_pagamentos')
          .select('valor')
          .eq('status', 'pendente')
          .gte('data_vencimento', m.start.split('T')[0])
          .lte('data_vencimento', m.end.split('T')[0]);

        results.push({
          mes: format(m.date, 'MMM/yy', { locale: ptBR }),
          recebido: (pagos || []).reduce((s, p) => s + Number(p.valor), 0),
          pendente: (pendentes || []).reduce((s, p) => s + Number(p.valor), 0),
        });
      }
      return results;
    },
  });

  // Companies with pending payments
  const { data: empresasPendentes } = useQuery({
    queryKey: ['faturamento-empresas-pendentes'],
    queryFn: async () => {
      const { data } = await supabase
        .from('empresas')
        .select('id, razao_social, nome_fantasia, status_financeiro, valor_em_aberto, proxima_cobranca')
        .eq('ativa', true)
        .order('valor_em_aberto', { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  // Contracts expiring soon
  const { data: contratosVencendo } = useQuery({
    queryKey: ['faturamento-contratos-vencendo'],
    queryFn: async () => {
      const hoje = new Date().toISOString().split('T')[0];
      const em90dias = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const { data } = await supabase
        .from('empresa_contratos')
        .select('id, nome, validade, status, empresa_id')
        .eq('status', 'vigente')
        .gte('validade', hoje)
        .lte('validade', em90dias)
        .order('validade');
      return data ?? [];
    },
  });

  const pieData = stats ? [
    { name: 'Adimplentes', value: stats.adimplentes },
    { name: 'Em Atraso', value: stats.emAtraso },
    { name: 'Inadimplentes', value: stats.inadimplentes },
  ].filter(d => d.value > 0) : [];

  const statusColor = (s: string) => {
    if (s === 'adimplente') return 'default';
    if (s === 'em_atraso') return 'secondary';
    return 'destructive';
  };

  const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Dashboard Financeiro</h1>
        <p className="text-muted-foreground">Visão geral do faturamento e inadimplência</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Recebido</p>
            <p className="text-2xl font-bold text-green-600">{fmt(stats?.totalRecebido ?? 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Pendente</p>
            <p className="text-2xl font-bold text-yellow-600">{fmt(stats?.totalPendente ?? 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Em Aberto (Empresas)</p>
            <p className="text-2xl font-bold text-red-600">{fmt(stats?.totalAberto ?? 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Empresas Ativas</p>
            <p className="text-2xl font-bold">{stats?.totalEmpresas ?? 0}</p>
            <div className="flex gap-2 mt-1">
              <Badge variant="default" className="text-xs">{stats?.adimplentes ?? 0} ok</Badge>
              <Badge variant="secondary" className="text-xs">{stats?.emAtraso ?? 0} atraso</Badge>
              <Badge variant="destructive" className="text-xs">{stats?.inadimplentes ?? 0} inad.</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Faturamento Mensal (12 meses)</CardTitle></CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Bar dataKey="recebido" name="Recebido" fill="hsl(142 76% 36%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="pendente" name="Pendente" fill="hsl(48 96% 53%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Status Financeiro</CardTitle></CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Empresas — Situação Financeira</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Em Aberto</TableHead>
                  <TableHead>Próx. Cobrança</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {empresasPendentes?.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground">Nenhuma empresa cadastrada</TableCell></TableRow>
                ) : empresasPendentes?.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.razao_social}</TableCell>
                    <TableCell><Badge variant={statusColor(e.status_financeiro || 'adimplente')}>{e.status_financeiro || 'adimplente'}</Badge></TableCell>
                    <TableCell>{fmt(Number(e.valor_em_aberto || 0))}</TableCell>
                    <TableCell>{e.proxima_cobranca || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Contratos Vencendo (90 dias)</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contrato</TableHead>
                  <TableHead>Validade</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contratosVencendo?.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="text-center py-6 text-muted-foreground">Nenhum contrato vencendo nos próximos 90 dias</TableCell></TableRow>
                ) : contratosVencendo?.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.nome}</TableCell>
                    <TableCell>{c.validade}</TableCell>
                    <TableCell><Badge>{c.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FaturamentoDashboard;
