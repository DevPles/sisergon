import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus } from 'lucide-react';

const MODULOS = ['AEP', 'AET', 'Psicossocial', 'PCMSO', 'Checklists', 'Testes', 'Documentos', 'Financeiro'];

type CobrancaForm = {
  valor: string;
  data_vencimento: string;
  forma_pagamento: string;
  observacoes: string;
  descricao: string;
  email_pagador: string;
  tipo_cobranca: 'pontual' | 'recorrente';
  card_number: string;
  card_expiry: string;
  card_cvv: string;
  card_holder_name: string;
  card_holder_cpf: string;
};

const emptyForm: CobrancaForm = {
  valor: '',
  data_vencimento: '',
  forma_pagamento: '',
  observacoes: '',
  descricao: '',
  email_pagador: '',
  tipo_cobranca: 'pontual',
  card_number: '',
  card_expiry: '',
  card_cvv: '',
  card_holder_name: '',
  card_holder_cpf: '',
};

const emptyPlano = {
  tipo_plano: 'basico',
  valor_mensal: '',
  valor_implantacao: '',
  periodicidade: 'mensal',
  limite_usuarios: '',
  limite_empresas_vinculadas: '',
  modulos_ativos: [] as string[],
  status: 'ativo',
  pagamento_recorrente: false,
  metodo_pagamento: 'boleto',
  dia_cobranca: '1',
};

/* ═══════════════════════════════════════════════
   UNIFIED FATURAMENTO TAB
   ═══════════════════════════════════════════════ */
const FaturamentoTab = ({ selectedEmpresa }: { selectedEmpresa: string }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ─── Dialogs ───
  const [showPlanoForm, setShowPlanoForm] = useState(false);
  const [showCobrancaForm, setShowCobrancaForm] = useState(false);
  const [showContratoForm, setShowContratoForm] = useState(false);
  const [selectedPlanoId, setSelectedPlanoId] = useState<string>('custom');
  const [creatingMP, setCreatingMP] = useState(false);

  // ─── Form states ───
  const [planoForm, setPlanoForm] = useState({ ...emptyPlano });
  const [cobrancaForm, setCobrancaForm] = useState({ ...emptyForm });
  const [contratoForm, setContratoForm] = useState({ nome: '', tipo: 'contrato_inicial', data_assinatura: '', validade: '', status: 'vigente' });
  const [file, setFile] = useState<File | null>(null);

  // ═══ QUERIES ═══
  const { data: planosCadastrados } = useQuery({
    queryKey: ['planos-cadastrados'],
    queryFn: async () => {
      const { data } = await supabase.from('planos').select('*').eq('ativo', true).order('valor_mensal');
      return data ?? [];
    },
  });

  const { data: assinatura, isLoading: loadingAssinatura } = useQuery({
    queryKey: ['empresa-assinatura', selectedEmpresa],
    queryFn: async () => {
      const { data } = await supabase
        .from('empresa_assinaturas' as any)
        .select('*')
        .eq('empresa_id', selectedEmpresa)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data as any;
    },
  });

  const { data: empresa } = useQuery({
    queryKey: ['empresa-financeiro', selectedEmpresa],
    queryFn: async () => {
      const { data } = await supabase.from('empresas').select('status_financeiro, proxima_cobranca, valor_em_aberto, responsavel_email').eq('id', selectedEmpresa).single();
      return data as any;
    },
  });

  const { data: faturas, isLoading: loadingFaturas } = useQuery({
    queryKey: ['empresa-faturas-mp', selectedEmpresa],
    queryFn: async () => {
      const { data } = await supabase.from('faturamento').select('*').eq('empresa_id', selectedEmpresa).order('created_at', { ascending: false });
      return (data || []) as any[];
    },
  });

  const { data: pagamentos } = useQuery({
    queryKey: ['empresa-pagamentos', selectedEmpresa],
    queryFn: async () => {
      const { data } = await supabase.from('empresa_pagamentos' as any).select('*').eq('empresa_id', selectedEmpresa).order('created_at', { ascending: false });
      return (data || []) as any[];
    },
  });

  const { data: contratos, isLoading: loadingContratos } = useQuery({
    queryKey: ['empresa-contratos-billing', selectedEmpresa],
    queryFn: async () => {
      const { data } = await supabase.from('empresa_contratos' as any).select('*').eq('empresa_id', selectedEmpresa).order('created_at', { ascending: false });
      return (data || []) as any[];
    },
  });

  // ═══ MUTATIONS ═══
  const savePlano = useMutation({
    mutationFn: async () => {
      const payload = {
        empresa_id: selectedEmpresa,
        tipo_plano: planoForm.tipo_plano,
        valor_mensal: planoForm.valor_mensal ? parseFloat(planoForm.valor_mensal) : 0,
        valor_implantacao: planoForm.valor_implantacao ? parseFloat(planoForm.valor_implantacao) : 0,
        periodicidade: planoForm.periodicidade,
        limite_usuarios: planoForm.limite_usuarios ? parseInt(planoForm.limite_usuarios) : null,
        limite_empresas_vinculadas: planoForm.limite_empresas_vinculadas ? parseInt(planoForm.limite_empresas_vinculadas) : null,
        modulos_ativos: planoForm.modulos_ativos,
        status: planoForm.status,
        pagamento_recorrente: planoForm.pagamento_recorrente,
        metodo_pagamento: planoForm.metodo_pagamento,
        dia_cobranca: planoForm.dia_cobranca ? parseInt(planoForm.dia_cobranca) : 1,
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
      queryClient.invalidateQueries({ queryKey: ['empresa-assinatura', selectedEmpresa] });
      toast({ title: 'Plano salvo com sucesso' });
      setShowPlanoForm(false);
    },
    onError: (err: Error) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  const addPagamentoManual = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('empresa_pagamentos' as any).insert({
        empresa_id: selectedEmpresa,
        valor: parseFloat(cobrancaForm.valor),
        data_vencimento: cobrancaForm.data_vencimento || null,
        metodo_pagamento: cobrancaForm.forma_pagamento || null,
        descricao: cobrancaForm.descricao || null,
        status: 'pendente',
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empresa-pagamentos', selectedEmpresa] });
      toast({ title: 'Pagamento registrado' });
      setShowCobrancaForm(false);
      setCobrancaForm({ ...emptyForm });
    },
    onError: (err: Error) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  const marcarFaturaPaga = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('faturamento').update({ status: 'pago', data_pagamento: new Date().toISOString().split('T')[0], metodo_pagamento: 'manual' }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['empresa-faturas-mp', selectedEmpresa] }); toast({ title: 'Fatura marcada como paga' }); },
  });

  const marcarPago = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('empresa_pagamentos' as any).update({ status: 'pago', data_pagamento: new Date().toISOString().split('T')[0] } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['empresa-pagamentos', selectedEmpresa] }); toast({ title: 'Pagamento marcado como pago' }); },
  });

  const cancelarPagamento = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('empresa_pagamentos' as any).update({ status: 'cancelado' } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['empresa-pagamentos', selectedEmpresa] }); toast({ title: 'Pagamento cancelado' }); },
  });

  const updateStatusFinanceiro = useMutation({
    mutationFn: async (status: string) => {
      const { error } = await supabase.from('empresas').update({ status_financeiro: status } as any).eq('id', selectedEmpresa);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['empresa-financeiro', selectedEmpresa] }); toast({ title: 'Status financeiro atualizado' }); },
  });

  const addContrato = useMutation({
    mutationFn: async () => {
      let arquivo_url = null;
      if (file) {
        const path = `empresa-${selectedEmpresa}/${Date.now()}-${file.name}`;
        const { error: upErr } = await supabase.storage.from('documentos').upload(path, file);
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from('documentos').getPublicUrl(path);
        arquivo_url = urlData.publicUrl;
      }
      const { error } = await supabase.from('empresa_contratos' as any).insert({
        empresa_id: selectedEmpresa,
        nome: contratoForm.nome,
        status: contratoForm.status,
        data_inicio: contratoForm.data_assinatura || null,
        validade: contratoForm.validade || null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empresa-contratos-billing', selectedEmpresa] });
      toast({ title: 'Contrato adicionado' });
      setShowContratoForm(false);
      setContratoForm({ nome: '', tipo: 'contrato_inicial', data_assinatura: '', validade: '', status: 'vigente' });
      setFile(null);
    },
    onError: (err: Error) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  const deleteContrato = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('empresa_contratos' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['empresa-contratos-billing', selectedEmpresa] }); toast({ title: 'Contrato excluído' }); },
  });

  // ═══ MP ACTIONS ═══
  const createMPPayment = async () => {
    if (!cobrancaForm.valor || !cobrancaForm.descricao) {
      toast({ title: 'Preencha valor e descrição', variant: 'destructive' });
      return;
    }
    if (cobrancaForm.tipo_cobranca === 'recorrente' && (!cobrancaForm.card_holder_name || !cobrancaForm.email_pagador)) {
      toast({ title: 'Preencha nome do titular e e-mail para recorrência', variant: 'destructive' });
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
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.session?.access_token}` },
          body: JSON.stringify({
            empresa_id: selectedEmpresa,
            valor: Number(cobrancaForm.valor),
            descricao: cobrancaForm.descricao,
            data_vencimento: cobrancaForm.data_vencimento || undefined,
            email_pagador: cobrancaForm.email_pagador || empresa?.responsavel_email || undefined,
            tipo_cobranca: cobrancaForm.tipo_cobranca,
            card_holder_name: cobrancaForm.card_holder_name || undefined,
            card_holder_cpf: cobrancaForm.card_holder_cpf || undefined,
          }),
        }
      );
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Erro ao criar cobrança'); }
      const data = await res.json();
      toast({ title: cobrancaForm.tipo_cobranca === 'recorrente' ? 'Assinatura recorrente criada!' : 'Cobrança criada!', description: 'Link de pagamento gerado.' });
      if (data.payment_link) { await navigator.clipboard.writeText(data.payment_link); toast({ title: 'Link copiado!' }); }
      queryClient.invalidateQueries({ queryKey: ['empresa-faturas-mp', selectedEmpresa] });
      queryClient.invalidateQueries({ queryKey: ['empresa-pagamentos', selectedEmpresa] });
      setShowCobrancaForm(false);
      setCobrancaForm({ ...emptyForm });
    } catch (err: any) {
      toast({ title: 'Erro Mercado Pago', description: err.message, variant: 'destructive' });
    } finally { setCreatingMP(false); }
  };

  const generateMPLink = async (faturaId: string, valor: number, descricao: string) => {
    try {
      const { data: session } = await supabase.auth.getSession();
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/mercadopago-create-payment`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.session?.access_token}` },
          body: JSON.stringify({ faturamento_id: faturaId, empresa_id: selectedEmpresa, valor, descricao, email_pagador: empresa?.responsavel_email || undefined }),
        }
      );
      if (!res.ok) throw new Error('Erro ao gerar link');
      const data = await res.json();
      if (data.payment_link) { await navigator.clipboard.writeText(data.payment_link); toast({ title: 'Link copiado!' }); }
      queryClient.invalidateQueries({ queryKey: ['empresa-faturas-mp', selectedEmpresa] });
    } catch (err: any) { toast({ title: 'Erro', description: err.message, variant: 'destructive' }); }
  };

  // ═══ HELPERS ═══
  const handleEditPlano = () => {
    if (assinatura) {
      setPlanoForm({
        tipo_plano: assinatura.tipo_plano || 'basico',
        valor_mensal: assinatura.valor_mensal?.toString() || '',
        valor_implantacao: assinatura.valor_implantacao?.toString() || '',
        periodicidade: assinatura.periodicidade || 'mensal',
        limite_usuarios: assinatura.limite_usuarios?.toString() || '',
        limite_empresas_vinculadas: assinatura.limite_empresas_vinculadas?.toString() || '',
        modulos_ativos: assinatura.modulos_ativos || [],
        status: assinatura.status || 'ativo',
        pagamento_recorrente: assinatura.pagamento_recorrente || false,
        metodo_pagamento: assinatura.metodo_pagamento || 'boleto',
        dia_cobranca: assinatura.dia_cobranca?.toString() || '1',
      });
    } else {
      setPlanoForm({ ...emptyPlano });
    }
    setShowPlanoForm(true);
  };

  const handleSelectPlano = (planoId: string) => {
    setSelectedPlanoId(planoId);
    if (planoId === 'custom') return;
    const plano = planosCadastrados?.find((p: any) => p.id === planoId);
    if (!plano) return;
    const recursos = plano.recursos as Record<string, any> | null;
    setPlanoForm(prev => ({
      ...prev,
      tipo_plano: recursos?.tipo_plano || 'personalizado',
      periodicidade: recursos?.periodicidade || 'mensal',
      valor_mensal: String(plano.valor_mensal ?? 0),
      valor_implantacao: String(recursos?.valor_implantacao ?? 0),
      limite_usuarios: String(plano.limite_usuarios ?? ''),
      limite_empresas_vinculadas: String(recursos?.limite_empresas_vinculadas ?? ''),
      modulos_ativos: recursos?.modulos_ativos || [],
    }));
  };

  const toggleModulo = (mod: string) => {
    setPlanoForm(prev => ({
      ...prev,
      modulos_ativos: prev.modulos_ativos.includes(mod)
        ? prev.modulos_ativos.filter(m => m !== mod)
        : [...prev.modulos_ativos, mod],
    }));
  };

  const openNewCobranca = () => {
    // Pre-fill from plan if exists
    if (assinatura) {
      setCobrancaForm({
        ...emptyForm,
        valor: assinatura.valor_mensal?.toString() || '',
        descricao: `Mensalidade ${assinatura.tipo_plano || ''} - ${new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`,
        tipo_cobranca: assinatura.pagamento_recorrente ? 'recorrente' : 'pontual',
        forma_pagamento: assinatura.metodo_pagamento || '',
        email_pagador: empresa?.responsavel_email || '',
      });
    } else {
      setCobrancaForm({ ...emptyForm, email_pagador: empresa?.responsavel_email || '' });
    }
    setShowCobrancaForm(true);
  };

  const statusColor = (s: string) => {
    if (s === 'pago') return 'default' as const;
    if (s === 'pendente') return 'secondary' as const;
    return 'destructive' as const;
  };

  const allPayments = [
    ...(faturas || []).map((f: any) => ({ id: f.id, valor: f.valor, data_vencimento: f.data_vencimento, data_pagamento: f.data_pagamento, status: f.status, descricao: f.descricao, mp_payment_link: f.mp_payment_link, mp_status: f.mp_status, numero_fatura: f.numero_fatura, source: 'faturamento' as const })),
    ...(pagamentos || []).map((p: any) => ({ id: p.id, valor: p.valor, data_vencimento: p.data_vencimento, data_pagamento: p.data_pagamento, status: p.status, descricao: p.descricao || '', mp_payment_link: p.mp_payment_link, mp_status: p.mp_status, numero_fatura: p.numero_fatura, source: 'pagamento' as const })),
  ].sort((a, b) => (b.data_vencimento || '').localeCompare(a.data_vencimento || ''));

  // ═══ KPIs ═══
  const totalRecebido = allPayments.filter(p => p.status === 'pago').reduce((s, p) => s + Number(p.valor), 0);
  const totalPendente = allPayments.filter(p => p.status === 'pendente').reduce((s, p) => s + Number(p.valor), 0);

  // ═══ RENDER ═══
  if (!selectedEmpresa) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Selecione uma empresa para gerenciar o faturamento.</p>;
  }

  return (
    <div className="space-y-6">
      {/* ─── KPI Cards ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div>
            <div>
              <p className="text-xs text-muted-foreground">Recebido</p>
              <p className="text-lg font-bold text-foreground">R$ {totalRecebido.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div>
            <div>
              <p className="text-xs text-muted-foreground">Pendente</p>
              <p className="text-lg font-bold text-foreground">R$ {totalPendente.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div>
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <Select value={empresa?.status_financeiro || 'adimplente'} onValueChange={v => updateStatusFinanceiro.mutate(v)}>
                <SelectTrigger className="h-7 text-xs border-0 p-0 shadow-none"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="adimplente">Adimplente</SelectItem>
                  <SelectItem value="inadimplente">Inadimplente</SelectItem>
                  <SelectItem value="em_atraso">Em Atraso</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-accent/50"><CreditCard className="h-5 w-5 text-accent-foreground" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Próx. Cobrança</p>
              <p className="text-sm font-medium text-foreground">{empresa?.proxima_cobranca || '—'}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Plano + Nova Cobrança (unified card) ─── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Plano, Assinatura & Cobranças</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleEditPlano}
                className="rounded-full shadow-[0_4px_14px_0_hsl(var(--border)/0.4)] hover:scale-105 hover:-translate-y-0.5 transition-all duration-200">
                {assinatura ? 'Editar Plano' : 'Definir Plano'}
              </Button>
              <Button size="sm" onClick={openNewCobranca}
                className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_4px_14px_0_hsl(var(--primary)/0.4)] hover:scale-105 hover:-translate-y-0.5 transition-all duration-200">
                <Plus className="h-4 w-4 mr-1" /> Nova Cobrança
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Plano info summary */}
          {loadingAssinatura ? (
            <p className="text-sm text-muted-foreground">Carregando plano...</p>
          ) : assinatura ? (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-3 rounded-lg bg-muted/30">
              <div>
                <p className="text-xs text-muted-foreground">Plano</p>
                <p className="font-medium capitalize text-sm">{assinatura.tipo_plano}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Valor Mensal</p>
                <p className="font-medium text-sm">R$ {Number(assinatura.valor_mensal || 0).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Periodicidade</p>
                <p className="font-medium capitalize text-sm">{assinatura.periodicidade}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pagamento</p>
                <Badge variant={assinatura.pagamento_recorrente ? 'default' : 'secondary'} className="text-xs">
                  {assinatura.pagamento_recorrente ? `Recorrente (dia ${assinatura.dia_cobranca || 1})` : 'Pontual'}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <Badge variant={assinatura.status === 'ativo' ? 'default' : 'destructive'} className="text-xs">{assinatura.status}</Badge>
              </div>
              {assinatura.modulos_ativos && (assinatura.modulos_ativos as string[]).length > 0 && (
                <div className="col-span-2 md:col-span-5">
                  <p className="text-xs text-muted-foreground mb-1">Módulos</p>
                  <div className="flex flex-wrap gap-1">
                    {(assinatura.modulos_ativos as string[]).map((m: string) => (
                      <Badge key={m} variant="outline" className="text-xs">{m}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">Nenhum plano definido. Clique em "Definir Plano" para configurar.</p>
          )}

          <Separator />

          {/* Histórico de cobranças */}
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">Histórico de Cobranças</p>
            {loadingFaturas ? (
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
                            <>
                              <Button variant="ghost" size="sm" onClick={() => { navigator.clipboard.writeText(p.mp_payment_link); toast({ title: 'Link copiado!' }); }}>Link</Button>
                              <Button variant="ghost" size="sm" onClick={() => window.open(p.mp_payment_link, '_blank')}>Abrir</Button>
                            </>
                          )}
                          {p.status === 'pendente' && !p.mp_payment_link && p.source === 'faturamento' && (
                            <Button variant="ghost" size="sm" onClick={() => generateMPLink(p.id, Number(p.valor), p.descricao || 'Cobrança')}>Gerar Link MP</Button>
                          )}
                          {p.status === 'pendente' && (
                            <Button variant="ghost" size="sm" onClick={() => p.source === 'faturamento' ? marcarFaturaPaga.mutate(p.id) : marcarPago.mutate(p.id)}>Pago</Button>
                          )}
                          {p.status === 'pendente' && p.source === 'pagamento' && (
                            <Button variant="ghost" size="sm" className="text-destructive" onClick={() => cancelarPagamento.mutate(p.id)}>Cancelar</Button>
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
        </CardContent>
      </Card>

      {/* ─── Contratos ─── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" /> Contratos</CardTitle>
            <Button variant="outline" size="sm" onClick={() => setShowContratoForm(true)}
              className="rounded-full shadow-[0_4px_14px_0_hsl(var(--border)/0.4)] hover:scale-105 hover:-translate-y-0.5 transition-all duration-200">
              Novo Contrato
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingContratos ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : contratos && contratos.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Início</TableHead>
                  <TableHead>Validade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contratos.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.nome}</TableCell>
                    <TableCell>{c.data_inicio || '—'}</TableCell>
                    <TableCell>{c.validade || '—'}</TableCell>
                    <TableCell><Badge variant={c.status === 'ativo' ? 'default' : 'secondary'}>{c.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteContrato.mutate(c.id)}>Excluir</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum contrato cadastrado.</p>
          )}
        </CardContent>
      </Card>

      {/* ═══ DIALOG: Definir Plano ═══ */}
      <Dialog open={showPlanoForm} onOpenChange={setShowPlanoForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{assinatura ? 'Editar Plano' : 'Definir Plano'}</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); savePlano.mutate(); }} className="space-y-4">
            <div className="space-y-2">
              <Label>Selecionar Plano Cadastrado</Label>
              <Select value={selectedPlanoId} onValueChange={handleSelectPlano}>
                <SelectTrigger><SelectValue placeholder="Escolha um plano..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Personalizado (manual)</SelectItem>
                  {planosCadastrados?.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>{p.nome} — R$ {Number(p.valor_mensal || 0).toFixed(2)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Plano</Label>
                <Select value={planoForm.tipo_plano} onValueChange={v => setPlanoForm(p => ({ ...p, tipo_plano: v }))}>
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
                <Select value={planoForm.periodicidade} onValueChange={v => setPlanoForm(p => ({ ...p, periodicidade: v }))}>
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
                <Input type="number" step="0.01" value={planoForm.valor_mensal} onChange={e => setPlanoForm(p => ({ ...p, valor_mensal: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Valor Implantação (R$)</Label>
                <Input type="number" step="0.01" value={planoForm.valor_implantacao} onChange={e => setPlanoForm(p => ({ ...p, valor_implantacao: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Limite Usuários</Label>
                <Input type="number" value={planoForm.limite_usuarios} onChange={e => setPlanoForm(p => ({ ...p, limite_usuarios: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={planoForm.status} onValueChange={v => setPlanoForm(p => ({ ...p, status: v }))}>
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
                    <Checkbox checked={planoForm.modulos_ativos.includes(mod)} onCheckedChange={() => toggleModulo(mod)} />
                    {mod}
                  </label>
                ))}
              </div>
            </div>
            <Separator />
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Forma de Pagamento</Label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={planoForm.pagamento_recorrente} onCheckedChange={(v) => setPlanoForm(p => ({ ...p, pagamento_recorrente: !!v }))} />
                Pagamento recorrente (cobrança automática todo mês)
              </label>
              {planoForm.pagamento_recorrente && (
                <div className="grid grid-cols-2 gap-4 pl-6">
                  <div className="space-y-2">
                    <Label>Método</Label>
                    <Select value={planoForm.metodo_pagamento} onValueChange={v => setPlanoForm(p => ({ ...p, metodo_pagamento: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cartao">Cartão de Crédito</SelectItem>
                        <SelectItem value="boleto">Boleto</SelectItem>
                        <SelectItem value="pix">PIX</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Dia da cobrança</Label>
                    <Input type="number" min="1" max="28" value={planoForm.dia_cobranca} onChange={e => setPlanoForm(p => ({ ...p, dia_cobranca: e.target.value }))} />
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowPlanoForm(false)} className="rounded-full">Cancelar</Button>
              <Button type="submit" disabled={savePlano.isPending}
                className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground">
                {savePlano.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ═══ DIALOG: Nova Cobrança ═══ */}
      <Dialog open={showCobrancaForm} onOpenChange={setShowCobrancaForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nova Cobrança</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); addPagamentoManual.mutate(); }} className="space-y-4">
            {/* Tipo de cobrança toggle */}
            <div className="flex gap-2">
              <Button type="button" size="sm" variant={cobrancaForm.tipo_cobranca === 'pontual' ? 'default' : 'outline'}
                onClick={() => setCobrancaForm(p => ({ ...p, tipo_cobranca: 'pontual' }))} className="flex-1 rounded-full">
                Pontual
              </Button>
              <Button type="button" size="sm" variant={cobrancaForm.tipo_cobranca === 'recorrente' ? 'default' : 'outline'}
                onClick={() => setCobrancaForm(p => ({ ...p, tipo_cobranca: 'recorrente' }))} className="flex-1 rounded-full">
                🔄 Recorrente
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Input required value={cobrancaForm.descricao} onChange={e => setCobrancaForm(p => ({ ...p, descricao: e.target.value }))} placeholder="Ex: Mensalidade Março/2026" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor (R$) *</Label>
                <Input type="number" step="0.01" required value={cobrancaForm.valor} onChange={e => setCobrancaForm(p => ({ ...p, valor: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Vencimento</Label>
                <Input type="date" value={cobrancaForm.data_vencimento} onChange={e => setCobrancaForm(p => ({ ...p, data_vencimento: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Forma de Pagamento</Label>
                <Select value={cobrancaForm.forma_pagamento} onValueChange={v => setCobrancaForm(p => ({ ...p, forma_pagamento: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="boleto">Boleto</SelectItem>
                    <SelectItem value="cartao">Cartão</SelectItem>
                    <SelectItem value="transferencia">Transferência</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>E-mail pagador</Label>
                <Input type="email" value={cobrancaForm.email_pagador} onChange={e => setCobrancaForm(p => ({ ...p, email_pagador: e.target.value }))} placeholder="email@empresa.com" />
              </div>
            </div>

            {/* Card fields for recurring payments */}
            {cobrancaForm.tipo_cobranca === 'recorrente' && (
              <>
                <Separator />
                <div className="space-y-3">
                  <Label className="text-sm font-semibold flex items-center gap-2"><CreditCard className="h-4 w-4" /> Dados do Cartão (Recorrência)</Label>
                  <p className="text-xs text-muted-foreground">Estes dados serão enviados ao Mercado Pago para cobrança automática mensal.</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nome no Cartão *</Label>
                      <Input value={cobrancaForm.card_holder_name} onChange={e => setCobrancaForm(p => ({ ...p, card_holder_name: e.target.value }))} placeholder="NOME COMPLETO" />
                    </div>
                    <div className="space-y-2">
                      <Label>CPF do Titular *</Label>
                      <Input value={cobrancaForm.card_holder_cpf} onChange={e => setCobrancaForm(p => ({ ...p, card_holder_cpf: e.target.value }))} placeholder="000.000.000-00" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Número do Cartão</Label>
                      <Input value={cobrancaForm.card_number} onChange={e => setCobrancaForm(p => ({ ...p, card_number: e.target.value }))} placeholder="0000 0000 0000 0000" maxLength={19} />
                    </div>
                    <div className="space-y-2">
                      <Label>Validade</Label>
                      <Input value={cobrancaForm.card_expiry} onChange={e => setCobrancaForm(p => ({ ...p, card_expiry: e.target.value }))} placeholder="MM/AA" maxLength={5} />
                    </div>
                    <div className="space-y-2">
                      <Label>CVV</Label>
                      <Input type="password" value={cobrancaForm.card_cvv} onChange={e => setCobrancaForm(p => ({ ...p, card_cvv: e.target.value }))} placeholder="***" maxLength={4} />
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label>Observações</Label>
              <Input value={cobrancaForm.observacoes} onChange={e => setCobrancaForm(p => ({ ...p, observacoes: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <Button
                type="button"
                onClick={createMPPayment}
                disabled={!cobrancaForm.valor || !cobrancaForm.descricao || creatingMP}
                className="w-full rounded-full bg-accent hover:bg-accent/90 text-accent-foreground shadow-md hover:scale-105 hover:-translate-y-0.5 transition-all duration-200"
              >
                {creatingMP ? 'Criando...' : cobrancaForm.tipo_cobranca === 'recorrente' ? '🔄 Criar Assinatura Recorrente (MP)' : '💳 Cobrar via Mercado Pago'}
              </Button>
              <Button type="submit" variant="outline" disabled={addPagamentoManual.isPending}
                className="w-full rounded-full">
                {addPagamentoManual.isPending ? 'Salvando...' : 'Registrar Manual'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ═══ DIALOG: Novo Contrato ═══ */}
      <Dialog open={showContratoForm} onOpenChange={setShowContratoForm}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Novo Contrato</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); addContrato.mutate(); }} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do Contrato *</Label>
              <Input required value={contratoForm.nome} onChange={e => setContratoForm(p => ({ ...p, nome: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data Assinatura</Label>
                <Input type="date" value={contratoForm.data_assinatura} onChange={e => setContratoForm(p => ({ ...p, data_assinatura: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Validade</Label>
                <Input type="date" value={contratoForm.validade} onChange={e => setContratoForm(p => ({ ...p, validade: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={contratoForm.status} onValueChange={v => setContratoForm(p => ({ ...p, status: v }))}>
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
              <Button type="button" variant="outline" onClick={() => setShowContratoForm(false)} className="rounded-full">Cancelar</Button>
              <Button type="submit" disabled={addContrato.isPending} className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground">
                {addContrato.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FaturamentoTab;
