import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';

const MODULOS = ['AEP', 'AET', 'Psicossocial', 'PCMSO', 'Checklists', 'Testes', 'Documentos', 'Financeiro', 'Dashboard', 'Laudos', 'Planos de Ação', 'Atestados'];

const TIPO_LABELS: Record<string, string> = {
  basico: 'Básico',
  intermediario: 'Intermediário',
  avancado: 'Avançado',
  personalizado: 'Personalizado',
  enterprise: 'Enterprise',
};

const PERIODICIDADE_LABELS: Record<string, string> = {
  mensal: 'Mensal',
  trimestral: 'Trimestral',
  semestral: 'Semestral',
  anual: 'Anual',
};

const PlanosTab = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: planos, isLoading } = useQuery({
    queryKey: ['config-planos'],
    queryFn: async () => {
      const { data } = await supabase.from('planos').select('*').order('valor_mensal');
      return data ?? [];
    },
  });

  const { data: contratos } = useQuery({
    queryKey: ['config-contratos'],
    queryFn: async () => {
      const { data } = await supabase.from('contratos').select('*, empresas(razao_social), planos(nome)').order('created_at', { ascending: false });
      return data ?? [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('planos').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config-planos'] });
      toast({ title: 'Plano excluído' });
    },
    onError: (err: Error) => toast({ title: 'Erro ao excluir', description: err.message, variant: 'destructive' }),
  });

  if (showForm || editingId) {
    return (
      <PlanoForm
        planoId={editingId}
        onClose={() => { setShowForm(false); setEditingId(null); }}
        onSaved={() => { setShowForm(false); setEditingId(null); queryClient.invalidateQueries({ queryKey: ['config-planos'] }); }}
      />
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-4">
          
          <h3 className="text-lg font-semibold" style={{ fontFamily: 'Space Grotesk' }}>Planos Disponíveis</h3>
          <span className="text-sm text-muted-foreground">{planos?.length ?? 0} planos cadastrados</span>
          <Button onClick={() => setShowForm(true)} className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground ml-auto whitespace-nowrap shadow-[0_4px_14px_0_hsl(var(--primary)/0.4)]">
            Novo Plano
          </Button>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground py-8 text-center">Carregando...</p>
        ) : planos?.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhum plano cadastrado. Crie o primeiro plano para oferecer às empresas.</CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {planos?.map((p: any) => {
              const recursos = p.recursos as Record<string, any> | null;
              const modulos: string[] = recursos?.modulos_ativos || [];
              const tipo = recursos?.tipo_plano || 'personalizado';
              const periodicidade = recursos?.periodicidade || 'mensal';
              const valorImplantacao = recursos?.valor_implantacao || 0;
              const limiteEmpresas = recursos?.limite_empresas_vinculadas;

              return (
                <Card key={p.id} className={`relative overflow-hidden transition-shadow hover:shadow-lg ${!p.ativo ? 'opacity-60' : ''}`}>
                  <div className={`absolute top-0 left-0 right-0 h-1 ${p.ativo ? 'bg-primary' : 'bg-muted-foreground'}`} />
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold text-lg">{p.nome}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">{TIPO_LABELS[tipo] || tipo}</Badge>
                          <Badge variant={p.ativo ? 'default' : 'secondary'} className="text-xs">{p.ativo ? 'Ativo' : 'Inativo'}</Badge>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm" onClick={() => setEditingId(p.id)}>
                          Editar
                        </Button>
                        <Button variant="outline" size="sm" className="text-destructive" onClick={() => {
                          if (confirm('Excluir este plano?')) deleteMutation.mutate(p.id);
                        }}>
                          Excluir
                        </Button>
                      </div>
                    </div>

                    {p.descricao && <p className="text-sm text-muted-foreground">{p.descricao}</p>}

                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-primary">R$ {Number(p.valor_mensal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      <span className="text-sm text-muted-foreground">/{PERIODICIDADE_LABELS[periodicidade]?.toLowerCase() || 'mês'}</span>
                    </div>

                    {Number(valorImplantacao) > 0 && (
                      <p className="text-xs text-muted-foreground">Implantação: R$ {Number(valorImplantacao).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    )}

                    <Separator />

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Usuários</p>
                        <p className="font-medium">{p.limite_usuarios ?? '∞'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Colaboradores</p>
                        <p className="font-medium">{p.limite_colaboradores ?? '∞'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Avaliações</p>
                        <p className="font-medium">{p.limite_avaliacoes ?? '∞'}</p>
                      </div>
                      {limiteEmpresas && (
                        <div>
                          <p className="text-xs text-muted-foreground">Empresas</p>
                          <p className="font-medium">{limiteEmpresas}</p>
                        </div>
                      )}
                    </div>

                    {modulos.length > 0 && (
                      <>
                        <Separator />
                        <div>
                          <p className="text-xs text-muted-foreground mb-2">Módulos inclusos</p>
                          <div className="flex flex-wrap gap-1">
                            {modulos.map((m: string) => (
                              <Badge key={m} variant="secondary" className="text-xs">{m}</Badge>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Separator />

      <div>
        <h3 className="text-lg font-semibold mb-4" style={{ fontFamily: 'Space Grotesk' }}>Contratos Ativos</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empresa</TableHead>
              <TableHead>Plano</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Início</TableHead>
              <TableHead>Fim</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contratos?.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum contrato</TableCell></TableRow>
            ) : contratos?.map((c: any) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.empresas?.razao_social}</TableCell>
                <TableCell>{c.planos?.nome || '—'}</TableCell>
                <TableCell><Badge variant={c.status === 'ativo' ? 'default' : 'destructive'}>{c.status}</Badge></TableCell>
                <TableCell>{c.data_inicio || '—'}</TableCell>
                <TableCell>{c.data_fim || '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

// ─── Formulário completo de Plano ────────────────────────────────────────────

const PlanoForm = ({ planoId, onClose, onSaved }: { planoId: string | null; onClose: () => void; onSaved: () => void }) => {
  const { toast } = useToast();
  const isEdit = !!planoId;

  const [form, setForm] = useState({
    nome: '',
    descricao: '',
    tipo_plano: 'basico',
    periodicidade: 'mensal',
    valor_mensal: '0',
    valor_implantacao: '0',
    limite_usuarios: '5',
    limite_colaboradores: '50',
    limite_avaliacoes: '100',
    limite_empresas_vinculadas: '',
    modulos_ativos: [...MODULOS] as string[],
    ativo: true,
  });

  const { data: existing } = useQuery({
    queryKey: ['plano-edit', planoId],
    queryFn: async () => {
      if (!planoId) return null;
      const { data } = await supabase.from('planos').select('*').eq('id', planoId).single();
      return data;
    },
    enabled: !!planoId,
  });

  useEffect(() => {
    if (existing) {
      const recursos = existing.recursos as Record<string, any> | null;
      setForm({
        nome: existing.nome,
        descricao: existing.descricao || '',
        tipo_plano: recursos?.tipo_plano || 'personalizado',
        periodicidade: recursos?.periodicidade || 'mensal',
        valor_mensal: String(existing.valor_mensal ?? 0),
        valor_implantacao: String(recursos?.valor_implantacao ?? 0),
        limite_usuarios: String(existing.limite_usuarios ?? ''),
        limite_colaboradores: String(existing.limite_colaboradores ?? ''),
        limite_avaliacoes: String(existing.limite_avaliacoes ?? ''),
        limite_empresas_vinculadas: String(recursos?.limite_empresas_vinculadas ?? ''),
        modulos_ativos: recursos?.modulos_ativos || [],
        ativo: existing.ativo ?? true,
      });
    }
  }, [existing]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        nome: form.nome,
        descricao: form.descricao || null,
        valor_mensal: parseFloat(form.valor_mensal) || 0,
        limite_usuarios: form.limite_usuarios ? parseInt(form.limite_usuarios) : null,
        limite_colaboradores: form.limite_colaboradores ? parseInt(form.limite_colaboradores) : null,
        limite_avaliacoes: form.limite_avaliacoes ? parseInt(form.limite_avaliacoes) : null,
        ativo: form.ativo,
        recursos: {
          tipo_plano: form.tipo_plano,
          periodicidade: form.periodicidade,
          valor_implantacao: parseFloat(form.valor_implantacao) || 0,
          limite_empresas_vinculadas: form.limite_empresas_vinculadas ? parseInt(form.limite_empresas_vinculadas) : null,
          modulos_ativos: form.modulos_ativos,
        },
      };
      if (isEdit) {
        const { error } = await supabase.from('planos').update(payload).eq('id', planoId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('planos').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: isEdit ? 'Plano atualizado' : 'Plano criado' });
      onSaved();
    },
    onError: (err: Error) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  const set = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));

  const toggleModulo = (mod: string) => {
    setForm(prev => ({
      ...prev,
      modulos_ativos: prev.modulos_ativos.includes(mod)
        ? prev.modulos_ativos.filter(m => m !== mod)
        : [...prev.modulos_ativos, mod],
    }));
  };

  const selectAllModulos = () => set('modulos_ativos', [...MODULOS]);
  const clearAllModulos = () => set('modulos_ativos', []);

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}>
      <Card className="overflow-hidden">
        <div className="h-1 bg-primary" />
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold" style={{ fontFamily: 'Space Grotesk' }}>{isEdit ? 'Editar Plano' : 'Novo Plano'}</h2>
            <div className="flex items-center gap-2">
              <Label htmlFor="plano-ativo" className="text-sm text-muted-foreground">Ativo</Label>
              <Switch id="plano-ativo" checked={form.ativo} onCheckedChange={(v) => set('ativo', v)} />
            </div>
          </div>

          {/* Identificação */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label>Nome do Plano *</Label>
              <Input value={form.nome} onChange={(e) => set('nome', e.target.value)} required placeholder="Ex: Profissional" />
            </div>
            <div className="space-y-2">
              <Label>Tipo de Plano</Label>
              <Select value={form.tipo_plano} onValueChange={v => set('tipo_plano', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="basico">Básico</SelectItem>
                  <SelectItem value="intermediario">Intermediário</SelectItem>
                  <SelectItem value="avancado">Avançado</SelectItem>
                  <SelectItem value="personalizado">Personalizado</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Periodicidade</Label>
              <Select value={form.periodicidade} onValueChange={v => set('periodicidade', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mensal">Mensal</SelectItem>
                  <SelectItem value="trimestral">Trimestral</SelectItem>
                  <SelectItem value="semestral">Semestral</SelectItem>
                  <SelectItem value="anual">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Valores */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Valores</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor Mensal (R$)</Label>
                <Input type="number" step="0.01" value={form.valor_mensal} onChange={e => set('valor_mensal', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Valor de Implantação (R$)</Label>
                <Input type="number" step="0.01" value={form.valor_implantacao} onChange={e => set('valor_implantacao', e.target.value)} />
              </div>
            </div>
          </div>

          <Separator />

          {/* Limites */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Limites</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Usuários</Label>
                <Input type="number" value={form.limite_usuarios} onChange={e => set('limite_usuarios', e.target.value)} placeholder="∞" />
              </div>
              <div className="space-y-2">
                <Label>Colaboradores</Label>
                <Input type="number" value={form.limite_colaboradores} onChange={e => set('limite_colaboradores', e.target.value)} placeholder="∞" />
              </div>
              <div className="space-y-2">
                <Label>Avaliações</Label>
                <Input type="number" value={form.limite_avaliacoes} onChange={e => set('limite_avaliacoes', e.target.value)} placeholder="∞" />
              </div>
              <div className="space-y-2">
                <Label>Empresas Vinculadas</Label>
                <Input type="number" value={form.limite_empresas_vinculadas} onChange={e => set('limite_empresas_vinculadas', e.target.value)} placeholder="∞" />
              </div>
            </div>
          </div>

          <Separator />

          {/* Módulos */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Módulos Inclusos</h3>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={selectAllModulos} className="text-xs">Selecionar Todos</Button>
                <Button type="button" variant="outline" size="sm" onClick={clearAllModulos} className="text-xs">Limpar</Button>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {MODULOS.map(mod => (
                <label key={mod} className="flex items-center gap-2 text-sm cursor-pointer p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <Checkbox checked={form.modulos_ativos.includes(mod)} onCheckedChange={() => toggleModulo(mod)} />
                  {mod}
                </label>
              ))}
            </div>
          </div>

          <Separator />

          {/* Descrição */}
          <div className="space-y-2">
            <Label>Descrição do Plano</Label>
            <Textarea
              value={form.descricao}
              onChange={(e) => set('descricao', e.target.value)}
              placeholder="Descreva os benefícios e diferenciais deste plano..."
              rows={3}
            />
          </div>

          <Separator />

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose} className="rounded-full">Cancelar</Button>
            <Button type="submit" disabled={mutation.isPending} className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_4px_14px_0_hsl(var(--primary)/0.4)]">
              {mutation.isPending ? 'Salvando...' : isEdit ? 'Atualizar Plano' : 'Criar Plano'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
};

export default PlanosTab;
