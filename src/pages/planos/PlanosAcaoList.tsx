import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

const statusLabel: Record<string, string> = { pendente: 'Pendente', em_andamento: 'Em andamento', concluido: 'Concluído', vencido: 'Vencido' };
const statusVariant = (s: string) => {
  if (s === 'concluido') return 'default' as const;
  if (s === 'vencido') return 'destructive' as const;
  return 'secondary' as const;
};

const PlanosAcaoList = () => {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: plans, isLoading } = useQuery({
    queryKey: ['action-plans', search],
    queryFn: async () => {
      let query = supabase.from('action_plans').select('*, empresas(razao_social)').order('created_at', { ascending: false });
      if (search) query = query.ilike('action', `%${search}%`);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('action_plans').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['action-plans'] });
      toast({ title: 'Plano removido' });
      setSelected(null);
    },
  });

  const update = useMutation({
    mutationFn: async () => {
      if (!editingItem) return;
      const { error } = await supabase.from('action_plans').update({
        action: editingItem.action,
        priority: editingItem.priority,
        responsible: editingItem.responsible || null,
        due_date: editingItem.due_date || null,
        status: editingItem.status,
        origin: editingItem.origin || null,
      }).eq('id', editingItem.id);
      if (error) throw error;
    },
    onSuccess: () => { toast({ title: 'Plano atualizado' }); setEditingItem(null); queryClient.invalidateQueries({ queryKey: ['action-plans'] }); },
    onError: (err: Error) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Planos de Ação</h1>
          <p className="text-muted-foreground">Gestão de ações corretivas e preventivas</p>
        </div>
        <div className="flex items-center gap-3">
          <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-[220px]" />
          <span className="text-sm text-muted-foreground whitespace-nowrap">{plans?.length ?? 0} registros</span>
          <Button onClick={() => navigate('/planos-acao/novo')}>Novo Plano</Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ação</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Prazo</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : plans?.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum plano de ação cadastrado</TableCell></TableRow>
              ) : (
                plans?.map((p) => (
                  <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelected(p)}>
                    <TableCell className="font-medium max-w-xs truncate">{p.action}</TableCell>
                    <TableCell>{(p.empresas as any)?.razao_social || '—'}</TableCell>
                    <TableCell><Badge variant="outline">{p.priority}</Badge></TableCell>
                    <TableCell>{p.responsible || '—'}</TableCell>
                    <TableCell>{p.due_date ? format(new Date(p.due_date), 'dd/MM/yyyy') : '—'}</TableCell>
                    <TableCell><Badge variant={statusVariant(p.status)}>{statusLabel[p.status] || p.status}</Badge></TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* View Modal */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Detalhes do Plano de Ação</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <div><span className="text-muted-foreground">Ação:</span><p className="font-medium">{selected.action}</p></div>
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">Empresa:</span><p>{(selected.empresas as any)?.razao_social || '—'}</p></div>
                <div><span className="text-muted-foreground">Prioridade:</span><p><Badge variant="outline">{selected.priority}</Badge></p></div>
                <div><span className="text-muted-foreground">Responsável:</span><p>{selected.responsible || '—'}</p></div>
                <div><span className="text-muted-foreground">Prazo:</span><p>{selected.due_date ? format(new Date(selected.due_date), 'dd/MM/yyyy') : '—'}</p></div>
                <div><span className="text-muted-foreground">Status:</span><p><Badge variant={statusVariant(selected.status)}>{statusLabel[selected.status] || selected.status}</Badge></p></div>
                <div><span className="text-muted-foreground">Origem:</span><p>{selected.origin || '—'}</p></div>
                <div><span className="text-muted-foreground">Criado em:</span><p>{format(new Date(selected.created_at), 'dd/MM/yyyy')}</p></div>
                {selected.completed_at && <div><span className="text-muted-foreground">Concluído em:</span><p>{format(new Date(selected.completed_at), 'dd/MM/yyyy')}</p></div>}
              </div>
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
          <DialogHeader><DialogTitle>Editar Plano de Ação</DialogTitle></DialogHeader>
          {editingItem && (
            <div className="space-y-4">
              <div><Label>Ação</Label><Textarea value={editingItem.action} onChange={e => setEditingItem((p: any) => ({ ...p, action: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Prioridade</Label><Select value={editingItem.priority || ''} onValueChange={v => setEditingItem((p: any) => ({ ...p, priority: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="baixa">Baixa</SelectItem><SelectItem value="media">Média</SelectItem><SelectItem value="alta">Alta</SelectItem><SelectItem value="critica">Crítica</SelectItem></SelectContent></Select></div>
                <div><Label>Status</Label><Select value={editingItem.status} onValueChange={v => setEditingItem((p: any) => ({ ...p, status: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pendente">Pendente</SelectItem><SelectItem value="em_andamento">Em andamento</SelectItem><SelectItem value="concluido">Concluído</SelectItem></SelectContent></Select></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Responsável</Label><Input value={editingItem.responsible || ''} onChange={e => setEditingItem((p: any) => ({ ...p, responsible: e.target.value }))} /></div>
                <div><Label>Prazo</Label><Input type="date" value={editingItem.due_date || ''} onChange={e => setEditingItem((p: any) => ({ ...p, due_date: e.target.value }))} /></div>
              </div>
              <div><Label>Origem</Label><Input value={editingItem.origin || ''} onChange={e => setEditingItem((p: any) => ({ ...p, origin: e.target.value }))} /></div>
              <Button className="w-full" onClick={() => update.mutate()}>Salvar Alterações</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PlanosAcaoList;
