import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';

const ConsultoresTab = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);

  // Get all users with consultor role
  const { data: consultores, isLoading } = useQuery({
    queryKey: ['config-consultores', search],
    queryFn: async () => {
      const { data: roles } = await supabase.from('user_roles').select('user_id').eq('role', 'consultor');
      if (!roles?.length) return [];
      const userIds = roles.map(r => r.user_id);
      let query = supabase.from('profiles').select('*').in('id', userIds);
      if (search) query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
      const { data } = await query;
      return data ?? [];
    },
  });

  // Get consultor_empresas links
  const { data: links } = useQuery({
    queryKey: ['consultor-empresas-links'],
    queryFn: async () => {
      const { data } = await supabase.from('consultor_empresas').select('*, empresas(razao_social)');
      return data ?? [];
    },
  });

  // Stats per consultor
  const { data: stats } = useQuery({
    queryKey: ['consultor-stats'],
    queryFn: async () => {
      const { data: assessments } = await supabase.from('assessments').select('evaluator_id, id, status');
      const map: Record<string, { avaliacoes: number; laudos: number }> = {};
      assessments?.forEach(a => {
        if (!a.evaluator_id) return;
        if (!map[a.evaluator_id]) map[a.evaluator_id] = { avaliacoes: 0, laudos: 0 };
        map[a.evaluator_id].avaliacoes++;
        if (a.status === 'finalizado') map[a.evaluator_id].laudos++;
      });
      return map;
    },
  });

  const { data: empresas } = useQuery({
    queryKey: ['empresas-select'],
    queryFn: async () => {
      const { data } = await supabase.from('empresas').select('id, razao_social').order('razao_social');
      return data ?? [];
    },
  });

  if (showForm) {
    return <VincularConsultorForm consultores={consultores ?? []} empresas={empresas ?? []} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); queryClient.invalidateQueries({ queryKey: ['consultor-empresas-links'] }); }} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Input placeholder="Buscar consultor..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
        <span className="text-sm text-muted-foreground whitespace-nowrap">{consultores?.length ?? 0} consultores</span>
        <Button onClick={() => setShowForm(true)} className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_4px_14px_0_hsl(var(--primary)/0.4)] ml-auto whitespace-nowrap">
          Vincular a Empresa
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>E-mail</TableHead>
            <TableHead>Empresas Vinculadas</TableHead>
            <TableHead>Avaliações</TableHead>
            <TableHead>Laudos Emitidos</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
          ) : consultores?.length === 0 ? (
            <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum consultor</TableCell></TableRow>
          ) : consultores?.map((c: any) => {
            const cLinks = links?.filter((l: any) => l.user_id === c.id) ?? [];
            const cStats = stats?.[c.id] ?? { avaliacoes: 0, laudos: 0 };
            return (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.full_name || '—'}</TableCell>
                <TableCell>{c.email || '—'}</TableCell>
                <TableCell>
                  {cLinks.length === 0 ? '—' : cLinks.map((l: any) => (
                    <Badge key={l.id} variant="outline" className="mr-1">{(l as any).empresas?.razao_social}</Badge>
                  ))}
                </TableCell>
                <TableCell>{cStats.avaliacoes}</TableCell>
                <TableCell>{cStats.laudos}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

const VincularConsultorForm = ({ consultores, empresas, onClose, onSaved }: { consultores: any[]; empresas: any[]; onClose: () => void; onSaved: () => void }) => {
  const { toast } = useToast();
  const [userId, setUserId] = useState('');
  const [empresaId, setEmpresaId] = useState('');
  const [nivel, setNivel] = useState('padrao');

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('consultor_empresas').insert({ user_id: userId, empresa_id: empresaId, nivel_atuacao: nivel });
      if (error) throw error;
    },
    onSuccess: () => { toast({ title: 'Consultor vinculado à empresa' }); onSaved(); },
    onError: (err: Error) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        <h2 className="text-lg font-semibold">Vincular Consultor a Empresa</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Consultor *</Label>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{consultores.map((c) => <SelectItem key={c.id} value={c.id}>{c.full_name || c.email}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Empresa *</Label>
            <Select value={empresaId} onValueChange={setEmpresaId}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{empresas.map((e) => <SelectItem key={e.id} value={e.id}>{e.razao_social}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Nível de Atuação</Label>
            <Select value={nivel} onValueChange={setNivel}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="padrao">Padrão</SelectItem>
                <SelectItem value="senior">Sênior</SelectItem>
                <SelectItem value="especialista">Especialista</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Separator />
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose} className="rounded-full">Cancelar</Button>
          <Button onClick={() => mutation.mutate()} disabled={!userId || !empresaId || mutation.isPending} className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground">
            {mutation.isPending ? 'Vinculando...' : 'Vincular'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ConsultoresTab;
