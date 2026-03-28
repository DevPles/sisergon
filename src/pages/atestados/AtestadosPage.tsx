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

const AtestadosPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [empresaFilter, setEmpresaFilter] = useState('all');
  const [showNew, setShowNew] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [form, setForm] = useState({ empresa_id: '', colaborador_id: '', cid: '', dias: '1', data_inicio: '', data_fim: '', tipo: 'nao_ocupacional', observacoes: '' });

  const { data: empresas = [] } = useQuery({ queryKey: ['empresas-atestados'], queryFn: async () => { const { data } = await supabase.from('empresas').select('id, razao_social').eq('ativa', true).order('razao_social'); return data ?? []; } });
  const { data: colaboradores = [] } = useQuery({ queryKey: ['colaboradores-atestados', form.empresa_id || editingItem?.empresa_id], queryFn: async () => { const eid = form.empresa_id || editingItem?.empresa_id; if (!eid) return []; const { data } = await supabase.from('colaboradores').select('id, nome_completo').eq('empresa_id', eid).eq('status', 'ativo'); return data ?? []; }, enabled: !!(form.empresa_id || editingItem?.empresa_id) });
  const { data: atestados = [] } = useQuery({ queryKey: ['atestados', empresaFilter], queryFn: async () => { let q = supabase.from('atestados').select('*, colaboradores:colaborador_id(nome_completo), empresas:empresa_id(razao_social)').order('created_at', { ascending: false }); if (empresaFilter !== 'all') q = q.eq('empresa_id', empresaFilter); const { data } = await q; return (data ?? []) as any[]; } });

  const create = useMutation({
    mutationFn: async () => { const { error } = await supabase.from('atestados').insert({ empresa_id: form.empresa_id, colaborador_id: form.colaborador_id, cid: form.cid || null, dias: parseInt(form.dias) || 1, data_inicio: form.data_inicio || null, data_fim: form.data_fim || null, tipo: form.tipo, observacoes: form.observacoes || null } as any); if (error) throw error; },
    onSuccess: () => { toast({ title: 'Atestado registrado' }); setShowNew(false); setForm({ empresa_id: '', colaborador_id: '', cid: '', dias: '1', data_inicio: '', data_fim: '', tipo: 'nao_ocupacional', observacoes: '' }); queryClient.invalidateQueries({ queryKey: ['atestados'] }); },
    onError: (err: Error) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  const update = useMutation({
    mutationFn: async () => {
      if (!editingItem) return;
      const { error } = await supabase.from('atestados').update({
        cid: editingItem.cid || null,
        dias: parseInt(editingItem.dias) || 1,
        data_inicio: editingItem.data_inicio || null,
        data_fim: editingItem.data_fim || null,
        tipo: editingItem.tipo,
        observacoes: editingItem.observacoes || null,
      }).eq('id', editingItem.id);
      if (error) throw error;
    },
    onSuccess: () => { toast({ title: 'Atestado atualizado' }); setEditingItem(null); queryClient.invalidateQueries({ queryKey: ['atestados'] }); },
    onError: (err: Error) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('atestados').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { toast({ title: 'Atestado removido' }); setSelected(null); queryClient.invalidateQueries({ queryKey: ['atestados'] }); },
  });

  const openEdit = (item: any) => {
    setSelected(null);
    setEditingItem({ ...item, dias: String(item.dias || 1) });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div><h1 className="text-2xl font-bold">Atestados e Absenteísmo</h1><p className="text-muted-foreground text-sm">Registro e acompanhamento de afastamentos</p></div>
        <div className="flex gap-2">
          <Select value={empresaFilter} onValueChange={setEmpresaFilter}><SelectTrigger className="w-48"><SelectValue placeholder="Todas" /></SelectTrigger><SelectContent><SelectItem value="all">Todas</SelectItem>{empresas.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.razao_social}</SelectItem>)}</SelectContent></Select>
          <Dialog open={showNew} onOpenChange={setShowNew}><DialogTrigger asChild><Button>Novo Atestado</Button></DialogTrigger>
            <DialogContent><DialogHeader><DialogTitle>Registrar Atestado</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Empresa</Label><Select value={form.empresa_id} onValueChange={v => setForm(p => ({ ...p, empresa_id: v, colaborador_id: '' }))}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{empresas.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.razao_social}</SelectItem>)}</SelectContent></Select></div>
                <div><Label>Colaborador</Label><Select value={form.colaborador_id} onValueChange={v => setForm(p => ({ ...p, colaborador_id: v }))}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{colaboradores.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nome_completo}</SelectItem>)}</SelectContent></Select></div>
                <div className="grid grid-cols-2 gap-4"><div><Label>CID</Label><Input value={form.cid} onChange={e => setForm(p => ({ ...p, cid: e.target.value }))} /></div><div><Label>Dias</Label><Input type="number" value={form.dias} onChange={e => setForm(p => ({ ...p, dias: e.target.value }))} /></div></div>
                <div className="grid grid-cols-2 gap-4"><div><Label>Início</Label><Input type="date" value={form.data_inicio} onChange={e => setForm(p => ({ ...p, data_inicio: e.target.value }))} /></div><div><Label>Fim</Label><Input type="date" value={form.data_fim} onChange={e => setForm(p => ({ ...p, data_fim: e.target.value }))} /></div></div>
                <div><Label>Tipo</Label><Select value={form.tipo} onValueChange={v => setForm(p => ({ ...p, tipo: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ocupacional">Ocupacional</SelectItem><SelectItem value="nao_ocupacional">Não Ocupacional</SelectItem></SelectContent></Select></div>
                <div><Label>Observações</Label><Textarea value={form.observacoes} onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))} /></div>
                <Button className="w-full" onClick={() => create.mutate()} disabled={!form.empresa_id || !form.colaborador_id}>Salvar</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <Card><CardContent className="p-0">
        <Table><TableHeader><TableRow><TableHead>Colaborador</TableHead><TableHead>Empresa</TableHead><TableHead>CID</TableHead><TableHead>Dias</TableHead><TableHead>Período</TableHead><TableHead>Tipo</TableHead></TableRow></TableHeader>
          <TableBody>{atestados.map((a: any) => (<TableRow key={a.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelected(a)}><TableCell>{a.colaboradores?.nome_completo || '—'}</TableCell><TableCell>{a.empresas?.razao_social || '—'}</TableCell><TableCell>{a.cid || '—'}</TableCell><TableCell>{a.dias}</TableCell><TableCell className="text-xs">{a.data_inicio || '—'} → {a.data_fim || '—'}</TableCell><TableCell><Badge variant="outline">{a.tipo === 'ocupacional' ? 'Ocupacional' : 'Não Ocup.'}</Badge></TableCell></TableRow>))}
            {atestados.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum atestado registrado</TableCell></TableRow>}
          </TableBody></Table>
      </CardContent></Card>

      {/* View Modal */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Detalhes do Atestado</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">Colaborador:</span><p className="font-medium">{selected.colaboradores?.nome_completo || '—'}</p></div>
                <div><span className="text-muted-foreground">Empresa:</span><p className="font-medium">{selected.empresas?.razao_social || '—'}</p></div>
                <div><span className="text-muted-foreground">CID:</span><p>{selected.cid || '—'}</p></div>
                <div><span className="text-muted-foreground">Dias:</span><p>{selected.dias}</p></div>
                <div><span className="text-muted-foreground">Início:</span><p>{selected.data_inicio || '—'}</p></div>
                <div><span className="text-muted-foreground">Fim:</span><p>{selected.data_fim || '—'}</p></div>
                <div><span className="text-muted-foreground">Tipo:</span><p><Badge variant="outline">{selected.tipo === 'ocupacional' ? 'Ocupacional' : 'Não Ocupacional'}</Badge></p></div>
              </div>
              {selected.observacoes && <div><span className="text-muted-foreground">Observações:</span><p className="mt-1">{selected.observacoes}</p></div>}
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
              <div className="grid grid-cols-2 gap-4"><div><Label>CID</Label><Input value={editingItem.cid || ''} onChange={e => setEditingItem((p: any) => ({ ...p, cid: e.target.value }))} /></div><div><Label>Dias</Label><Input type="number" value={editingItem.dias} onChange={e => setEditingItem((p: any) => ({ ...p, dias: e.target.value }))} /></div></div>
              <div className="grid grid-cols-2 gap-4"><div><Label>Início</Label><Input type="date" value={editingItem.data_inicio || ''} onChange={e => setEditingItem((p: any) => ({ ...p, data_inicio: e.target.value }))} /></div><div><Label>Fim</Label><Input type="date" value={editingItem.data_fim || ''} onChange={e => setEditingItem((p: any) => ({ ...p, data_fim: e.target.value }))} /></div></div>
              <div><Label>Tipo</Label><Select value={editingItem.tipo} onValueChange={v => setEditingItem((p: any) => ({ ...p, tipo: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ocupacional">Ocupacional</SelectItem><SelectItem value="nao_ocupacional">Não Ocupacional</SelectItem></SelectContent></Select></div>
              <div><Label>Observações</Label><Textarea value={editingItem.observacoes || ''} onChange={e => setEditingItem((p: any) => ({ ...p, observacoes: e.target.value }))} /></div>
              <Button className="w-full" onClick={() => update.mutate()}>Salvar Alterações</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
export default AtestadosPage;
