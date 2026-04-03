import { useState, useMemo, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, Upload, FileText, Eye, Download, Clock, User } from 'lucide-react';

/* ─── Labor law alert logic ─── */
const CID_ALERT_DAYS_THRESHOLD = 15;
const CID_ALERT_WINDOW_DAYS = 60;

interface CidAlert {
  colaborador_id: string;
  colaborador_nome: string;
  empresa_nome: string;
  cid: string;
  total_dias: number;
  atestados: any[];
}

function computeCidAlerts(atestados: any[]): CidAlert[] {
  const grouped: Record<string, any[]> = {};
  for (const a of atestados) {
    if (!a.cid || !a.colaborador_id) continue;
    const key = `${a.colaborador_id}::${a.cid.toUpperCase().trim()}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(a);
  }
  const alerts: CidAlert[] = [];
  for (const [, group] of Object.entries(grouped)) {
    const sorted = group.sort((a: any, b: any) => new Date(a.data_inicio).getTime() - new Date(b.data_inicio).getTime());
    for (let i = 0; i < sorted.length; i++) {
      const windowStart = new Date(sorted[i].data_inicio);
      const windowEnd = new Date(windowStart);
      windowEnd.setDate(windowEnd.getDate() + CID_ALERT_WINDOW_DAYS);
      let totalDias = 0;
      const windowAtestados: any[] = [];
      for (let j = i; j < sorted.length; j++) {
        const start = new Date(sorted[j].data_inicio);
        if (start > windowEnd) break;
        totalDias += sorted[j].dias || 0;
        windowAtestados.push(sorted[j]);
      }
      if (totalDias >= CID_ALERT_DAYS_THRESHOLD) {
        if (!alerts.find(a => a.colaborador_id === sorted[0].colaborador_id && a.cid === sorted[0].cid?.toUpperCase().trim())) {
          alerts.push({
            colaborador_id: sorted[0].colaborador_id,
            colaborador_nome: sorted[0].colaboradores?.nome_completo || '—',
            empresa_nome: sorted[0].empresas?.razao_social || '—',
            cid: sorted[0].cid?.toUpperCase().trim(),
            total_dias: totalDias,
            atestados: windowAtestados,
          });
        }
        break;
      }
    }
  }
  return alerts;
}

/** Auto-calc data_fim = data_inicio + dias - 1 */
function calcEndDate(startDate: string, dias: string): string {
  if (!startDate || !dias) return '';
  const d = parseInt(dias);
  if (isNaN(d) || d < 1) return '';
  const date = new Date(startDate + 'T00:00:00');
  date.setDate(date.getDate() + d - 1);
  return date.toISOString().split('T')[0];
}

const AtestadosPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [empresaFilter, setEmpresaFilter] = useState('all');
  const [showNew, setShowNew] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [timelineColaborador, setTimelineColaborador] = useState<{ id: string; nome: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    empresa_id: '', colaborador_id: '', cid: '', dias: '1',
    data_inicio: '', data_fim: '', tipo: 'nao_ocupacional', observacoes: '',
    file: null as File | null,
  });

  // Auto-calc data_fim on create form
  useEffect(() => {
    if (form.data_inicio && form.dias) {
      const end = calcEndDate(form.data_inicio, form.dias);
      if (end && end !== form.data_fim) {
        setForm(p => ({ ...p, data_fim: end }));
      }
    }
  }, [form.data_inicio, form.dias]);

  // Auto-calc data_fim on edit form
  useEffect(() => {
    if (editingItem?.data_inicio && editingItem?.dias) {
      const end = calcEndDate(editingItem.data_inicio, editingItem.dias);
      if (end && end !== editingItem.data_fim) {
        setEditingItem((p: any) => p ? ({ ...p, data_fim: end }) : p);
      }
    }
  }, [editingItem?.data_inicio, editingItem?.dias]);

  const { data: empresas = [] } = useQuery({
    queryKey: ['empresas-atestados'],
    queryFn: async () => {
      const { data } = await supabase.from('empresas').select('id, razao_social').eq('ativa', true).order('razao_social');
      return data ?? [];
    },
  });

  const { data: colaboradores = [] } = useQuery({
    queryKey: ['colaboradores-atestados', form.empresa_id || editingItem?.empresa_id],
    queryFn: async () => {
      const eid = form.empresa_id || editingItem?.empresa_id;
      if (!eid) return [];
      const { data } = await supabase.from('colaboradores').select('id, nome_completo').eq('empresa_id', eid).eq('status', 'ativo');
      return data ?? [];
    },
    enabled: !!(form.empresa_id || editingItem?.empresa_id),
  });

  // Colaboradores for timeline tab (based on empresa filter)
  const { data: filteredColaboradores = [] } = useQuery({
    queryKey: ['colaboradores-timeline', empresaFilter],
    queryFn: async () => {
      if (empresaFilter === 'all') return [];
      const { data } = await supabase.from('colaboradores').select('id, nome_completo').eq('empresa_id', empresaFilter).eq('status', 'ativo').order('nome_completo');
      return data ?? [];
    },
    enabled: empresaFilter !== 'all',
  });

  const { data: atestados = [] } = useQuery({
    queryKey: ['atestados', empresaFilter],
    queryFn: async () => {
      let q = supabase
        .from('atestados')
        .select('*, colaboradores:colaborador_id(nome_completo), empresas:empresa_id(razao_social)')
        .order('data_inicio', { ascending: false });
      if (empresaFilter !== 'all') q = q.eq('empresa_id', empresaFilter);
      const { data } = await q;
      return (data ?? []) as any[];
    },
  });

  const cidAlerts = useMemo(() => computeCidAlerts(atestados), [atestados]);

  // Timeline for a specific colaborador
  const colaboradorTimeline = useMemo(() => {
    if (!timelineColaborador) return [];
    return atestados
      .filter(a => a.colaborador_id === timelineColaborador.id)
      .sort((a, b) => new Date(b.data_inicio || b.created_at).getTime() - new Date(a.data_inicio || a.created_at).getTime());
  }, [atestados, timelineColaborador]);

  // Count atestados per colaborador
  const atestadosPerColaborador = useMemo(() => {
    const map: Record<string, number> = {};
    for (const a of atestados) {
      if (a.colaborador_id) {
        map[a.colaborador_id] = (map[a.colaborador_id] || 0) + 1;
      }
    }
    return map;
  }, [atestados]);

  const totalDiasPerColaborador = useMemo(() => {
    const map: Record<string, number> = {};
    for (const a of atestados) {
      if (a.colaborador_id) {
        map[a.colaborador_id] = (map[a.colaborador_id] || 0) + (a.dias || 0);
      }
    }
    return map;
  }, [atestados]);

  const uploadFile = async (file: File, atestadoId: string): Promise<string | null> => {
    const ext = file.name.split('.').pop();
    const path = `${atestadoId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('atestados').upload(path, file);
    if (error) { toast({ title: 'Erro no upload', description: error.message, variant: 'destructive' }); return null; }
    return path;
  };

  const getFileUrl = async (path: string) => {
    const { data } = await supabase.storage.from('atestados').createSignedUrl(path, 3600);
    return data?.signedUrl ?? null;
  };

  const create = useMutation({
    mutationFn: async () => {
      setUploadingFile(true);
      const { data, error } = await supabase.from('atestados').insert({
        empresa_id: form.empresa_id, colaborador_id: form.colaborador_id,
        cid: form.cid || null, dias: parseInt(form.dias) || 1,
        data_inicio: form.data_inicio || null, data_fim: form.data_fim || null,
        tipo: form.tipo, observacoes: form.observacoes || null,
      } as any).select('id').single();
      if (error) throw error;
      if (form.file && data?.id) {
        const path = await uploadFile(form.file, data.id);
        if (path) await supabase.from('atestados').update({ arquivo_url: path } as any).eq('id', data.id);
      }
    },
    onSuccess: () => {
      setUploadingFile(false);
      toast({ title: 'Atestado registrado' });
      setShowNew(false);
      setForm({ empresa_id: '', colaborador_id: '', cid: '', dias: '1', data_inicio: '', data_fim: '', tipo: 'nao_ocupacional', observacoes: '', file: null });
      if (fileInputRef.current) fileInputRef.current.value = '';
      queryClient.invalidateQueries({ queryKey: ['atestados'] });
    },
    onError: (err: Error) => { setUploadingFile(false); toast({ title: 'Erro', description: err.message, variant: 'destructive' }); },
  });

  const update = useMutation({
    mutationFn: async () => {
      if (!editingItem) return;
      setUploadingFile(true);
      const updateData: any = {
        cid: editingItem.cid || null, dias: parseInt(editingItem.dias) || 1,
        data_inicio: editingItem.data_inicio || null, data_fim: editingItem.data_fim || null,
        tipo: editingItem.tipo, observacoes: editingItem.observacoes || null,
      };
      if (editingItem.newFile) {
        const path = await uploadFile(editingItem.newFile, editingItem.id);
        if (path) updateData.arquivo_url = path;
      }
      const { error } = await supabase.from('atestados').update(updateData).eq('id', editingItem.id);
      if (error) throw error;
    },
    onSuccess: () => { setUploadingFile(false); toast({ title: 'Atestado atualizado' }); setEditingItem(null); queryClient.invalidateQueries({ queryKey: ['atestados'] }); },
    onError: (err: Error) => { setUploadingFile(false); toast({ title: 'Erro', description: err.message, variant: 'destructive' }); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('atestados').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { toast({ title: 'Atestado removido' }); setSelected(null); queryClient.invalidateQueries({ queryKey: ['atestados'] }); },
  });

  const openEdit = (item: any) => { setSelected(null); setEditingItem({ ...item, dias: String(item.dias || 1), newFile: null }); };

  const viewFile = async (path: string) => {
    const url = await getFileUrl(path);
    if (url) window.open(url, '_blank');
    else toast({ title: 'Erro', description: 'Não foi possível abrir o arquivo', variant: 'destructive' });
  };

  const downloadFile = async (path: string) => {
    const url = await getFileUrl(path);
    if (url) { const a = document.createElement('a'); a.href = url; a.download = path.split('/').pop() || 'atestado'; a.click(); }
  };

  const formatMonth = (key: string) => {
    const [y, m] = key.split('-');
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${months[parseInt(m) - 1]} ${y}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Atestados e Absenteísmo</h1>
          <p className="text-muted-foreground text-sm">Registro e acompanhamento de afastamentos</p>
        </div>
        <div className="flex gap-2">
          <Select value={empresaFilter} onValueChange={setEmpresaFilter}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Todas" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {empresas.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.razao_social}</SelectItem>)}
            </SelectContent>
          </Select>
          <Dialog open={showNew} onOpenChange={setShowNew}>
            <DialogTrigger asChild><Button>Novo Atestado</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Registrar Atestado</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Empresa</Label>
                  <Select value={form.empresa_id} onValueChange={v => setForm(p => ({ ...p, empresa_id: v, colaborador_id: '' }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{empresas.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.razao_social}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Colaborador</Label>
                  <Select value={form.colaborador_id} onValueChange={v => setForm(p => ({ ...p, colaborador_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{colaboradores.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nome_completo}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>CID</Label><Input value={form.cid} onChange={e => setForm(p => ({ ...p, cid: e.target.value }))} /></div>
                  <div><Label>Dias</Label><Input type="number" value={form.dias} onChange={e => setForm(p => ({ ...p, dias: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Início</Label><Input type="date" value={form.data_inicio} onChange={e => setForm(p => ({ ...p, data_inicio: e.target.value }))} /></div>
                  <div><Label>Fim (auto)</Label><Input type="date" value={form.data_fim} readOnly className="bg-muted/50" /></div>
                </div>
                <div>
                  <Label>Tipo</Label>
                  <Select value={form.tipo} onValueChange={v => setForm(p => ({ ...p, tipo: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ocupacional">Ocupacional</SelectItem>
                      <SelectItem value="nao_ocupacional">Não Ocupacional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Arquivo do Atestado</Label>
                  <div className="mt-1">
                    <label className="flex items-center gap-2 cursor-pointer border border-dashed border-muted-foreground/30 rounded-lg p-3 hover:bg-muted/50 transition-colors">
                      <Upload className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {form.file ? form.file.name : 'Clique para anexar arquivo (PDF, imagem)'}
                      </span>
                      <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden"
                        onChange={e => { const f = e.target.files?.[0] || null; setForm(p => ({ ...p, file: f })); }} />
                    </label>
                    {form.file && (
                      <button type="button" className="text-xs text-destructive mt-1 hover:underline"
                        onClick={() => { setForm(p => ({ ...p, file: null })); if (fileInputRef.current) fileInputRef.current.value = ''; }}>
                        Remover arquivo
                      </button>
                    )}
                  </div>
                </div>
                <div><Label>Observações</Label><Textarea value={form.observacoes} onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))} /></div>
                <Button className="w-full" onClick={() => create.mutate()} disabled={!form.empresa_id || !form.colaborador_id || uploadingFile}>
                  {uploadingFile ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* CID Alerts Banner */}
      {cidAlerts.length > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-destructive text-base">
              <AlertTriangle className="h-5 w-5" />
              Alertas de Afastamento — Encaminhamento ao INSS
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Art. 75 do Decreto 3.048/99: colaboradores com 15+ dias de afastamento pelo mesmo CID em 60 dias devem ser encaminhados ao INSS.
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {cidAlerts.map((alert, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-background rounded-lg border border-destructive/20">
                <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="font-medium">{alert.colaborador_nome} <span className="text-muted-foreground font-normal">({alert.empresa_nome})</span></p>
                  <p className="text-muted-foreground">CID <span className="font-mono font-semibold text-foreground">{alert.cid}</span> — {alert.total_dias} dias acumulados</p>
                  <p className="text-destructive text-xs mt-1 font-medium">⚠ Requer encaminhamento ao INSS</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="lista">
        <TabsList>
          <TabsTrigger value="lista">Cadastrados</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="alertas" className="relative">
            Alertas
            {cidAlerts.length > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold rounded-full bg-destructive text-destructive-foreground">
                {cidAlerts.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Tab: Lista */}
        <TabsContent value="lista">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>CID</TableHead>
                    <TableHead>Dias</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Arquivo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {atestados.map((a: any) => (
                    <TableRow key={a.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelected(a)}>
                      <TableCell>{a.colaboradores?.nome_completo || '—'}</TableCell>
                      <TableCell>{a.empresas?.razao_social || '—'}</TableCell>
                      <TableCell className="font-mono">{a.cid || '—'}</TableCell>
                      <TableCell>{a.dias}</TableCell>
                      <TableCell className="text-xs">{a.data_inicio || '—'} → {a.data_fim || '—'}</TableCell>
                      <TableCell><Badge variant="outline">{a.tipo === 'ocupacional' ? 'Ocupacional' : 'Não Ocup.'}</Badge></TableCell>
                      <TableCell onClick={e => e.stopPropagation()}>
                        {a.arquivo_url ? (
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => viewFile(a.arquivo_url)} title="Visualizar"><Eye className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => downloadFile(a.arquivo_url)} title="Baixar"><Download className="h-3.5 w-3.5" /></Button>
                          </div>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                    </TableRow>
                  ))}
                  {atestados.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum atestado registrado</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Timeline — per colaborador */}
        <TabsContent value="timeline">
          {empresaFilter === 'all' ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">Selecione uma empresa acima para ver a timeline por funcionário</CardContent></Card>
          ) : filteredColaboradores.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">Nenhum colaborador encontrado nesta empresa</CardContent></Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredColaboradores.map((c: any) => {
                const count = atestadosPerColaborador[c.id] || 0;
                const totalDias = totalDiasPerColaborador[c.id] || 0;
                const hasAlert = cidAlerts.some(a => a.colaborador_id === c.id);
                return (
                  <Card
                    key={c.id}
                    className={`cursor-pointer hover:shadow-md transition-shadow ${hasAlert ? 'border-destructive/40' : ''}`}
                    onClick={() => setTimelineColaborador({ id: c.id, nome: c.nome_completo })}
                  >
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{c.nome_completo}</p>
                        <p className="text-xs text-muted-foreground">
                          {count} atestado(s) · {totalDias} dia(s)
                        </p>
                      </div>
                      {hasAlert && <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Tab: Alertas */}
        <TabsContent value="alertas">
          {cidAlerts.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">Nenhum alerta de CID identificado</CardContent></Card>
          ) : (
            <div className="space-y-4">
              <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
                <CardContent className="p-4">
                  <h3 className="font-semibold text-sm mb-1 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    Regra Trabalhista
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Conforme o <strong>Art. 75 do Decreto 3.048/99</strong> e <strong>Art. 59 da Lei 8.213/91</strong>,
                    quando um colaborador acumula <strong>15 ou mais dias</strong> de afastamento pelo <strong>mesmo CID</strong> dentro
                    de <strong>60 dias</strong>, deve ser encaminhado ao INSS para perícia médica e possível auxílio-doença (B31/B91).
                  </p>
                </CardContent>
              </Card>
              {cidAlerts.map((alert, i) => (
                <Card key={i} className="border-destructive/30">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold">{alert.colaborador_nome}</p>
                        <p className="text-sm text-muted-foreground">{alert.empresa_nome}</p>
                      </div>
                      <Badge variant="destructive">Ação necessária</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div><span className="text-muted-foreground text-xs">CID</span><p className="font-mono font-semibold">{alert.cid}</p></div>
                      <div><span className="text-muted-foreground text-xs">Total de dias</span><p className="font-semibold text-destructive">{alert.total_dias} dias</p></div>
                      <div><span className="text-muted-foreground text-xs">Atestados</span><p className="font-semibold">{alert.atestados.length}</p></div>
                    </div>
                    <div className="border-t pt-2">
                      <p className="text-xs text-muted-foreground mb-2">Atestados relacionados:</p>
                      {alert.atestados.map((a: any, j: number) => (
                        <div key={j} className="flex justify-between text-xs py-1 border-b last:border-b-0 border-muted">
                          <span>{a.data_inicio || '—'} → {a.data_fim || '—'}</span>
                          <span className="font-medium">{a.dias} dia(s)</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Timeline Modal per Colaborador */}
      <Dialog open={!!timelineColaborador} onOpenChange={open => !open && setTimelineColaborador(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Timeline — {timelineColaborador?.nome}
            </DialogTitle>
          </DialogHeader>
          {colaboradorTimeline.length === 0 ? (
            <p className="text-center text-muted-foreground py-6 text-sm">Nenhum atestado registrado para este colaborador</p>
          ) : (
            <div className="relative pl-6 border-l-2 border-muted space-y-4 py-2">
              {colaboradorTimeline.map((a: any) => {
                const d = a.data_inicio ? new Date(a.data_inicio) : new Date(a.created_at);
                const monthLabel = formatMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
                return (
                  <div key={a.id} className="relative">
                    <div className="absolute -left-[25px] top-2 w-3 h-3 rounded-full bg-primary border-2 border-background" />
                    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setTimelineColaborador(null); setSelected(a); }}>
                      <CardContent className="p-3 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">{monthLabel}</span>
                          <Badge variant="outline" className="text-xs">{a.dias} dia(s)</Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span>{a.data_inicio || '—'} → {a.data_fim || '—'}</span>
                          {a.cid && <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">CID: {a.cid}</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={a.tipo === 'ocupacional' ? 'default' : 'secondary'} className="text-[10px]">
                            {a.tipo === 'ocupacional' ? 'Ocupacional' : 'Não Ocup.'}
                          </Badge>
                          {a.arquivo_url && <FileText className="h-3.5 w-3.5 text-primary" />}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* View Modal */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Detalhes do Atestado</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">Colaborador:</span><p className="font-medium">{selected.colaboradores?.nome_completo || '—'}</p></div>
                <div><span className="text-muted-foreground">Empresa:</span><p className="font-medium">{selected.empresas?.razao_social || '—'}</p></div>
                <div><span className="text-muted-foreground">CID:</span><p className="font-mono">{selected.cid || '—'}</p></div>
                <div><span className="text-muted-foreground">Dias:</span><p>{selected.dias}</p></div>
                <div><span className="text-muted-foreground">Início:</span><p>{selected.data_inicio || '—'}</p></div>
                <div><span className="text-muted-foreground">Fim:</span><p>{selected.data_fim || '—'}</p></div>
                <div><span className="text-muted-foreground">Tipo:</span><p><Badge variant="outline">{selected.tipo === 'ocupacional' ? 'Ocupacional' : 'Não Ocupacional'}</Badge></p></div>
              </div>
              {selected.observacoes && <div><span className="text-muted-foreground">Observações:</span><p className="mt-1">{selected.observacoes}</p></div>}
              {selected.arquivo_url ? (
                <div className="border rounded-lg p-3 bg-muted/30">
                  <p className="text-xs text-muted-foreground mb-2">Arquivo anexado</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="gap-1" onClick={() => viewFile(selected.arquivo_url)}><Eye className="h-3.5 w-3.5" /> Visualizar</Button>
                    <Button variant="outline" size="sm" className="gap-1" onClick={() => downloadFile(selected.arquivo_url)}><Download className="h-3.5 w-3.5" /> Baixar</Button>
                  </div>
                </div>
              ) : <p className="text-xs text-muted-foreground italic">Nenhum arquivo anexado</p>}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => openEdit(selected)}>Editar</Button>
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteMutation.mutate(selected.id)}>Excluir</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Atestado</DialogTitle></DialogHeader>
          {editingItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>CID</Label><Input value={editingItem.cid || ''} onChange={e => setEditingItem((p: any) => ({ ...p, cid: e.target.value }))} /></div>
                <div><Label>Dias</Label><Input type="number" value={editingItem.dias} onChange={e => setEditingItem((p: any) => ({ ...p, dias: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Início</Label><Input type="date" value={editingItem.data_inicio || ''} onChange={e => setEditingItem((p: any) => ({ ...p, data_inicio: e.target.value }))} /></div>
                <div><Label>Fim (auto)</Label><Input type="date" value={editingItem.data_fim || ''} readOnly className="bg-muted/50" /></div>
              </div>
              <div>
                <Label>Tipo</Label>
                <Select value={editingItem.tipo} onValueChange={v => setEditingItem((p: any) => ({ ...p, tipo: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ocupacional">Ocupacional</SelectItem>
                    <SelectItem value="nao_ocupacional">Não Ocupacional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Arquivo do Atestado</Label>
                {editingItem.arquivo_url && !editingItem.newFile && (
                  <div className="flex items-center gap-2 mt-1 mb-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="text-xs text-muted-foreground">Arquivo já anexado</span>
                    <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={() => viewFile(editingItem.arquivo_url)}><Eye className="h-3 w-3" /> Ver</Button>
                  </div>
                )}
                <label className="flex items-center gap-2 cursor-pointer border border-dashed border-muted-foreground/30 rounded-lg p-3 hover:bg-muted/50 transition-colors">
                  <Upload className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{editingItem.newFile ? editingItem.newFile.name : 'Substituir / anexar novo arquivo'}</span>
                  <input ref={editFileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden"
                    onChange={e => { const f = e.target.files?.[0] || null; setEditingItem((p: any) => ({ ...p, newFile: f })); }} />
                </label>
                {editingItem.newFile && (
                  <button type="button" className="text-xs text-destructive mt-1 hover:underline"
                    onClick={() => { setEditingItem((p: any) => ({ ...p, newFile: null })); if (editFileInputRef.current) editFileInputRef.current.value = ''; }}>
                    Remover novo arquivo
                  </button>
                )}
              </div>
              <div><Label>Observações</Label><Textarea value={editingItem.observacoes || ''} onChange={e => setEditingItem((p: any) => ({ ...p, observacoes: e.target.value }))} /></div>
              <Button className="w-full" onClick={() => update.mutate()} disabled={uploadingFile}>
                {uploadingFile ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AtestadosPage;
