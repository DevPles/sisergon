import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import ColaboradorForm from './ColaboradorForm';

const ColaboradoresList = () => {
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: colaboradores, isLoading } = useQuery({
    queryKey: ['colaboradores', search],
    queryFn: async () => {
      let query = supabase.from('colaboradores').select(`*, empresas(razao_social), cargos(nome), setores(nome), unidades(nome)`).order('nome_completo');
      if (search) query = query.or(`nome_completo.ilike.%${search}%,cpf.ilike.%${search}%,matricula.ilike.%${search}%`);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('colaboradores').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['colaboradores'] });
      toast({ title: 'Colaborador removido' });
      setSelected(null);
    },
    onError: (err: Error) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  if (showForm || editingId) {
    return (
      <ColaboradorForm
        colaboradorId={editingId}
        onClose={() => { setShowForm(false); setEditingId(null); }}
        onSaved={() => {
          setShowForm(false);
          setEditingId(null);
          queryClient.invalidateQueries({ queryKey: ['colaboradores'] });
        }}
      />
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Colaboradores</h1>
          <p className="text-muted-foreground">Cadastro e monitoramento de colaboradores</p>
        </div>
        <Button onClick={() => setShowForm(true)}>Novo Colaborador</Button>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-4">
            <Input placeholder="Buscar por nome, CPF ou matrícula..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-md" />
            <span className="text-sm text-muted-foreground whitespace-nowrap">{colaboradores?.length ?? 0} registros</span>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead className="hidden sm:table-cell">Matrícula</TableHead>
                <TableHead className="hidden md:table-cell">Empresa</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : colaboradores?.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum colaborador cadastrado</TableCell></TableRow>
              ) : (
                colaboradores?.map((col) => (
                  <TableRow key={col.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelected(col)}>
                    <TableCell className="font-medium max-w-[140px] truncate">{col.nome_completo}</TableCell>
                    <TableCell className="hidden sm:table-cell">{col.matricula || '—'}</TableCell>
                    <TableCell className="hidden md:table-cell">{(col.empresas as any)?.razao_social || '—'}</TableCell>
                    <TableCell><Badge variant={col.status === 'ativo' ? 'default' : 'secondary'}>{col.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1 sm:gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button variant="outline" size="sm" onClick={() => setEditingId(col.id)}>Editar</Button>
                        <Button variant="outline" size="sm" onClick={() => deleteMutation.mutate(col.id)} className="text-destructive hover:text-destructive hidden sm:inline-flex">Excluir</Button>
                      </div>
                    </TableCell>
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
          <DialogHeader><DialogTitle>Detalhes do Colaborador</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">Nome:</span><p className="font-medium">{selected.nome_completo}</p></div>
                <div><span className="text-muted-foreground">CPF:</span><p>{selected.cpf || '—'}</p></div>
                <div><span className="text-muted-foreground">Matrícula:</span><p>{selected.matricula || '—'}</p></div>
                <div><span className="text-muted-foreground">Sexo:</span><p>{selected.sexo || '—'}</p></div>
                <div><span className="text-muted-foreground">Data Nascimento:</span><p>{selected.data_nascimento || '—'}</p></div>
                <div><span className="text-muted-foreground">Data Admissão:</span><p>{selected.data_admissao || '—'}</p></div>
                <div><span className="text-muted-foreground">Empresa:</span><p>{(selected.empresas as any)?.razao_social || '—'}</p></div>
                <div><span className="text-muted-foreground">Cargo:</span><p>{(selected.cargos as any)?.nome || '—'}</p></div>
                <div><span className="text-muted-foreground">Setor:</span><p>{(selected.setores as any)?.nome || '—'}</p></div>
                <div><span className="text-muted-foreground">Unidade:</span><p>{(selected.unidades as any)?.nome || '—'}</p></div>
                <div><span className="text-muted-foreground">Turno:</span><p>{selected.turno || '—'}</p></div>
                <div><span className="text-muted-foreground">Jornada:</span><p>{selected.jornada || '—'}</p></div>
                <div><span className="text-muted-foreground">Status:</span><p><Badge variant={selected.status === 'ativo' ? 'default' : 'secondary'}>{selected.status}</Badge></p></div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => { setSelected(null); setEditingId(selected.id); }}>Editar</Button>
                <Button variant="outline" size="sm" className="text-destructive" onClick={() => deleteMutation.mutate(selected.id)}>Excluir</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ColaboradoresList;
