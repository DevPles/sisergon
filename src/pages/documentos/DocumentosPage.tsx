import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const TIPO_DOC_OPTIONS = [
  { value: 'AEP', label: 'AEP' }, { value: 'AET', label: 'AET' }, { value: 'ARP', label: 'ARP' },
  { value: 'ASO', label: 'ASO' }, { value: 'PCMSO', label: 'PCMSO' }, { value: 'PGR', label: 'PGR' },
  { value: 'LAUDO', label: 'Laudo' }, { value: 'OUTROS', label: 'Outros' },
];

const DocumentosPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [empresaFilter, setEmpresaFilter] = useState('all');
  const [showNew, setShowNew] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [form, setForm] = useState({ empresa_id: '', tipo_documento: '', titulo: '', data_emissao: '', validade: '', proximo_vencimento: '' });

  const { data: empresas = [] } = useQuery({ queryKey: ['empresas-docs'], queryFn: async () => { const { data } = await supabase.from('empresas').select('id, razao_social').eq('ativa', true).order('razao_social'); return data ?? []; } });
  const { data: documentos = [] } = useQuery({ queryKey: ['documentos', empresaFilter], queryFn: async () => { let q = supabase.from('documentos').select('*, empresas:empresa_id(razao_social)').order('created_at', { ascending: false }); if (empresaFilter !== 'all') q = q.eq('empresa_id', empresaFilter); const { data } = await q; return (data ?? []) as any[]; } });

  const create = useMutation({
    mutationFn: async () => { const { error } = await supabase.from('documentos').insert({ empresa_id: form.empresa_id, tipo_documento: form.tipo_documento, titulo: form.titulo, data_emissao: form.data_emissao || null, validade: form.validade || null, proximo_vencimento: form.proximo_vencimento || null } as any); if (error) throw error; },
    onSuccess: () => { toast({ title: 'Documento registrado' }); setShowNew(false); setForm({ empresa_id: '', tipo_documento: '', titulo: '', data_emissao: '', validade: '', proximo_vencimento: '' }); queryClient.invalidateQueries({ queryKey: ['documentos'] }); },
    onError: (err: Error) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  const update = useMutation({
    mutationFn: async () => {
      if (!editingItem) return;
      const { error } = await supabase.from('documentos').update({
        titulo: editingItem.titulo,
        tipo_documento: editingItem.tipo_documento,
        data_emissao: editingItem.data_emissao || null,
        validade: editingItem.validade || null,
        proximo_vencimento: editingItem.proximo_vencimento || null,
      }).eq('id', editingItem.id);
      if (error) throw error;
    },
    onSuccess: () => { toast({ title: 'Documento atualizado' }); setEditingItem(null); queryClient.invalidateQueries({ queryKey: ['documentos'] }); },
    onError: (err: Error) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('documentos').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { toast({ title: 'Documento removido' }); setSelected(null); queryClient.invalidateQueries({ queryKey: ['documentos'] }); },
  });

  const today = new Date();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div><h1 className="text-2xl font-bold">Documentos e Vencimentos</h1><p className="text-muted-foreground text-sm">Controle documental e versionamento</p></div>
        <div className="flex gap-2">
          <Select value={empresaFilter} onValueChange={setEmpresaFilter}><SelectTrigger className="w-48"><SelectValue placeholder="Todas" /></SelectTrigger><SelectContent><SelectItem value="all">Todas</SelectItem>{empresas.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.razao_social}</SelectItem>)}</SelectContent></Select>
          <Dialog open={showNew} onOpenChange={setShowNew}><DialogTrigger asChild><Button>Novo Documento</Button></DialogTrigger>
            <DialogContent><DialogHeader><DialogTitle>Registrar Documento</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Empresa</Label><Select value={form.empresa_id} onValueChange={v => setForm(p => ({ ...p, empresa_id: v }))}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{empresas.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.razao_social}</SelectItem>)}</SelectContent></Select></div>
                <div><Label>Tipo</Label><Select value={form.tipo_documento} onValueChange={v => setForm(p => ({ ...p, tipo_documento: v }))}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{TIPO_DOC_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select></div>
                <div><Label>Título</Label><Input value={form.titulo} onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))} /></div>
                <div className="grid grid-cols-3 gap-3">
                  <div><Label>Emissão</Label><Input type="date" value={form.data_emissao} onChange={e => setForm(p => ({ ...p, data_emissao: e.target.value }))} /></div>
                  <div><Label>Validade</Label><Input type="date" value={form.validade} onChange={e => setForm(p => ({ ...p, validade: e.target.value }))} /></div>
                  <div><Label>Próx. Venc.</Label><Input type="date" value={form.proximo_vencimento} onChange={e => setForm(p => ({ ...p, proximo_vencimento: e.target.value }))} /></div>
                </div>
                <Button className="w-full" onClick={() => create.mutate()} disabled={!form.empresa_id || !form.tipo_documento || !form.titulo}>Salvar</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <Card><CardContent className="p-0">
        <Table><TableHeader><TableRow><TableHead>Título</TableHead><TableHead>Tipo</TableHead><TableHead>Empresa</TableHead><TableHead>Emissão</TableHead><TableHead>Validade</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
          <TableBody>{documentos.map((d: any) => {
            const vencido = d.validade && new Date(d.validade) < today;
            return (<TableRow key={d.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelected(d)}><TableCell className="font-medium">{d.titulo}</TableCell><TableCell><Badge variant="outline">{d.tipo_documento}</Badge></TableCell><TableCell>{d.empresas?.razao_social || '—'}</TableCell><TableCell className="text-xs">{d.data_emissao || '—'}</TableCell><TableCell className="text-xs">{d.validade || '—'}</TableCell><TableCell>{vencido ? <Badge variant="destructive">Vencido</Badge> : <Badge variant="secondary">Vigente</Badge>}</TableCell></TableRow>);
          })}
            {documentos.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum documento registrado</TableCell></TableRow>}
          </TableBody></Table>
      </CardContent></Card>

      {/* View Modal */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Detalhes do Documento</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">Título:</span><p className="font-medium">{selected.titulo}</p></div>
                <div><span className="text-muted-foreground">Tipo:</span><p><Badge variant="outline">{selected.tipo_documento}</Badge></p></div>
                <div><span className="text-muted-foreground">Empresa:</span><p>{selected.empresas?.razao_social || '—'}</p></div>
                <div><span className="text-muted-foreground">Emissão:</span><p>{selected.data_emissao || '—'}</p></div>
                <div><span className="text-muted-foreground">Validade:</span><p>{selected.validade || '—'}</p></div>
                <div><span className="text-muted-foreground">Próx. Vencimento:</span><p>{selected.proximo_vencimento || '—'}</p></div>
                <div><span className="text-muted-foreground">Status:</span><p>{selected.validade && new Date(selected.validade) < today ? <Badge variant="destructive">Vencido</Badge> : <Badge variant="secondary">Vigente</Badge>}</p></div>
              </div>
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
          <DialogHeader><DialogTitle>Editar Documento</DialogTitle></DialogHeader>
          {editingItem && (
            <div className="space-y-4">
              <div><Label>Título</Label><Input value={editingItem.titulo} onChange={e => setEditingItem((p: any) => ({ ...p, titulo: e.target.value }))} /></div>
              <div><Label>Tipo</Label><Select value={editingItem.tipo_documento} onValueChange={v => setEditingItem((p: any) => ({ ...p, tipo_documento: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{TIPO_DOC_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select></div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Emissão</Label><Input type="date" value={editingItem.data_emissao || ''} onChange={e => setEditingItem((p: any) => ({ ...p, data_emissao: e.target.value }))} /></div>
                <div><Label>Validade</Label><Input type="date" value={editingItem.validade || ''} onChange={e => setEditingItem((p: any) => ({ ...p, validade: e.target.value }))} /></div>
                <div><Label>Próx. Venc.</Label><Input type="date" value={editingItem.proximo_vencimento || ''} onChange={e => setEditingItem((p: any) => ({ ...p, proximo_vencimento: e.target.value }))} /></div>
              </div>
              <Button className="w-full" onClick={() => update.mutate()}>Salvar Alterações</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
export default DocumentosPage;
