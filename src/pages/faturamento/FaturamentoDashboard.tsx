import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, ExternalLink, Send, Copy, DollarSign, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';

const COLORS = ['hsl(142 76% 36%)', 'hsl(48 96% 53%)', 'hsl(0 84% 60%)', 'hsl(215 20% 65%)'];

const FaturamentoDashboard = () => {
  const queryClient = useQueryClient();
  const [showNewFatura, setShowNewFatura] = useState(false);
  const [newFatura, setNewFatura] = useState({
    empresa_id: '',
    valor: '',
    descricao: '',
    data_vencimento: '',
    email_pagador: '',
    tipo: 'mensalidade',
  });

  // Fetch empresas for selector
  const { data: empresas } = useQuery({
    queryKey: ['empresas-faturamento'],
    queryFn: async () => {
      const { data } = await supabase.from('empresas').select('id, razao_social, nome_fantasia, responsavel_email').eq('ativa', true).order('razao_social');
      return data ?? [];
    },
  });

  // Summary stats
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

      const totalRecebido = (pagos || []).reduce((s, p) => s + Number(p.valor), 0);
      const totalPendente = (pendentes || []).reduce((s, p) => s + Number(p.valor), 0);

      return {
        totalEmpresas: totalEmpresas.count ?? 0,
        adimplentes: adimplentes.count ?? 0,
        inadimplentes: inadimplentes.count ?? 0,
        emAtraso: emAtraso.count ?? 0,
        totalRecebido,
        totalPendente,
      };
    },
  });

  // Faturas list
  const { data: faturas } = useQuery({
    queryKey: ['faturamento-list'],
    queryFn: async () => {
      const { data } = await supabase
        .from('faturamento')
        .select('*, empresas(razao_social, nome_fantasia)')
        .order('created_at', { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  // Monthly revenue chart
  const { data: monthlyData } = useQuery({
    queryKey: ['faturamento-monthly'],
    queryFn: async () => {
      const months = [];
      for (let i = 11; i >= 0; i--) {
        const d = subMonths(new Date(), i);
        const start = startOfMonth(d).toISOString().split('T')[0];
        const end = endOfMonth(d).toISOString().split('T')[0];
        months.push({ date: d, start, end });
      }
      const results = [];
      for (const m of months) {
        const { data: pagos } = await supabase.from('faturamento').select('valor').eq('status', 'pago').gte('data_pagamento', m.start).lte('data_pagamento', m.end);
        const { data: pendentes } = await supabase.from('faturamento').select('valor').eq('status', 'pendente').gte('data_vencimento', m.start).lte('data_vencimento', m.end);
        results.push({
          mes: format(m.date, 'MMM/yy', { locale: ptBR }),
          recebido: (pagos || []).reduce((s, p) => s + Number(p.valor), 0),
          pendente: (pendentes || []).reduce((s, p) => s + Number(p.valor), 0),
        });
      }
      return results;
    },
  });

  // Create payment with Mercado Pago
  const createPayment = useMutation({
    mutationFn: async (data: typeof newFatura) => {
      const empresa = empresas?.find(e => e.id === data.empresa_id);
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const { data: session } = await supabase.auth.getSession();
      
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/mercadopago-create-payment`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.session?.access_token}`,
          },
          body: JSON.stringify({
            empresa_id: data.empresa_id,
            valor: Number(data.valor),
            descricao: data.descricao,
            data_vencimento: data.data_vencimento || undefined,
            email_pagador: data.email_pagador || empresa?.responsavel_email || undefined,
          }),
        }
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao criar cobrança');
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success('Cobrança criada com sucesso!', {
        description: 'Link de pagamento gerado via Mercado Pago.',
      });
      setShowNewFatura(false);
      setNewFatura({ empresa_id: '', valor: '', descricao: '', data_vencimento: '', email_pagador: '', tipo: 'mensalidade' });
      queryClient.invalidateQueries({ queryKey: ['faturamento-list'] });
      queryClient.invalidateQueries({ queryKey: ['faturamento-dashboard-stats'] });

      if (data.payment_link) {
        navigator.clipboard.writeText(data.payment_link);
        toast.info('Link de pagamento copiado!');
      }
    },
    onError: (err: Error) => {
      toast.error('Erro ao criar cobrança', { description: err.message });
    },
  });

  // Create manual fatura (without MP)
  const createManualFatura = useMutation({
    mutationFn: async (data: typeof newFatura) => {
      const numFatura = `FAT-${Date.now().toString(36).toUpperCase()}`;
      const { error } = await supabase.from('faturamento').insert({
        empresa_id: data.empresa_id,
        valor: Number(data.valor),
        descricao: data.descricao,
        data_vencimento: data.data_vencimento || null,
        status: 'pendente',
        tipo: data.tipo,
        numero_fatura: numFatura,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Fatura criada manualmente!');
      setShowNewFatura(false);
      setNewFatura({ empresa_id: '', valor: '', descricao: '', data_vencimento: '', email_pagador: '', tipo: 'mensalidade' });
      queryClient.invalidateQueries({ queryKey: ['faturamento-list'] });
      queryClient.invalidateQueries({ queryKey: ['faturamento-dashboard-stats'] });
    },
    onError: (err: Error) => {
      toast.error('Erro ao criar fatura', { description: err.message });
    },
  });

  // Mark as paid manually
  const markAsPaid = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('faturamento').update({
        status: 'pago',
        data_pagamento: new Date().toISOString().split('T')[0],
        metodo_pagamento: 'manual',
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Fatura marcada como paga!');
      queryClient.invalidateQueries({ queryKey: ['faturamento-list'] });
      queryClient.invalidateQueries({ queryKey: ['faturamento-dashboard-stats'] });
    },
  });

  const pieData = stats ? [
    { name: 'Adimplentes', value: stats.adimplentes },
    { name: 'Em Atraso', value: stats.emAtraso },
    { name: 'Inadimplentes', value: stats.inadimplentes },
  ].filter(d => d.value > 0) : [];

  const statusBadge = (s: string) => {
    if (s === 'pago') return <Badge className="bg-green-100 text-green-800">Pago</Badge>;
    if (s === 'pendente') return <Badge className="bg-yellow-100 text-yellow-800">Pendente</Badge>;
    if (s === 'cancelado') return <Badge variant="destructive">Cancelado</Badge>;
    if (s === 'vencido') return <Badge variant="destructive">Vencido</Badge>;
    return <Badge variant="secondary">{s}</Badge>;
  };

  const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard Financeiro</h1>
          <p className="text-muted-foreground">Faturamento integrado com Mercado Pago</p>
        </div>
        <Dialog open={showNewFatura} onOpenChange={setShowNewFatura}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Nova Cobrança</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Nova Cobrança</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Empresa</Label>
                <Select value={newFatura.empresa_id} onValueChange={v => setNewFatura(p => ({ ...p, empresa_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {empresas?.map(e => (
                      <SelectItem key={e.id} value={e.id}>{e.razao_social}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Valor (R$)</Label>
                  <Input type="number" step="0.01" value={newFatura.valor} onChange={e => setNewFatura(p => ({ ...p, valor: e.target.value }))} placeholder="0,00" />
                </div>
                <div>
                  <Label>Tipo</Label>
                  <Select value={newFatura.tipo} onValueChange={v => setNewFatura(p => ({ ...p, tipo: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mensalidade">Mensalidade</SelectItem>
                      <SelectItem value="avulso">Avulso</SelectItem>
                      <SelectItem value="consultoria">Consultoria</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea value={newFatura.descricao} onChange={e => setNewFatura(p => ({ ...p, descricao: e.target.value }))} placeholder="Descrição da cobrança..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Vencimento</Label>
                  <Input type="date" value={newFatura.data_vencimento} onChange={e => setNewFatura(p => ({ ...p, data_vencimento: e.target.value }))} />
                </div>
                <div>
                  <Label>E-mail do pagador</Label>
                  <Input type="email" value={newFatura.email_pagador} onChange={e => setNewFatura(p => ({ ...p, email_pagador: e.target.value }))} placeholder="email@empresa.com" />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  className="flex-1"
                  onClick={() => createPayment.mutate(newFatura)}
                  disabled={!newFatura.empresa_id || !newFatura.valor || !newFatura.descricao || createPayment.isPending}
                >
                  <Send className="mr-2 h-4 w-4" />
                  {createPayment.isPending ? 'Criando...' : 'Cobrar via Mercado Pago'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => createManualFatura.mutate(newFatura)}
                  disabled={!newFatura.empresa_id || !newFatura.valor || !newFatura.descricao || createManualFatura.isPending}
                >
                  {createManualFatura.isPending ? 'Criando...' : 'Criar Manual'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100"><CheckCircle className="h-5 w-5 text-green-600" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Total Recebido</p>
              <p className="text-xl font-bold text-green-600">{fmt(stats?.totalRecebido ?? 0)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-100"><Clock className="h-5 w-5 text-yellow-600" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Pendente</p>
              <p className="text-xl font-bold text-yellow-600">{fmt(stats?.totalPendente ?? 0)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100"><DollarSign className="h-5 w-5 text-blue-600" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Empresas Ativas</p>
              <p className="text-xl font-bold">{stats?.totalEmpresas ?? 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-100"><AlertTriangle className="h-5 w-5 text-red-600" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Inadimplentes</p>
              <p className="text-xl font-bold text-red-600">{stats?.inadimplentes ?? 0}</p>
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

      {/* Faturas Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Faturas</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº Fatura</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Pagamento</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {faturas?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Nenhuma fatura cadastrada. Clique em "Nova Cobrança" para começar.
                  </TableCell>
                </TableRow>
              ) : faturas?.map((f: any) => (
                <TableRow key={f.id}>
                  <TableCell className="font-mono text-xs">{f.numero_fatura || '—'}</TableCell>
                  <TableCell className="font-medium">{f.empresas?.razao_social || '—'}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{f.descricao}</TableCell>
                  <TableCell className="font-medium">{fmt(Number(f.valor))}</TableCell>
                  <TableCell>{f.data_vencimento || '—'}</TableCell>
                  <TableCell>{statusBadge(f.status || 'pendente')}</TableCell>
                  <TableCell>
                    {f.metodo_pagamento ? (
                      <Badge variant="secondary" className="text-xs">{f.metodo_pagamento}</Badge>
                    ) : '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {f.mp_payment_link && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            navigator.clipboard.writeText(f.mp_payment_link);
                            toast.success('Link copiado!');
                          }}
                          title="Copiar link de pagamento"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      )}
                      {f.mp_payment_link && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => window.open(f.mp_payment_link, '_blank')}
                          title="Abrir link de pagamento"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      )}
                      {f.status === 'pendente' && !f.mp_payment_link && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markAsPaid.mutate(f.id)}
                          className="text-xs"
                        >
                          Marcar Pago
                        </Button>
                      )}
                      {f.status === 'pendente' && f.mp_payment_link && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markAsPaid.mutate(f.id)}
                          className="text-xs"
                        >
                          Pago
                        </Button>
                      )}
                    </div>
                  </TableCell>
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
