import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Props { eventos: any[]; }

const PCMSOHistorico = ({ eventos }: Props) => {
  const [colaboradorFilter, setColaboradorFilter] = useState('all');
  const [selected, setSelected] = useState<any | null>(null);
  const [editing, setEditing] = useState<any | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const colaboradores = [...new Map(eventos.map(e => [e.colaborador_id, { id: e.colaborador_id, nome: e.colaboradores?.nome_completo }])).values()].filter(c => c.nome);
  const filtered = colaboradorFilter === 'all' ? eventos : eventos.filter(e => e.colaborador_id === colaboradorFilter);
  const sorted = [...filtered].sort((a, b) => new Date(b.data_prevista || b.created_at).getTime() - new Date(a.data_prevista || a.created_at).getTime());

  const tipoLabels: Record<string, string> = {
    admissional: 'Admissional', periodico: 'Periódico', retorno: 'Retorno ao Trabalho',
    mudanca_risco: 'Mudança de Função', demissional: 'Demissional', exame: 'Exame',
  };

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const { id, ...rest } = data;
      const { error } = await supabase.from('pcmso_eventos').update(rest).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pcmso-eventos'] });
      toast({ title: 'Registro atualizado com sucesso' });
      setSelected(null);
      setEditing(null);
    },
    onError: (err: Error) => toast({ title: 'Erro ao atualizar', description: err.message, variant: 'destructive' }),
  });

  const openModal = (ev: any) => {
    setSelected(ev);
    setEditing({
      id: ev.id,
      tipo: ev.tipo || '',
      data_prevista: ev.data_prevista || '',
      data_realizada: ev.data_realizada || '',
      resultado: ev.resultado || '',
      aptidao: ev.aptidao || '',
      observacoes: ev.observacoes || '',
      status: ev.status || '',
    });
  };

  const statusLabel = (ev: any) => {
    if (ev.data_realizada) return 'Realizado';
    if (ev.data_prevista && new Date(ev.data_prevista) < new Date()) return 'Vencido';
    return 'Pendente';
  };

  const statusVariant = (ev: any): 'default' | 'secondary' | 'destructive' | 'outline' => {
    if (ev.data_realizada) return 'default';
    if (ev.data_prevista && new Date(ev.data_prevista) < new Date()) return 'destructive';
    return 'secondary';
  };

  return (
    <>
      <Card>
        <CardContent className="p-0">
          <div className="flex justify-between items-center p-4">
            <Select value={colaboradorFilter} onValueChange={setColaboradorFilter}>
              <SelectTrigger className="w-64"><SelectValue placeholder="Todos os colaboradores" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os colaboradores</SelectItem>
                {colaboradores.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">{sorted.length} registros</span>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Colaborador</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Data Prevista</TableHead>
                <TableHead>Data Realizada</TableHead>
                <TableHead>Resultado</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum registro encontrado.</TableCell></TableRow>
              ) : sorted.map(ev => (
                <TableRow key={ev.id} className="cursor-pointer" onClick={() => openModal(ev)}>
                  <TableCell className="font-medium">{ev.colaboradores?.nome_completo || '—'}</TableCell>
                  <TableCell>{ev.empresas?.razao_social || '—'}</TableCell>
                  <TableCell>{tipoLabels[ev.tipo] || ev.tipo}</TableCell>
                  <TableCell>{ev.data_prevista || '—'}</TableCell>
                  <TableCell>{ev.data_realizada || '—'}</TableCell>
                  <TableCell>{ev.resultado === 'apto_restricao' ? 'Apto c/ Restrição' : ev.resultado || '—'}</TableCell>
                  <TableCell><Badge variant={statusVariant(ev)}>{statusLabel(ev)}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(o) => { if (!o) { setSelected(null); setEditing(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Registro — {selected?.colaboradores?.nome_completo}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tipo</Label>
                  <Select value={editing.tipo} onValueChange={v => setEditing({ ...editing, tipo: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(tipoLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={editing.status} onValueChange={v => setEditing({ ...editing, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="agendado">Agendado</SelectItem>
                      <SelectItem value="realizado">Realizado</SelectItem>
                      <SelectItem value="cancelado">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Data Prevista</Label><Input type="date" value={editing.data_prevista} onChange={e => setEditing({ ...editing, data_prevista: e.target.value })} /></div>
                <div><Label>Data Realizada</Label><Input type="date" value={editing.data_realizada} onChange={e => setEditing({ ...editing, data_realizada: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Resultado</Label><Input value={editing.resultado} onChange={e => setEditing({ ...editing, resultado: e.target.value })} placeholder="apto, inapto..." /></div>
                <div><Label>Aptidão</Label><Input value={editing.aptidao} onChange={e => setEditing({ ...editing, aptidao: e.target.value })} placeholder="apto, inapto..." /></div>
              </div>
              <div><Label>Observações</Label><Textarea value={editing.observacoes} onChange={e => setEditing({ ...editing, observacoes: e.target.value })} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setSelected(null); setEditing(null); }}>Cancelar</Button>
            <Button onClick={() => editing && updateMutation.mutate(editing)}>Salvar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PCMSOHistorico;
