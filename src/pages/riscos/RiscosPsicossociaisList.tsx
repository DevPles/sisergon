import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import ARPFormFields from './components/ARPFormFields';

const RiscosPsicossociaisList = () => {
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | undefined>(undefined);
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: assessments, isLoading } = useQuery({
    queryKey: ['arp-list', search],
    queryFn: async () => {
      let query = supabase.from('assessments').select('*, empresas(razao_social)').eq('type', 'arp').order('created_at', { ascending: false });
      if (search) query = query.ilike('title', `%${search}%`);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('assessments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['arp-list'] });
      toast({ title: 'Avaliação removida' });
    },
  });

  const openNew = () => {
    setEditId(undefined);
    setModalOpen(true);
  };

  const openEdit = (id: string) => {
    setEditId(id);
    setModalOpen(true);
  };

  const handleSaved = () => {
    setModalOpen(false);
    setEditId(undefined);
    queryClient.invalidateQueries({ queryKey: ['arp-list'] });
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Riscos Psicossociais</h1>
          <p className="text-muted-foreground">Avaliação de fatores psicossociais e organizacionais — ARP</p>
        </div>
        <div className="flex items-center gap-3">
          <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-[220px]" />
          <span className="text-sm text-muted-foreground whitespace-nowrap">{assessments?.length ?? 0} registros</span>
          <Button variant="outline" onClick={() => navigate('/riscos-psicossociais/likert')}>Questionário Likert</Button>
          <Button onClick={openNew}>Nova Avaliação</Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Risco</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : assessments?.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhuma avaliação cadastrada</TableCell></TableRow>
              ) : (
                assessments?.map((a) => (
                  <TableRow key={a.id} className="cursor-pointer" onClick={() => openEdit(a.id)}>
                    <TableCell className="font-medium">{a.title || 'Sem título'}</TableCell>
                    <TableCell>{(a.empresas as any)?.razao_social || '—'}</TableCell>
                    <TableCell className="font-mono">{Number(a.score_total).toFixed(1)}</TableCell>
                    <TableCell><Badge variant={a.risk_classification === 'baixo' ? 'secondary' : a.risk_classification === 'moderado' ? 'default' : 'destructive'}>{a.risk_classification || '—'}</Badge></TableCell>
                    <TableCell><Badge variant={a.status === 'finalizado' ? 'default' : 'secondary'}>{a.status}</Badge></TableCell>
                    <TableCell>{format(new Date(a.created_at), 'dd/MM/yyyy')}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(a.id)}>Editar</Button>
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteMutation.mutate(a.id)}>Excluir</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal with full ARP form */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-6">
          <DialogHeader>
            <DialogTitle>{editId ? 'Editar Avaliação Psicossocial' : 'Nova Avaliação Psicossocial'}</DialogTitle>
          </DialogHeader>
          {modalOpen && (
            <ARPFormFields
              assessmentId={editId}
              onSaved={handleSaved}
              onCancel={() => setModalOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RiscosPsicossociaisList;
