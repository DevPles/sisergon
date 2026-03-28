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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { X, Eye, Plus } from 'lucide-react';

const ConsultoresTab = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [detailConsultor, setDetailConsultor] = useState<any>(null);

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

  const { data: links } = useQuery({
    queryKey: ['consultor-empresas-links'],
    queryFn: async () => {
      const { data } = await supabase.from('consultor_empresas').select('*, empresas(razao_social)');
      return data ?? [];
    },
  });

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
      const { data } = await supabase.from('empresas').select('id, razao_social').eq('ativa', true).order('razao_social');
      return data ?? [];
    },
  });

  const desvincular = useMutation({
    mutationFn: async (linkId: string) => {
      const { error } = await supabase.from('consultor_empresas').delete().eq('id', linkId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultor-empresas-links'] });
      toast({ title: 'Empresa desvinculada do consultor' });
    },
    onError: (err: Error) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['consultor-empresas-links'] });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Input placeholder="Buscar consultor..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
        <span className="text-sm text-muted-foreground whitespace-nowrap">{consultores?.length ?? 0} consultores</span>
        <Button onClick={() => setShowForm(true)} className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_4px_14px_0_hsl(var(--primary)/0.4)] ml-auto whitespace-nowrap">
          <Plus className="h-4 w-4 mr-1" /> Vincular a Empresa
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
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
          ) : consultores?.length === 0 ? (
            <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum consultor</TableCell></TableRow>
          ) : consultores?.map((c: any) => {
            const cLinks = links?.filter((l: any) => l.user_id === c.id) ?? [];
            const cStats = stats?.[c.id] ?? { avaliacoes: 0, laudos: 0 };
            return (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.full_name || '—'}</TableCell>
                <TableCell>{c.email || '—'}</TableCell>
                <TableCell>
                  {cLinks.length === 0 ? (
                    <span className="text-muted-foreground text-sm">Nenhuma</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {cLinks.map((l: any) => (
                        <Badge key={l.id} variant="outline" className="gap-1 pr-1">
                          {(l as any).empresas?.razao_social}
                          <button
                            onClick={() => desvincular.mutate(l.id)}
                            className="ml-1 rounded-full hover:bg-destructive/20 p-0.5"
                            title="Desvincular"
                          >
                            <X className="h-3 w-3 text-destructive" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </TableCell>
                <TableCell>{cStats.avaliacoes}</TableCell>
                <TableCell>{cStats.laudos}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => setDetailConsultor(c)} title="Gerenciar vínculos">
                    <Eye className="h-4 w-4 mr-1" /> Gerenciar
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* Vincular Form Dialog */}
      <Dialog open={showForm} onOpenChange={(o) => { if (!o) setShowForm(false); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Vincular Consultor a Empresa</DialogTitle></DialogHeader>
          <VincularConsultorForm
            consultores={consultores ?? []}
            empresas={empresas ?? []}
            onClose={() => setShowForm(false)}
            onSaved={() => { setShowForm(false); invalidateAll(); }}
          />
        </DialogContent>
      </Dialog>

      {/* Detail / Manage Dialog */}
      {detailConsultor && (
        <Dialog open={!!detailConsultor} onOpenChange={(o) => { if (!o) setDetailConsultor(null); }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Gerenciar Vínculos — {detailConsultor.full_name || detailConsultor.email}</DialogTitle>
            </DialogHeader>
            <ConsultorDetailPanel
              consultor={detailConsultor}
              links={(links ?? []).filter((l: any) => l.user_id === detailConsultor.id)}
              empresas={empresas ?? []}
              onDesvincular={(id: string) => desvincular.mutate(id)}
              onVinculado={invalidateAll}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

/* ── Vincular Form (inline) ── */
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
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Consultor *</Label>
        <Select value={userId} onValueChange={setUserId}>
          <SelectTrigger><SelectValue placeholder="Selecione o consultor" /></SelectTrigger>
          <SelectContent>{consultores.map((c) => <SelectItem key={c.id} value={c.id}>{c.full_name || c.email}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Empresa *</Label>
        <Select value={empresaId} onValueChange={setEmpresaId}>
          <SelectTrigger><SelectValue placeholder="Selecione a empresa" /></SelectTrigger>
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
      <Separator />
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={() => mutation.mutate()} disabled={!userId || !empresaId || mutation.isPending}>
          {mutation.isPending ? 'Vinculando...' : 'Vincular'}
        </Button>
      </div>
    </div>
  );
};

/* ── Detail Panel ── */
const ConsultorDetailPanel = ({ consultor, links, empresas, onDesvincular, onVinculado }: {
  consultor: any; links: any[]; empresas: any[]; onDesvincular: (id: string) => void; onVinculado: () => void;
}) => {
  const { toast } = useToast();
  const [empresaId, setEmpresaId] = useState('');
  const [nivel, setNivel] = useState('padrao');

  const linkedIds = links.map((l: any) => l.empresa_id);
  const availableEmpresas = empresas.filter(e => !linkedIds.includes(e.id));

  const vincular = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('consultor_empresas').insert({
        user_id: consultor.id, empresa_id: empresaId, nivel_atuacao: nivel,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Empresa vinculada' });
      setEmpresaId('');
      onVinculado();
    },
    onError: (err: Error) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-muted-foreground mb-2">Empresas vinculadas:</p>
        {links.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">Nenhuma empresa vinculada.</p>
        ) : (
          <div className="space-y-2">
            {links.map((l: any) => (
              <div key={l.id} className="flex items-center justify-between border rounded-lg px-3 py-2">
                <div>
                  <span className="font-medium text-sm">{(l as any).empresas?.razao_social}</span>
                  <Badge variant="secondary" className="ml-2 text-xs">{l.nivel_atuacao || 'padrão'}</Badge>
                </div>
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => onDesvincular(l.id)}>
                  <X className="h-4 w-4 mr-1" /> Desvincular
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Separator />

      <div>
        <p className="text-sm font-medium mb-2">Vincular nova empresa:</p>
        {availableEmpresas.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">Todas as empresas já estão vinculadas.</p>
        ) : (
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-1">
              <Label className="text-xs">Empresa</Label>
              <Select value={empresaId} onValueChange={setEmpresaId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{availableEmpresas.map(e => <SelectItem key={e.id} value={e.id}>{e.razao_social}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="w-32 space-y-1">
              <Label className="text-xs">Nível</Label>
              <Select value={nivel} onValueChange={setNivel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="padrao">Padrão</SelectItem>
                  <SelectItem value="senior">Sênior</SelectItem>
                  <SelectItem value="especialista">Especialista</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => vincular.mutate()} disabled={!empresaId || vincular.isPending} size="sm">
              <Plus className="h-4 w-4 mr-1" /> Vincular
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConsultoresTab;
