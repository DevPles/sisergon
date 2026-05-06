import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

const TIPO_LABELS: Record<string, string> = {
  disc: 'DISC',
  psicossocial: 'Risco Psicossocial',
  aep: 'AEP',
  aet: 'AET',
  checklist: 'Checklist Mensal',
};

const RECORRENCIA_LABELS: Record<string, string> = {
  mensal: 'Mensal',
  trimestral: 'Trimestral',
  semestral: 'Semestral',
  anual: 'Anual',
  unico: 'Único',
};

const TestAssignmentsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  // Form state
  const [empresaId, setEmpresaId] = useState('');
  const [setorId, setSetorId] = useState('');
  const [colaboradorId, setColaboradorId] = useState('');
  const [tipoTeste, setTipoTeste] = useState('');
  const [recorrencia, setRecorrencia] = useState('mensal');
  const [diaLimite, setDiaLimite] = useState('15');
  const [scope, setScope] = useState<'empresa' | 'setor' | 'individual'>('individual');

  const { data: empresas } = useQuery({
    queryKey: ['empresas-select'],
    queryFn: async () => {
      const { data } = await supabase.from('empresas').select('id, razao_social').order('razao_social');
      return data || [];
    },
  });

  const { data: setores } = useQuery({
    queryKey: ['setores-select', empresaId],
    queryFn: async () => {
      if (!empresaId) return [];
      const { data } = await supabase.from('setores').select('id, nome').eq('empresa_id', empresaId).order('nome');
      return data || [];
    },
    enabled: !!empresaId,
  });

  const { data: colaboradores } = useQuery({
    queryKey: ['colaboradores-select', empresaId, setorId],
    queryFn: async () => {
      if (!empresaId) return [];
      let q = supabase.from('colaboradores').select('id, nome_completo').eq('empresa_id', empresaId).eq('status', 'ativo');
      if (setorId) q = q.eq('setor_id', setorId);
      const { data } = await q.order('nome_completo');
      return data || [];
    },
    enabled: !!empresaId,
  });

  const { data: assignments, isLoading } = useQuery({
    queryKey: ['test-assignments'],
    queryFn: async () => {
      const { data } = await supabase
        .from('test_assignments')
        .select('*, empresas(razao_social), colaboradores(nome_completo)')
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!empresaId || !tipoTeste) throw new Error('Preencha empresa e tipo de teste');

      const base = {
        empresa_id: empresaId,
        tipo_teste: tipoTeste,
        recorrencia,
        dia_limite: Number(diaLimite),
        created_by: user?.id,
      };

      if (scope === 'empresa') {
        // One assignment for the whole company
        const { error } = await supabase.from('test_assignments').insert({ ...base });
        if (error) throw error;
      } else if (scope === 'setor') {
        if (!setorId) throw new Error('Selecione o setor');
        const { error } = await supabase.from('test_assignments').insert({ ...base, setor_id: setorId });
        if (error) throw error;
      } else {
        if (!colaboradorId) throw new Error('Selecione o colaborador');
        const { error } = await supabase.from('test_assignments').insert({ ...base, colaborador_id: colaboradorId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: 'Atribuição criada com sucesso' });
      queryClient.invalidateQueries({ queryKey: ['test-assignments'] });
      setOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase.from('test_assignments').update({ ativo }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['test-assignments'] }),
  });

  const resetForm = () => {
    setEmpresaId('');
    setSetorId('');
    setColaboradorId('');
    setTipoTeste('');
    setRecorrencia('mensal');
    setDiaLimite('15');
    setScope('individual');
  };

  const getScopeLabel = (a: any) => {
    if (a.colaborador_id) return (a.colaboradores as any)?.nome_completo || 'Individual';
    if (a.setor_id) return 'Setor';
    return 'Empresa inteira';
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Atribuição de Testes</h1>
          <p className="text-muted-foreground">Defina quais testes cada funcionário deve realizar</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => navigate('/checklists')}>Voltar</Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>Nova Atribuição</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Nova Atribuição de Teste</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Empresa *</Label>
                  <Select value={empresaId} onValueChange={setEmpresaId}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{empresas?.map(e => <SelectItem key={e.id} value={e.id}>{e.razao_social}</SelectItem>)}</SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Escopo</Label>
                  <Select value={scope} onValueChange={(v) => setScope(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="empresa">Empresa inteira</SelectItem>
                      <SelectItem value="setor">Por setor</SelectItem>
                      <SelectItem value="individual">Individual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {scope !== 'empresa' && (
                  <div className="space-y-2">
                    <Label>Setor</Label>
                    <Select value={setorId} onValueChange={setSetorId}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>{setores?.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}

                {scope === 'individual' && (
                  <div className="space-y-2">
                    <Label>Colaborador *</Label>
                    <Select value={colaboradorId} onValueChange={setColaboradorId}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>{colaboradores?.map(c => <SelectItem key={c.id} value={c.id}>{c.nome_completo}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Tipo de Teste *</Label>
                  <Select value={tipoTeste} onValueChange={setTipoTeste}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(TIPO_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Recorrência</Label>
                    <Select value={recorrencia} onValueChange={setRecorrencia}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(RECORRENCIA_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Dia limite</Label>
                    <Input type="number" min={1} max={28} value={diaLimite} onChange={e => setDiaLimite(e.target.value)} />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                  <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
                    {createMutation.isPending ? 'Salvando...' : 'Criar Atribuição'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead>Escopo</TableHead>
                <TableHead>Teste</TableHead>
                <TableHead>Recorrência</TableHead>
                <TableHead>Dia Limite</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : !assignments?.length ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhuma atribuição cadastrada</TableCell></TableRow>
              ) : (
                assignments.map((a: any) => (
                  <TableRow key={a.id}>
                    <TableCell>{(a.empresas as any)?.razao_social || '—'}</TableCell>
                    <TableCell>{getScopeLabel(a)}</TableCell>
                    <TableCell><Badge variant="outline">{TIPO_LABELS[a.tipo_teste] || a.tipo_teste}</Badge></TableCell>
                    <TableCell>{RECORRENCIA_LABELS[a.recorrencia] || a.recorrencia}</TableCell>
                    <TableCell>Dia {a.dia_limite}</TableCell>
                    <TableCell>
                      <Badge variant={a.ativo ? 'default' : 'secondary'}>
                        {a.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => toggleMutation.mutate({ id: a.id, ativo: !a.ativo })}>
                        {a.ativo ? 'Desativar' : 'Ativar'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default TestAssignmentsPage;