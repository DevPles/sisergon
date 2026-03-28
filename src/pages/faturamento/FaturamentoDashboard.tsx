import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Clock, DollarSign, AlertTriangle } from 'lucide-react';

const COLORS = ['hsl(142 76% 36%)', 'hsl(48 96% 53%)', 'hsl(0 84% 60%)', 'hsl(215 20% 65%)'];

const FaturamentoDashboard = () => {
  const navigate = useNavigate();

  const { data: stats } = useQuery({
    queryKey: ['faturamento-dashboard-stats'],
    queryFn: async () => {
      const [totalEmpresas, adimplentes, inadimplentes, emAtraso] = await Promise.all([
        supabase.from('empresas').select('id', { count: 'exact', head: true }).eq('ativa', true),
        supabase.from('empresas').select('id', { count: 'exact', head: true }).eq('status_financeiro', 'adimplente'),
        supabase.from('empresas').select('id', { count: 'exact', head: true }).eq('status_financeiro', 'inadimplente'),
        supabase.from('empresas').select('id', { count: 'exact', head: true }).eq('status_financeiro', 'em_atraso'),
      ]);
      const { data: pagos } = await supabase.from('faturamento').select('valor').eq('status', 'pago');
      const { data: pendentes } = await supabase.from('faturamento').select('valor').eq('status', 'pendente');
      return {
        totalEmpresas: totalEmpresas.count ?? 0,
        adimplentes: adimplentes.count ?? 0,
        inadimplentes: inadimplentes.count ?? 0,
        emAtraso: emAtraso.count ?? 0,
        totalRecebido: (pagos || []).reduce((s, p) => s + Number(p.valor), 0),
        totalPendente: (pendentes || []).reduce((s, p) => s + Number(p.valor), 0),
      };
    },
  });

  const { data: monthlyData } = useQuery({
    queryKey: ['faturamento-monthly'],
    queryFn: async () => {
      const results = [];
      for (let i = 11; i >= 0; i--) {
        const d = subMonths(new Date(), i);
        const start = startOfMonth(d).toISOString().split('T')[0];
        const end = endOfMonth(d).toISOString().split('T')[0];
        const { data: pagos } = await supabase.from('faturamento').select('valor').eq('status', 'pago').gte('data_pagamento', start).lte('data_pagamento', end);
        const { data: pendentes } = await supabase.from('faturamento').select('valor').eq('status', 'pendente').gte('data_vencimento', start).lte('data_vencimento', end);
        results.push({
          mes: format(d, 'MMM/yy', { locale: ptBR }),
          recebido: (pagos || []).reduce((s, p) => s + Number(p.valor), 0),
          pendente: (pendentes || []).reduce((s, p) => s + Number(p.valor), 0),
        });
      }
      return results;
    },
  });

  const { data: recentFaturas } = useQuery({
    queryKey: ['faturamento-recent'],
    queryFn: async () => {
      const { data } = await supabase.from('faturamento').select('*, empresas(razao_social)').order('created_at', { ascending: false }).limit(10);
      return data ?? [];
    },
  });

  const pieData = stats ? [
    { name: 'Adimplentes', value: stats.adimplentes },
    { name: 'Em Atraso', value: stats.emAtraso },
    { name: 'Inadimplentes', value: stats.inadimplentes },
  ].filter(d => d.value > 0) : [];

  const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  const statusBadge = (s: string) => {
    if (s === 'pago') return <Badge className="bg-green-100 text-green-800">Pago</Badge>;
    if (s === 'pendente') return <Badge className="bg-yellow-100 text-yellow-800">Pendente</Badge>;
    return <Badge variant="destructive">{s}</Badge>;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard Financeiro</h1>
          <p className="text-muted-foreground">Visão geral — para gerenciar cobranças, acesse Cadastros → Faturamento</p>
        </div>
        <Button onClick={() => navigate('/cadastros')}>Gerenciar Cobranças</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-green-100"><CheckCircle className="h-5 w-5 text-green-600" /></div><div><p className="text-sm text-muted-foreground">Total Recebido</p><p className="text-xl font-bold text-green-600">{fmt(stats?.totalRecebido ?? 0)}</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-yellow-100"><Clock className="h-5 w-5 text-yellow-600" /></div><div><p className="text-sm text-muted-foreground">Pendente</p><p className="text-xl font-bold text-yellow-600">{fmt(stats?.totalPendente ?? 0)}</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-blue-100"><DollarSign className="h-5 w-5 text-blue-600" /></div><div><p className="text-sm text-muted-foreground">Empresas Ativas</p><p className="text-xl font-bold">{stats?.totalEmpresas ?? 0}</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-red-100"><AlertTriangle className="h-5 w-5 text-red-600" /></div><div><p className="text-sm text-muted-foreground">Inadimplentes</p><p className="text-xl font-bold text-red-600">{stats?.inadimplentes ?? 0}</p></div></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Faturamento Mensal (12 meses)</CardTitle></CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
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

      <Card>
        <CardHeader><CardTitle className="text-base">Últimas Faturas</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentFaturas?.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">Nenhuma fatura encontrada</TableCell></TableRow>
              ) : recentFaturas?.map((f: any) => (
                <TableRow key={f.id}>
                  <TableCell className="font-mono text-xs">{f.numero_fatura || '—'}</TableCell>
                  <TableCell>{f.empresas?.razao_social || '—'}</TableCell>
                  <TableCell className="font-medium">{fmt(Number(f.valor))}</TableCell>
                  <TableCell>{f.data_vencimento || '—'}</TableCell>
                  <TableCell>{statusBadge(f.status || 'pendente')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default FaturamentoDashboard;
