import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Props { empresas: any[]; eventos: any[]; empresaFilter: string; }

const tipoLabels: Record<string, string> = {
  admissional: 'Admissional', periodico: 'Periódico', retorno: 'Retorno ao Trabalho',
  mudanca_risco: 'Mudança de Função', demissional: 'Demissional',
};

const PCMSOEventos = ({ empresas, eventos, empresaFilter }: Props) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [form, setForm] = useState({ empresa_id: '', colaborador_id: '', tipo: 'periodico', data_prevista: '', data_realizada: '', resultado: '', observacoes: '' });

  const { data: colaboradores = [] } = useQuery({
    queryKey: ['colaboradores-pcmso', form.empresa_id || editingItem?.empresa_id],
    queryFn: async () => {
      const eid = form.empresa_id || editingItem?.empresa_id;
      if (!eid) return [];
      const { data } = await supabase.from('colaboradores').select('id, nome_completo').eq('empresa_id', eid).eq('status', 'ativo');
      return data ?? [];
    },
    enabled: !!(form.empresa_id || editingItem?.empresa_id),
  });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('pcmso_eventos').insert({
        empresa_id: form.empresa_id, colaborador_id: form.colaborador_id || null, tipo: form.tipo,
        data_prevista: form.data_prevista || null, data_realizada: form.data_realizada || null,
        resultado: form.resultado || null, observacoes: form.observacoes || null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => { toast({ title: 'Evento criado' }); setShowNew(false); queryClient.invalidateQueries({ queryKey: ['pcmso-eventos'] }); },
    onError: (err: Error) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  const update = useMutation({
    mutationFn: async () => {
      if (!editingItem) return;
      const { error } = await supabase.from('pcmso_eventos').update({
        tipo: editingItem.tipo, data_prevista: editingItem.data_prevista || null,
        data_realizada: editingItem.data_realizada || null, resultado: editingItem.resultado || null,
        observacoes: editingItem.observacoes || null,
      }).eq('id', editingItem.id);
      if (error) throw error;
    },
    onSuccess: () => { toast({ title: 'Evento atualizado' }); setEditingItem(null); queryClient.invalidateQueries({ queryKey: ['pcmso-eventos'] }); },
    onError: (err: Error) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('pcmso_eventos').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { toast({ title: 'Evento removido' }); setSelected(null); queryClient.invalidateQueries({ queryKey: ['pcmso-eventos'] }); },
  });

  const today = new Date();

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold">Exames e Eventos</h3>
          <Dialog open={showNew} onOpenChange={setShowNew}>
            <DialogTrigger asChild><Button size="sm">Novo Evento</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novo Evento PCMSO</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Empresa</Label><Select value={form.empresa_id} onValueChange={v => setForm(p => ({ ...p, empresa_id: v, colaborador_id: '' }))}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{empresas.map(e => <SelectItem key={e.id} value={e.id}>{e.razao_social}</SelectItem>)}</SelectContent></Select></div>
                <div><Label>Colaborador</Label><Select value={form.colaborador_id} onValueChange={v => setForm(p => ({ ...p, colaborador_id: v }))}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{colaboradores.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nome_completo}</SelectItem>)}</SelectContent></Select></div>
                <div><Label>Tipo</Label><Select value={form.tipo} onValueChange={v => setForm(p => ({ ...p, tipo: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(tipoLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Data Prevista</Label><Input type="date" value={form.data_prevista} onChange={e => setForm(p => ({ ...p, data_prevista: e.target.value }))} /></div>
                  <div><Label>Data Realizada</Label><Input type="date" value={form.data_realizada} onChange={e => setForm(p => ({ ...p, data_realizada: e.target.value }))} /></div>
                </div>
                <div><Label>Resultado</Label><Select value={form.resultado} onValueChange={v => setForm(p => ({ ...p, resultado: v }))}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent><SelectItem value="apto">Apto</SelectItem><SelectItem value="inapto">Inapto</SelectItem><SelectItem value="apto_restricao">Apto c/ Restrição</SelectItem></SelectContent></Select></div>
                <div><Label>Observações</Label><Textarea value={form.observacoes} onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))} /></div>
                <Button className="w-full" onClick={() => create.mutate()} disabled={!form.empresa_id}>Salvar</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>Colaborador</TableHead><TableHead>Tipo</TableHead><TableHead>Previsto</TableHead><TableHead>Realizado</TableHead><TableHead>Resultado</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
          <TableBody>
            {eventos.map((ev: any) => {
              const isVencido = !ev.data_realizada && ev.data_prevista && new Date(ev.data_prevista) < today;
              return (
                <TableRow key={ev.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelected(ev)}>
                  <TableCell>{ev.colaboradores?.nome_completo || '—'}</TableCell>
                  <TableCell>{tipoLabels[ev.tipo] || ev.tipo}</TableCell>
                  <TableCell>{ev.data_prevista || '—'}</TableCell>
                  <TableCell>{ev.data_realizada || '—'}</TableCell>
                  <TableCell>{ev.resultado || '—'}</TableCell>
                  <TableCell>
                    {ev.data_realizada ? <Badge className="bg-green-100 text-green-700">Realizado</Badge>
                      : isVencido ? <Badge variant="destructive">Vencido</Badge>
                      : <Badge variant="secondary">Pendente</Badge>}
                  </TableCell>
                </TableRow>
              );
            })}
            {eventos.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Nenhum evento cadastrado</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>

      {/* View Modal */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Detalhes do Evento PCMSO</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">Colaborador:</span><p className="font-medium">{selected.colaboradores?.nome_completo || '—'}</p></div>
                <div><span className="text-muted-foreground">Tipo:</span><p>{tipoLabels[selected.tipo] || selected.tipo}</p></div>
                <div><span className="text-muted-foreground">Data Prevista:</span><p>{selected.data_prevista || '—'}</p></div>
                <div><span className="text-muted-foreground">Data Realizada:</span><p>{selected.data_realizada || '—'}</p></div>
                <div><span className="text-muted-foreground">Resultado:</span><p>{selected.resultado || '—'}</p></div>
                <div><span className="text-muted-foreground">Status:</span><p>{selected.data_realizada ? <Badge className="bg-green-100 text-green-700">Realizado</Badge> : <Badge variant="secondary">Pendente</Badge>}</p></div>
              </div>
              {selected.observacoes && <div><span className="text-muted-foreground">Observações:</span><p className="mt-1">{selected.observacoes}</p></div>}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => { setSelected(null); setEditingItem({ ...selected }); }}>Editar</Button>
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteMutation.mutate(selected.id)}>Excluir</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Evento PCMSO</DialogTitle></DialogHeader>
          {editingItem && (
            <div className="space-y-4">
              <div><Label>Tipo</Label><Select value={editingItem.tipo} onValueChange={v => setEditingItem((p: any) => ({ ...p, tipo: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(tipoLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Data Prevista</Label><Input type="date" value={editingItem.data_prevista || ''} onChange={e => setEditingItem((p: any) => ({ ...p, data_prevista: e.target.value }))} /></div>
                <div><Label>Data Realizada</Label><Input type="date" value={editingItem.data_realizada || ''} onChange={e => setEditingItem((p: any) => ({ ...p, data_realizada: e.target.value }))} /></div>
              </div>
              <div><Label>Resultado</Label><Select value={editingItem.resultado || ''} onValueChange={v => setEditingItem((p: any) => ({ ...p, resultado: v }))}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent><SelectItem value="apto">Apto</SelectItem><SelectItem value="inapto">Inapto</SelectItem><SelectItem value="apto_restricao">Apto c/ Restrição</SelectItem></SelectContent></Select></div>
              <div><Label>Observações</Label><Textarea value={editingItem.observacoes || ''} onChange={e => setEditingItem((p: any) => ({ ...p, observacoes: e.target.value }))} /></div>
              <Button className="w-full" onClick={() => update.mutate()}>Salvar Alterações</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default PCMSOEventos;
