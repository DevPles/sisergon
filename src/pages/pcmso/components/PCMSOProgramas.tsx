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
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Props { empresas: any[]; programas: any[]; eventos?: any[]; }

const PCMSOProgramas = ({ empresas, programas }: Props) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [form, setForm] = useState({ empresa_id: '', responsavel_medico: '', crm: '', data_inicio: '', data_fim: '', observacoes: '', status: 'ativo' });

  const resetForm = () => setForm({ empresa_id: '', responsavel_medico: '', crm: '', data_inicio: '', data_fim: '', observacoes: '', status: 'ativo' });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('pcmso_programas').insert({
        empresa_id: form.empresa_id, titulo: `PCMSO ${new Date().getFullYear()}`,
        responsavel_medico: form.responsavel_medico, crm: form.crm,
        vigencia_inicio: form.data_inicio || null, vigencia_fim: form.data_fim || null,
        descricao: form.observacoes || null, status: form.status,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => { toast({ title: 'Programa criado' }); resetForm(); setShowNew(false); queryClient.invalidateQueries({ queryKey: ['pcmso-programas'] }); },
    onError: (err: Error) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  const update = useMutation({
    mutationFn: async () => {
      if (!editingItem) return;
      const { error } = await supabase.from('pcmso_programas').update({
        responsavel_medico: editingItem.responsavel_medico || null,
        crm: editingItem.crm || null,
        vigencia_inicio: editingItem.vigencia_inicio || null,
        vigencia_fim: editingItem.vigencia_fim || null,
        descricao: editingItem.descricao || null,
        status: editingItem.status,
      }).eq('id', editingItem.id);
      if (error) throw error;
    },
    onSuccess: () => { toast({ title: 'Programa atualizado' }); setEditingItem(null); queryClient.invalidateQueries({ queryKey: ['pcmso-programas'] }); },
    onError: (err: Error) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('pcmso_programas').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { toast({ title: 'Programa removido' }); setSelected(null); queryClient.invalidateQueries({ queryKey: ['pcmso-programas'] }); },
  });

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold">Programas PCMSO</h3>
          <Dialog open={showNew} onOpenChange={setShowNew}>
            <DialogTrigger asChild><Button size="sm">Novo Programa</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novo Programa PCMSO</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Empresa</Label><Select value={form.empresa_id} onValueChange={v => setForm(p => ({ ...p, empresa_id: v }))}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{empresas.map(e => <SelectItem key={e.id} value={e.id}>{e.razao_social}</SelectItem>)}</SelectContent></Select></div>
                <div><Label>Médico Responsável</Label><Input value={form.responsavel_medico} onChange={e => setForm(p => ({ ...p, responsavel_medico: e.target.value }))} /></div>
                <div><Label>CRM</Label><Input value={form.crm} onChange={e => setForm(p => ({ ...p, crm: e.target.value }))} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Início Vigência</Label><Input type="date" value={form.data_inicio} onChange={e => setForm(p => ({ ...p, data_inicio: e.target.value }))} /></div>
                  <div><Label>Fim Vigência</Label><Input type="date" value={form.data_fim} onChange={e => setForm(p => ({ ...p, data_fim: e.target.value }))} /></div>
                </div>
                <div><Label>Observações</Label><Textarea value={form.observacoes} onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))} /></div>
                <Button className="w-full" onClick={() => create.mutate()} disabled={!form.empresa_id}>Salvar</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>Empresa</TableHead><TableHead>Médico</TableHead><TableHead>CRM</TableHead><TableHead>Vigência</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
          <TableBody>
            {programas.map((p: any) => (
              <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelected(p)}>
                <TableCell>{(p as any).empresas?.razao_social || '—'}</TableCell>
                <TableCell>{p.responsavel_medico || '—'}</TableCell>
                <TableCell>{p.crm || '—'}</TableCell>
                <TableCell className="text-xs">{p.vigencia_inicio || '—'} → {p.vigencia_fim || '—'}</TableCell>
                <TableCell><Badge variant={p.status === 'ativo' ? 'default' : 'secondary'}>{p.status}</Badge></TableCell>
              </TableRow>
            ))}
            {programas.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Nenhum programa cadastrado</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>

      {/* View Modal */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Detalhes do Programa PCMSO</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">Empresa:</span><p className="font-medium">{(selected as any).empresas?.razao_social || '—'}</p></div>
                <div><span className="text-muted-foreground">Título:</span><p>{selected.titulo}</p></div>
                <div><span className="text-muted-foreground">Médico:</span><p>{selected.responsavel_medico || '—'}</p></div>
                <div><span className="text-muted-foreground">CRM:</span><p>{selected.crm || '—'}</p></div>
                <div><span className="text-muted-foreground">Início Vigência:</span><p>{selected.vigencia_inicio || '—'}</p></div>
                <div><span className="text-muted-foreground">Fim Vigência:</span><p>{selected.vigencia_fim || '—'}</p></div>
                <div><span className="text-muted-foreground">Status:</span><p><Badge variant={selected.status === 'ativo' ? 'default' : 'secondary'}>{selected.status}</Badge></p></div>
              </div>
              {selected.descricao && <div><span className="text-muted-foreground">Descrição:</span><p className="mt-1">{selected.descricao}</p></div>}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => { setSelected(null); setEditingItem({ ...selected }); }}>Editar</Button>
                <Button variant="outline" size="sm" className="text-destructive" onClick={() => deleteMutation.mutate(selected.id)}>Excluir</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Programa PCMSO</DialogTitle></DialogHeader>
          {editingItem && (
            <div className="space-y-4">
              <div><Label>Médico Responsável</Label><Input value={editingItem.responsavel_medico || ''} onChange={e => setEditingItem((p: any) => ({ ...p, responsavel_medico: e.target.value }))} /></div>
              <div><Label>CRM</Label><Input value={editingItem.crm || ''} onChange={e => setEditingItem((p: any) => ({ ...p, crm: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Início Vigência</Label><Input type="date" value={editingItem.vigencia_inicio || ''} onChange={e => setEditingItem((p: any) => ({ ...p, vigencia_inicio: e.target.value }))} /></div>
                <div><Label>Fim Vigência</Label><Input type="date" value={editingItem.vigencia_fim || ''} onChange={e => setEditingItem((p: any) => ({ ...p, vigencia_fim: e.target.value }))} /></div>
              </div>
              <div><Label>Status</Label><Select value={editingItem.status} onValueChange={v => setEditingItem((p: any) => ({ ...p, status: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ativo">Ativo</SelectItem><SelectItem value="inativo">Inativo</SelectItem></SelectContent></Select></div>
              <div><Label>Descrição</Label><Textarea value={editingItem.descricao || ''} onChange={e => setEditingItem((p: any) => ({ ...p, descricao: e.target.value }))} /></div>
              <Button className="w-full" onClick={() => update.mutate()}>Salvar Alterações</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default PCMSOProgramas;
