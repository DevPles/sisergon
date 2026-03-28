import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

const MODULOS = ['AEP', 'AET', 'Psicossocial', 'PCMSO', 'Checklists', 'Testes', 'Documentos', 'Financeiro'];

/* ───── Planos e Assinaturas ───── */
const PlanosSection = ({ empresaId }: { empresaId: string }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [selectedPlanoId, setSelectedPlanoId] = useState<string>('custom');

  const [form, setForm] = useState({
    tipo_plano: 'basico',
    valor_mensal: '',
    valor_implantacao: '',
    periodicidade: 'mensal',
    limite_usuarios: '',
    limite_empresas_vinculadas: '',
    modulos_ativos: [] as string[],
    status: 'ativo',
  });

  // Carregar planos cadastrados em Configurações
  const { data: planosCadastrados } = useQuery({
    queryKey: ['planos-cadastrados'],
    queryFn: async () => {
      const { data } = await supabase.from('planos').select('*').eq('ativo', true).order('valor_mensal');
      return data ?? [];
    },
  });

  const { data: assinatura, isLoading } = useQuery({
    queryKey: ['empresa-assinatura', empresaId],
    queryFn: async () => {
      const { data } = await supabase
        .from('empresa_assinaturas' as any)
        .select('*')
        .eq('empresa_id', empresaId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data as any;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        empresa_id: empresaId,
        tipo_plano: form.tipo_plano,
        valor_mensal: form.valor_mensal ? parseFloat(form.valor_mensal) : 0,
        valor_implantacao: form.valor_implantacao ? parseFloat(form.valor_implantacao) : 0,
        periodicidade: form.periodicidade,
        limite_usuarios: form.limite_usuarios ? parseInt(form.limite_usuarios) : null,
        limite_empresas_vinculadas: form.limite_empresas_vinculadas ? parseInt(form.limite_empresas_vinculadas) : null,
        modulos_ativos: form.modulos_ativos,
        status: form.status,
      };
      if (assinatura?.id) {
        const { error } = await supabase.from('empresa_assinaturas' as any).update(payload as any).eq('id', assinatura.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('empresa_assinaturas' as any).insert(payload as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empresa-assinatura', empresaId] });
      toast({ title: 'Plano salvo com sucesso' });
      setShowForm(false);
    },
    onError: (err: Error) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  const handleEdit = () => {
    if (assinatura) {
      setForm({
        tipo_plano: assinatura.tipo_plano || 'basico',
        valor_mensal: assinatura.valor_mensal?.toString() || '',
        valor_implantacao: assinatura.valor_implantacao?.toString() || '',
        periodicidade: assinatura.periodicidade || 'mensal',
        limite_usuarios: assinatura.limite_usuarios?.toString() || '',
        limite_empresas_vinculadas: assinatura.limite_empresas_vinculadas?.toString() || '',
        modulos_ativos: assinatura.modulos_ativos || [],
        status: assinatura.status || 'ativo',
      });
    }
    setShowForm(true);
  };

  const toggleModulo = (mod: string) => {
    setForm(prev => ({
      ...prev,
      modulos_ativos: prev.modulos_ativos.includes(mod)
        ? prev.modulos_ativos.filter(m => m !== mod)
        : [...prev.modulos_ativos, mod],
    }));
  };

  const handleSelectPlano = (planoId: string) => {
    setSelectedPlanoId(planoId);
    if (planoId === 'custom') return;
    const plano = planosCadastrados?.find((p: any) => p.id === planoId);
    if (!plano) return;
    const recursos = plano.recursos as Record<string, any> | null;
    setForm({
      tipo_plano: recursos?.tipo_plano || 'personalizado',
      periodicidade: recursos?.periodicidade || 'mensal',
      valor_mensal: String(plano.valor_mensal ?? 0),
      valor_implantacao: String(recursos?.valor_implantacao ?? 0),
      limite_usuarios: String(plano.limite_usuarios ?? ''),
      limite_empresas_vinculadas: String(recursos?.limite_empresas_vinculadas ?? ''),
      modulos_ativos: recursos?.modulos_ativos || [],
      status: form.status,
    });
  };

  if (isLoading) return <p className="text-muted-foreground text-sm py-4">Carregando...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground">Plano e Assinatura</h3>
        <Button variant="outline" size="sm" onClick={handleEdit}
          className="rounded-full shadow-[0_4px_14px_0_hsl(var(--border)/0.4)] hover:scale-105 hover:-translate-y-0.5 transition-all duration-200">
          {assinatura ? 'Editar Plano' : 'Definir Plano'}
        </Button>
      </div>

      {assinatura ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Tipo</p>
            <p className="font-medium capitalize">{assinatura.tipo_plano}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Valor Mensal</p>
            <p className="font-medium">R$ {Number(assinatura.valor_mensal || 0).toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Periodicidade</p>
            <p className="font-medium capitalize">{assinatura.periodicidade}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Status</p>
            <Badge variant={assinatura.status === 'ativo' ? 'default' : assinatura.status === 'suspenso' ? 'secondary' : 'destructive'}>
              {assinatura.status}
            </Badge>
          </div>
          <div className="col-span-2 md:col-span-4">
            <p className="text-xs text-muted-foreground mb-1">Módulos Ativos</p>
            <div className="flex flex-wrap gap-1">
              {(assinatura.modulos_ativos as string[] || []).map((m: string) => (
                <Badge key={m} variant="secondary" className="text-xs">{m}</Badge>
              ))}
              {(!assinatura.modulos_ativos || (assinatura.modulos_ativos as string[]).length === 0) && (
                <span className="text-sm text-muted-foreground">Nenhum módulo definido</span>
              )}
            </div>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Nenhum plano definido para esta empresa.</p>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{assinatura ? 'Editar Plano' : 'Definir Plano'}</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-4">
            {/* Seleção de plano cadastrado */}
            <div className="space-y-2">
              <Label>Selecionar Plano Cadastrado</Label>
              <Select value={selectedPlanoId} onValueChange={handleSelectPlano}>
                <SelectTrigger><SelectValue placeholder="Escolha um plano..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Personalizado (manual)</SelectItem>
                  {planosCadastrados?.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome} — R$ {Number(p.valor_mensal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedPlanoId !== 'custom' && (
                <p className="text-xs text-muted-foreground">Campos preenchidos automaticamente. Você pode ajustar os valores abaixo.</p>
              )}
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Plano</Label>
                <Select value={form.tipo_plano} onValueChange={v => setForm(p => ({ ...p, tipo_plano: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basico">Básico</SelectItem>
                    <SelectItem value="intermediario">Intermediário</SelectItem>
                    <SelectItem value="avancado">Avançado</SelectItem>
                    <SelectItem value="personalizado">Personalizado</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Periodicidade</Label>
                <Select value={form.periodicidade} onValueChange={v => setForm(p => ({ ...p, periodicidade: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mensal">Mensal</SelectItem>
                    <SelectItem value="trimestral">Trimestral</SelectItem>
                    <SelectItem value="anual">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Valor Mensal (R$)</Label>
                <Input type="number" step="0.01" value={form.valor_mensal} onChange={e => setForm(p => ({ ...p, valor_mensal: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Valor Implantação (R$)</Label>
                <Input type="number" step="0.01" value={form.valor_implantacao} onChange={e => setForm(p => ({ ...p, valor_implantacao: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Limite Usuários</Label>
                <Input type="number" value={form.limite_usuarios} onChange={e => setForm(p => ({ ...p, limite_usuarios: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="suspenso">Suspenso</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Módulos Ativos</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {MODULOS.map(mod => (
                  <label key={mod} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={form.modulos_ativos.includes(mod)} onCheckedChange={() => toggleModulo(mod)} />
                    {mod}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}
                className="rounded-full shadow-[0_4px_14px_0_hsl(var(--border)/0.4)] hover:scale-105 hover:-translate-y-0.5 transition-all duration-200">
                Cancelar
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}
                className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_4px_14px_0_hsl(var(--primary)/0.4)] hover:shadow-[0_6px_20px_0_hsl(var(--primary)/0.5)] hover:scale-105 hover:-translate-y-0.5 transition-all duration-200">
                {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

/* ───── Controle Financeiro ───── */
const FinanceiroSection = ({ empresaId }: { empresaId: string }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ valor: '', data_vencimento: '', forma_pagamento: '', observacoes: '', descricao: '', email_pagador: '' });
  const [creatingMP, setCreatingMP] = useState(false);

  const { data: pagamentos, isLoading } = useQuery({
    queryKey: ['empresa-pagamentos', empresaId],
    queryFn: async () => {
      const { data } = await supabase
        .from('empresa_pagamentos' as any)
        .select('*')
        .eq('empresa_id', empresaId)
        .order('created_at', { ascending: false });
      return (data || []) as any[];
    },
  });

  // Also fetch faturas from faturamento table (MP integrated)
  const { data: faturas } = useQuery({
    queryKey: ['empresa-faturas-mp', empresaId],
    queryFn: async () => {
      const { data } = await supabase
        .from('faturamento')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('created_at', { ascending: false });
      return (data || []) as any[];
    },
  });

  const { data: empresa } = useQuery({
    queryKey: ['empresa-financeiro', empresaId],
    queryFn: async () => {
      const { data } = await supabase.from('empresas').select('status_financeiro, data_inicio_contrato, proxima_cobranca, valor_em_aberto, responsavel_email').eq('id', empresaId).single();
      return data as any;
    },
  });

  const addPagamento = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('empresa_pagamentos' as any).insert({
        empresa_id: empresaId,
        valor: parseFloat(form.valor),
        data_vencimento: form.data_vencimento || null,
        forma_pagamento: form.forma_pagamento || null,
        observacoes: form.observacoes || null,
        created_by: user?.id,
        status: 'pendente',
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empresa-pagamentos', empresaId] });
      toast({ title: 'Pagamento registrado' });
      setShowForm(false);
      setForm({ valor: '', data_vencimento: '', forma_pagamento: '', observacoes: '', descricao: '', email_pagador: '' });
    },
    onError: (err: Error) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  // Create payment via Mercado Pago
  const createMPPayment = async () => {
    if (!form.valor || !form.descricao) {
      toast({ title: 'Preencha valor e descrição', variant: 'destructive' });
      return;
    }
    setCreatingMP(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/mercadopago-create-payment`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.session?.access_token}`,
          },
          body: JSON.stringify({
            empresa_id: empresaId,
            valor: Number(form.valor),
            descricao: form.descricao || `Cobrança - ${form.observacoes || 'Mensalidade'}`,
            data_vencimento: form.data_vencimento || undefined,
            email_pagador: form.email_pagador || empresa?.responsavel_email || undefined,
          }),
        }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao criar cobrança');
      }
      const data = await res.json();
      toast({ title: 'Cobrança criada no Mercado Pago!', description: 'Link de pagamento gerado.' });
      if (data.payment_link) {
        await navigator.clipboard.writeText(data.payment_link);
        toast({ title: 'Link copiado para a área de transferência!' });
      }
      queryClient.invalidateQueries({ queryKey: ['empresa-faturas-mp', empresaId] });
      queryClient.invalidateQueries({ queryKey: ['empresa-pagamentos', empresaId] });
      setShowForm(false);
      setForm({ valor: '', data_vencimento: '', forma_pagamento: '', observacoes: '', descricao: '', email_pagador: '' });
    } catch (err: any) {
      toast({ title: 'Erro Mercado Pago', description: err.message, variant: 'destructive' });
    } finally {
      setCreatingMP(false);
    }
  };

  // Generate MP link for existing pending fatura
  const generateMPLink = async (faturaId: string, valor: number, descricao: string) => {
    try {
      const { data: session } = await supabase.auth.getSession();
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/mercadopago-create-payment`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.session?.access_token}`,
          },
          body: JSON.stringify({
            faturamento_id: faturaId,
            empresa_id: empresaId,
            valor,
            descricao,
            email_pagador: empresa?.responsavel_email || undefined,
          }),
        }
      );
      if (!res.ok) throw new Error('Erro ao gerar link');
      const data = await res.json();
      if (data.payment_link) {
        await navigator.clipboard.writeText(data.payment_link);
        toast({ title: 'Link de pagamento copiado!' });
      }
      queryClient.invalidateQueries({ queryKey: ['empresa-faturas-mp', empresaId] });
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  };

  const marcarPago = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('empresa_pagamentos' as any).update({ status: 'pago', data_pagamento: new Date().toISOString().split('T')[0] } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empresa-pagamentos', empresaId] });
      toast({ title: 'Pagamento marcado como pago' });
    },
  });

  const marcarFaturaPaga = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('faturamento').update({ status: 'pago', data_pagamento: new Date().toISOString().split('T')[0], metodo_pagamento: 'manual' }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empresa-faturas-mp', empresaId] });
      toast({ title: 'Fatura marcada como paga' });
    },
  });

  const cancelarPagamento = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('empresa_pagamentos' as any).update({ status: 'cancelado' } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empresa-pagamentos', empresaId] });
      toast({ title: 'Pagamento cancelado' });
    },
  });

  const estornarPagamento = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('empresa_pagamentos' as any).update({ status: 'pendente', data_pagamento: null } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empresa-pagamentos', empresaId] });
      toast({ title: 'Pagamento estornado' });
    },
  });

  const updateStatusFinanceiro = useMutation({
    mutationFn: async (status: string) => {
      const { error } = await supabase.from('empresas').update({ status_financeiro: status } as any).eq('id', empresaId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empresa-financeiro', empresaId] });
      toast({ title: 'Status financeiro atualizado' });
    },
  });

  const statusColor = (s: string) => {
    if (s === 'pago') return 'default' as const;
    if (s === 'pendente') return 'secondary' as const;
    return 'destructive' as const;
  };

  const allPayments = [
    ...(faturas || []).map((f: any) => ({
      id: f.id,
      valor: f.valor,
      data_vencimento: f.data_vencimento,
      data_pagamento: f.data_pagamento,
      forma_pagamento: f.metodo_pagamento,
      status: f.status,
      descricao: f.descricao,
      mp_payment_link: f.mp_payment_link,
      mp_status: f.mp_status,
      numero_fatura: f.numero_fatura,
      source: 'faturamento' as const,
    })),
    ...(pagamentos || []).map((p: any) => ({
      id: p.id,
      valor: p.valor,
      data_vencimento: p.data_vencimento,
      data_pagamento: p.data_pagamento,
      forma_pagamento: p.forma_pagamento,
      status: p.status,
      descricao: p.descricao || p.observacoes || '',
      mp_payment_link: p.mp_payment_link,
      mp_status: p.mp_status,
      numero_fatura: p.numero_fatura,
      source: 'pagamento' as const,
    })),
  ].sort((a, b) => (b.data_vencimento || '').localeCompare(a.data_vencimento || ''));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground">Controle Financeiro</h3>
        <Button variant="outline" size="sm" onClick={() => setShowForm(true)}
          className="rounded-full shadow-[0_4px_14px_0_hsl(var(--border)/0.4)] hover:scale-105 hover:-translate-y-0.5 transition-all duration-200">
          Nova Cobrança
        </Button>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <p className="text-xs text-muted-foreground">Status Financeiro</p>
          <div className="flex items-center gap-2 mt-1">
            <Select value={empresa?.status_financeiro || 'adimplente'} onValueChange={v => updateStatusFinanceiro.mutate(v)}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="adimplente">Adimplente</SelectItem>
                <SelectItem value="inadimplente">Inadimplente</SelectItem>
                <SelectItem value="em_atraso">Em Atraso</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Valor em Aberto</p>
          <p className="font-medium">R$ {Number(empresa?.valor_em_aberto || 0).toFixed(2)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Início Contrato</p>
          <p className="font-medium">{empresa?.data_inicio_contrato || '—'}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Próxima Cobrança</p>
          <p className="font-medium">{empresa?.proxima_cobranca || '—'}</p>
        </div>
      </div>

      {/* Histórico unificado */}
      <div>
        <p className="text-sm font-medium text-muted-foreground mb-2">Histórico de Cobranças</p>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : allPayments.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Pagamento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allPayments.map((p) => (
                <TableRow key={`${p.source}-${p.id}`}>
                  <TableCell className="font-mono text-xs">{p.numero_fatura || '—'}</TableCell>
                  <TableCell className="max-w-[160px] truncate text-sm">{p.descricao || '—'}</TableCell>
                  <TableCell className="font-medium">R$ {Number(p.valor).toFixed(2)}</TableCell>
                  <TableCell>{p.data_vencimento || '—'}</TableCell>
                  <TableCell>{p.data_pagamento || '—'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Badge variant={statusColor(p.status)}>{p.status}</Badge>
                      {p.mp_payment_link && <Badge variant="outline" className="text-xs">MP</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {p.mp_payment_link && (
                        <Button variant="ghost" size="sm" onClick={() => {
                          navigator.clipboard.writeText(p.mp_payment_link);
                          toast({ title: 'Link copiado!' });
                        }}>Link</Button>
                      )}
                      {p.mp_payment_link && (
                        <Button variant="ghost" size="sm" onClick={() => window.open(p.mp_payment_link, '_blank')}>Abrir</Button>
                      )}
                      {p.status === 'pendente' && !p.mp_payment_link && p.source === 'faturamento' && (
                        <Button variant="ghost" size="sm" onClick={() => generateMPLink(p.id, Number(p.valor), p.descricao || 'Cobrança')}>Gerar Link MP</Button>
                      )}
                      {p.status === 'pendente' && (
                        <Button variant="ghost" size="sm" onClick={() =>
                          p.source === 'faturamento' ? marcarFaturaPaga.mutate(p.id) : marcarPago.mutate(p.id)
                        }>Pago</Button>
                      )}
                      {p.status === 'pendente' && p.source === 'pagamento' && (
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => cancelarPagamento.mutate(p.id)}>Cancelar</Button>
                      )}
                      {p.status === 'pago' && p.source === 'pagamento' && (
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => estornarPagamento.mutate(p.id)}>Estornar</Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhuma cobrança registrada.</p>
        )}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Nova Cobrança</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); addPagamento.mutate(); }} className="space-y-4">
            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Input required value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} placeholder="Ex: Mensalidade Março/2026" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor (R$) *</Label>
                <Input type="number" step="0.01" required value={form.valor} onChange={e => setForm(p => ({ ...p, valor: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Vencimento</Label>
                <Input type="date" value={form.data_vencimento} onChange={e => setForm(p => ({ ...p, data_vencimento: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Forma de Pagamento</Label>
                <Select value={form.forma_pagamento} onValueChange={v => setForm(p => ({ ...p, forma_pagamento: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="boleto">Boleto</SelectItem>
                    <SelectItem value="cartao">Cartão</SelectItem>
                    <SelectItem value="transferencia">Transferência</SelectItem>
                    <SelectItem value="mercadopago">Mercado Pago</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>E-mail pagador</Label>
                <Input type="email" value={form.email_pagador} onChange={e => setForm(p => ({ ...p, email_pagador: e.target.value }))} placeholder={empresa?.responsavel_email || 'email@empresa.com'} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Input value={form.observacoes} onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <Button
                type="button"
                onClick={createMPPayment}
                disabled={!form.valor || !form.descricao || creatingMP}
                className="w-full rounded-full bg-[hsl(200,80%,50%)] hover:bg-[hsl(200,80%,40%)] text-white shadow-md hover:scale-105 hover:-translate-y-0.5 transition-all duration-200"
              >
                {creatingMP ? 'Criando...' : '💳 Cobrar via Mercado Pago'}
              </Button>
              <Button type="submit" variant="outline" disabled={addPagamento.isPending}
                className="w-full rounded-full shadow-[0_4px_14px_0_hsl(var(--border)/0.4)] hover:scale-105 hover:-translate-y-0.5 transition-all duration-200">
                {addPagamento.isPending ? 'Salvando...' : 'Registrar Manual'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

/* ───── Contratos ───── */
const ContratosSection = ({ empresaId }: { empresaId: string }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nome: '', tipo: 'contrato_inicial', data_assinatura: '', validade: '', status: 'vigente' });
  const [file, setFile] = useState<File | null>(null);

  const { data: contratos, isLoading } = useQuery({
    queryKey: ['empresa-contratos-billing', empresaId],
    queryFn: async () => {
      const { data } = await supabase
        .from('empresa_contratos' as any)
        .select('*')
        .eq('empresa_id', empresaId)
        .order('created_at', { ascending: false });
      return (data || []) as any[];
    },
  });

  const addContrato = useMutation({
    mutationFn: async () => {
      let arquivo_url = null;
      if (file) {
        const path = `empresa-${empresaId}/${Date.now()}-${file.name}`;
        const { error: upErr } = await supabase.storage.from('contratos').upload(path, file);
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from('contratos').getPublicUrl(path);
        arquivo_url = urlData.publicUrl;
      }
      const { error } = await supabase.from('empresa_contratos' as any).insert({
        empresa_id: empresaId,
        nome: form.nome,
        tipo: form.tipo,
        data_assinatura: form.data_assinatura || null,
        validade: form.validade || null,
        status: form.status,
        arquivo_url,
        created_by: user?.id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empresa-contratos-billing', empresaId] });
      toast({ title: 'Contrato adicionado' });
      setShowForm(false);
      setForm({ nome: '', tipo: 'contrato_inicial', data_assinatura: '', validade: '', status: 'vigente' });
      setFile(null);
    },
    onError: (err: Error) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  const deleteContrato = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('empresa_contratos' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empresa-contratos-billing', empresaId] });
      toast({ title: 'Contrato excluído' });
    },
    onError: (err: Error) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  const tipoLabel = (t: string) => {
    const map: Record<string, string> = { contrato_inicial: 'Inicial', aditivo: 'Aditivo', renovacao: 'Renovação' };
    return map[t] || t;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground">Contratos</h3>
        <Button variant="outline" size="sm" onClick={() => setShowForm(true)}
          className="rounded-full shadow-[0_4px_14px_0_hsl(var(--border)/0.4)] hover:scale-105 hover:-translate-y-0.5 transition-all duration-200">
          Novo Contrato
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : contratos && contratos.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Assinatura</TableHead>
              <TableHead>Validade</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contratos.map((c: any) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.nome}</TableCell>
                <TableCell>{tipoLabel(c.tipo)}</TableCell>
                <TableCell>{c.data_assinatura || '—'}</TableCell>
                <TableCell>{c.validade || '—'}</TableCell>
                <TableCell>
                  <Badge variant={c.status === 'vigente' ? 'default' : c.status === 'vencido' ? 'secondary' : 'destructive'}>
                    {c.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {c.arquivo_url && (
                      <Button variant="ghost" size="sm" asChild>
                        <a href={c.arquivo_url} target="_blank" rel="noopener noreferrer">Ver Doc</a>
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteContrato.mutate(c.id)}>Excluir</Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <p className="text-sm text-muted-foreground">Nenhum contrato cadastrado.</p>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Novo Contrato</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); addContrato.mutate(); }} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do Contrato *</Label>
              <Input required value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={v => setForm(p => ({ ...p, tipo: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="contrato_inicial">Contrato Inicial</SelectItem>
                  <SelectItem value="aditivo">Aditivo</SelectItem>
                  <SelectItem value="renovacao">Renovação</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data Assinatura</Label>
                <Input type="date" value={form.data_assinatura} onChange={e => setForm(p => ({ ...p, data_assinatura: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Validade</Label>
                <Input type="date" value={form.validade} onChange={e => setForm(p => ({ ...p, validade: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="vigente">Vigente</SelectItem>
                  <SelectItem value="vencido">Vencido</SelectItem>
                  <SelectItem value="rescindido">Rescindido</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Arquivo (PDF)</Label>
              <Input type="file" accept=".pdf" onChange={e => setFile(e.target.files?.[0] || null)} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}
                className="rounded-full shadow-[0_4px_14px_0_hsl(var(--border)/0.4)] hover:scale-105 hover:-translate-y-0.5 transition-all duration-200">
                Cancelar
              </Button>
              <Button type="submit" disabled={addContrato.isPending}
                className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_4px_14px_0_hsl(var(--primary)/0.4)] hover:shadow-[0_6px_20px_0_hsl(var(--primary)/0.5)] hover:scale-105 hover:-translate-y-0.5 transition-all duration-200">
                {addContrato.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};


/* ═══════════════════════════════════════════════
   MAIN FATURAMENTO TAB
   ═══════════════════════════════════════════════ */
const FaturamentoTab = ({ selectedEmpresa }: { selectedEmpresa: string }) => {
  if (!selectedEmpresa) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Selecione uma empresa para gerenciar o faturamento.</p>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <PlanosSection empresaId={selectedEmpresa} />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-6">
          <FinanceiroSection empresaId={selectedEmpresa} />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-6">
          <ContratosSection empresaId={selectedEmpresa} />
        </CardContent>
      </Card>
    </div>
  );
};

export default FaturamentoTab;
