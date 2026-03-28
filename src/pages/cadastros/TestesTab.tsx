import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

const DISC_PROFILES = ['D', 'I', 'S', 'C'];
const PROFILE_COLORS: Record<string, string> = {
  D: 'text-red-500',
  I: 'text-yellow-500',
  S: 'text-green-500',
  C: 'text-blue-500',
};

const TIPOS_TESTE = [
  { value: 'disc', label: 'DISC' },
  { value: 'comportamental', label: 'Comportamental' },
  { value: 'organizacional', label: 'Organizacional' },
  { value: 'interno', label: 'Avaliação Interna' },
];

/* ─── DISC-style Inline Question (like reference image) ─── */
const DISCQuestionCard = ({
  question, index, options, onDelete, onUpdateQuestion, onUpdateOption,
}: {
  question: any; index: number; options: any[];
  onDelete: () => void;
  onUpdateQuestion: (field: string, value: any) => void;
  onUpdateOption: (optId: string, field: string, value: any) => void;
}) => {
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Question header */}
      <div className="flex items-center gap-2 bg-muted/40 px-4 py-2">
        <span className="text-xs font-mono text-muted-foreground">{index + 1}.</span>
        <Input
          value={question.texto}
          onChange={e => onUpdateQuestion('texto', e.target.value)}
          className="flex-1 bg-muted/50 border-0 font-medium h-9"
          placeholder={`Pergunta ${index + 1}`}
        />
        <button onClick={onDelete} className="text-muted-foreground hover:text-destructive">
          ✕
        </button>
      </div>

      {/* Options with profile selector */}
      <div className="p-3 space-y-2">
        {options.map((opt: any) => (
          <div key={opt.id} className="flex items-center gap-2">
            <span className={`text-xs font-bold w-4 text-center ${PROFILE_COLORS[opt.perfil] || 'text-muted-foreground'}`}>
              {opt.perfil || '?'}
            </span>
            <Input
              value={opt.texto}
              onChange={e => onUpdateOption(opt.id, 'texto', e.target.value)}
              className="flex-1 h-9 bg-muted/20 border-0"
              placeholder="Texto da alternativa"
            />
            <Select value={opt.perfil || ''} onValueChange={v => onUpdateOption(opt.id, 'perfil', v)}>
              <SelectTrigger className="w-16 h-9">
                <SelectValue placeholder="?" />
              </SelectTrigger>
              <SelectContent>
                {DISC_PROFILES.map(p => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ─── Test Editor Modal ─── */
const TestEditorModal = ({
  testId, testName, testTipo, open, onOpenChange,
}: {
  testId: string; testName: string; testTipo: string; open: boolean; onOpenChange: (v: boolean) => void;
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeSwitch, setActiveSwitch] = useState(true);
  const isDISC = testTipo === 'disc';

  const { data: testTemplate } = useQuery({
    queryKey: ['test-template-detail', testId],
    queryFn: async () => {
      const { data } = await supabase.from('test_templates' as any).select('*').eq('id', testId).single();
      return data as any;
    },
    enabled: open,
  });

  const { data: questions, refetch: refetchQ } = useQuery({
    queryKey: ['test-questions', testId],
    queryFn: async () => {
      const { data } = await supabase.from('test_questions' as any).select('*').eq('test_id', testId).order('ordem');
      return (data || []) as any[];
    },
    enabled: open,
  });

  const { data: allOptions, refetch: refetchOpts } = useQuery({
    queryKey: ['test-options', testId],
    queryFn: async () => {
      if (!questions?.length) return [];
      const { data } = await supabase.from('test_options' as any).select('*').in('question_id', questions.map((q: any) => q.id)).order('ordem');
      return (data || []) as any[];
    },
    enabled: !!questions?.length,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['test-questions', testId] });
    queryClient.invalidateQueries({ queryKey: ['test-options', testId] });
  };

  const addQuestion = async () => {
    const { data } = await supabase.from('test_questions' as any).insert({
      test_id: testId,
      texto: '',
      ordem: questions?.length || 0,
    } as any).select('id').single();

    if (data && isDISC) {
      // Auto-create 4 DISC options
      await supabase.from('test_options' as any).insert(
        DISC_PROFILES.map((p, i) => ({
          question_id: (data as any).id, texto: '', perfil: p, valor: 1, ordem: i,
        }))
      );
    } else if (data) {
      await supabase.from('test_options' as any).insert([
        { question_id: (data as any).id, texto: 'Opção 1', valor: 0, ordem: 0 },
        { question_id: (data as any).id, texto: 'Opção 2', valor: 0, ordem: 1 },
      ] as any);
    }
    invalidate();
  };

  const deleteQuestion = async (qId: string) => {
    await supabase.from('test_options' as any).delete().eq('question_id', qId);
    await supabase.from('test_questions' as any).delete().eq('id', qId);
    invalidate();
  };

  const updateQuestion = async (qId: string, field: string, value: any) => {
    await supabase.from('test_questions' as any).update({ [field]: value } as any).eq('id', qId);
    refetchQ();
  };

  const updateOption = async (optId: string, field: string, value: any) => {
    await supabase.from('test_options' as any).update({ [field]: value } as any).eq('id', optId);
    refetchOpts();
  };

  const toggleTestStatus = async () => {
    const newStatus = testTemplate?.status === 'ativo' ? 'inativo' : 'ativo';
    await supabase.from('test_templates' as any).update({ status: newStatus } as any).eq('id', testId);
    queryClient.invalidateQueries({ queryKey: ['test-template-detail', testId] });
    queryClient.invalidateQueries({ queryKey: ['test-templates'] });
  };

  const tipoLabel = isDISC ? 'TESTE COMPORTAMENTAL (DISC)' : `TESTE ${testTipo?.toUpperCase()}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-lg">{testName}</DialogTitle>
        </DialogHeader>

        <div className="px-6 pt-4">
          {/* Title + toggle */}
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{tipoLabel}</p>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={testTemplate?.status === 'ativo'} onCheckedChange={toggleTestStatus} />
              <span className="text-muted-foreground">Ativar teste</span>
            </label>
          </div>

          {isDISC && (
            <p className="text-xs text-muted-foreground mb-4">
              Defina perguntas com 4 opções (uma para cada perfil DISC: D-Dominância, I-Influência, S-Estabilidade, C-Conformidade). 
              As respostas serão registradas no dossiê do candidato.
            </p>
          )}

          {/* Add question button */}
          <button onClick={addQuestion} className="text-sm text-primary hover:underline mb-4 block">
            + Pergunta
          </button>
        </div>

        {/* Questions */}
        <div className="px-6 pb-6 space-y-4">
          {isDISC ? (
            (questions || []).map((q: any, idx: number) => (
              <DISCQuestionCard
                key={q.id}
                question={q}
                index={idx}
                options={(allOptions || []).filter((o: any) => o.question_id === q.id)}
                onDelete={() => deleteQuestion(q.id)}
                onUpdateQuestion={(f, v) => updateQuestion(q.id, f, v)}
                onUpdateOption={(oId, f, v) => updateOption(oId, f, v)}
              />
            ))
          ) : (
            (questions || []).map((q: any, idx: number) => {
              const qOpts = (allOptions || []).filter((o: any) => o.question_id === q.id);
              return (
                <div key={q.id} className="border border-border rounded-lg p-4 space-y-3 bg-card">
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-mono text-muted-foreground mt-2">{idx + 1}.</span>
                    <Input
                      value={q.texto}
                      onChange={e => updateQuestion(q.id, 'texto', e.target.value)}
                      className="flex-1 bg-muted/50 border-0 font-medium"
                      placeholder={`Pergunta ${idx + 1}`}
                    />
                    <button onClick={() => deleteQuestion(q.id)} className="text-muted-foreground hover:text-destructive mt-2">
                      ✕
                    </button>
                  </div>
                  <div className="space-y-1 pl-6">
                    {qOpts.map((o: any) => (
                      <div key={o.id} className="flex items-center gap-2">
                        <Input value={o.texto} onChange={e => updateOption(o.id, 'texto', e.target.value)}
                          className="flex-1 h-9 bg-muted/20 border-0" placeholder="Opção" />
                        <Input type="number" value={o.valor ?? 0} onChange={e => updateOption(o.id, 'valor', parseFloat(e.target.value) || 0)}
                          className="w-16 h-9 text-center bg-muted/20 border-0" />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}

          {(!questions || questions.length === 0) && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma pergunta cadastrada. Clique em "+ Pergunta" para começar.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

/* ─── Apply Test Dialog ─── */
const ApplyTestDialog = ({ testId, empresaId, open, onOpenChange }: { testId: string; empresaId: string; open: boolean; onOpenChange: (v: boolean) => void }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedColab, setSelectedColab] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const { data: colaboradores } = useQuery({
    queryKey: ['colabs-test', empresaId],
    queryFn: async () => {
      const { data } = await supabase.from('colaboradores').select('id, nome_completo').eq('empresa_id', empresaId).eq('status', 'ativo').order('nome_completo');
      return data ?? [];
    },
    enabled: open,
  });

  const { data: questions } = useQuery({
    queryKey: ['test-q-apply', testId],
    queryFn: async () => {
      const { data } = await supabase.from('test_questions' as any).select('*').eq('test_id', testId).eq('ativa', true).order('ordem');
      return (data || []) as any[];
    },
    enabled: open,
  });

  const { data: allOptions } = useQuery({
    queryKey: ['test-o-apply', testId],
    queryFn: async () => {
      if (!questions?.length) return [];
      const { data } = await supabase.from('test_options' as any).select('*').in('question_id', questions.map((q: any) => q.id)).order('ordem');
      return (data || []) as any[];
    },
    enabled: !!questions?.length,
  });

  const submitTest = useMutation({
    mutationFn: async () => {
      if (!selectedColab) throw new Error('Selecione um colaborador');
      const scores: Record<string, number> = {};
      Object.entries(answers).forEach(([qId, optId]) => {
        const opt = (allOptions || []).find((o: any) => o.id === optId) as any;
        if (opt?.perfil) {
          scores[opt.perfil] = (scores[opt.perfil] || 0) + (Number(opt.valor) || 1);
        }
      });
      const perfil_predominante = Object.keys(scores).length > 0
        ? Object.entries(scores).sort(([, a], [, b]) => b - a)[0][0]
        : null;

      const { error } = await supabase.from('employee_test_results' as any).insert({
        empresa_id: empresaId, colaborador_id: selectedColab, test_id: testId,
        respostas: answers, scores, perfil_predominante,
        applied_by: user?.id, status: 'concluido',
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-results'] });
      toast({ title: 'Teste aplicado com sucesso!' });
      onOpenChange(false);
      setAnswers({});
      setSelectedColab('');
    },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Aplicar Teste</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Colaborador *</Label>
            <Select value={selectedColab} onValueChange={setSelectedColab}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {colaboradores?.map(c => <SelectItem key={c.id} value={c.id}>{c.nome_completo}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {questions?.map((q: any, idx: number) => {
            const qOpts = (allOptions || []).filter((o: any) => o.question_id === q.id);
            return (
              <Card key={q.id}>
                <CardContent className="p-4 space-y-2">
                  <p className="text-sm font-medium">#{idx + 1}. {q.texto}</p>
                  <div className="space-y-1 pl-2">
                    {qOpts.map((o: any) => (
                      <label key={o.id} className="flex items-center gap-2 text-sm cursor-pointer py-1">
                        <input type="radio" name={`q-${q.id}`} value={o.id}
                          checked={answers[q.id] === o.id}
                          onChange={() => setAnswers(prev => ({ ...prev, [q.id]: o.id }))}
                          className="accent-primary" />
                        {o.perfil && <span className={`text-xs font-bold ${PROFILE_COLORS[o.perfil] || ''}`}>{o.perfil}</span>}
                        {o.texto}
                      </label>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={() => submitTest.mutate()} disabled={submitTest.isPending || !selectedColab}>
              {submitTest.isPending ? 'Salvando...' : 'Finalizar Teste'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/* ═══════════════════════════════════════════
   MAIN TESTES TAB
   ═══════════════════════════════════════════ */
const TestesTab = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedEmpresa, setSelectedEmpresa] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingTest, setEditingTest] = useState<{ id: string; nome: string; tipo: string } | null>(null);
  const [applyingTestId, setApplyingTestId] = useState<string | null>(null);
  const [form, setForm] = useState({ nome: '', tipo: 'comportamental', descricao: '', categorias: '' });
  const [showResults, setShowResults] = useState(false);

  const { data: empresas } = useQuery({
    queryKey: ['empresas-testes'],
    queryFn: async () => {
      const { data } = await supabase.from('empresas').select('id, razao_social, nome_fantasia').eq('ativa', true).order('razao_social');
      return data ?? [];
    },
  });

  const { data: tests, isLoading } = useQuery({
    queryKey: ['test-templates', selectedEmpresa],
    queryFn: async () => {
      let query = supabase.from('test_templates' as any).select('*').order('created_at', { ascending: false });
      if (selectedEmpresa) {
        query = query.or(`empresa_id.eq.${selectedEmpresa},is_global.eq.true`);
      }
      const { data } = await query;
      return (data || []) as any[];
    },
    enabled: !!selectedEmpresa,
  });

  const { data: results } = useQuery({
    queryKey: ['test-results', selectedEmpresa],
    queryFn: async () => {
      if (!selectedEmpresa) return [];
      const { data } = await supabase.from('employee_test_results' as any).select('*, colaboradores(nome_completo), test_templates(nome)' as any)
        .eq('empresa_id', selectedEmpresa).order('created_at', { ascending: false });
      return (data || []) as any[];
    },
    enabled: !!selectedEmpresa && showResults,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const cats = form.categorias ? form.categorias.split(',').map(c => c.trim()) : [];
      const { error } = await supabase.from('test_templates' as any).insert({
        nome: form.nome, tipo: form.tipo, descricao: form.descricao || null,
        empresa_id: selectedEmpresa || null, is_global: !selectedEmpresa,
        categorias: cats, created_by: user?.id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-templates'] });
      toast({ title: 'Teste criado' });
      setShowForm(false);
      setForm({ nome: '', tipo: 'comportamental', descricao: '', categorias: '' });
    },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const deleteTest = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('test_templates' as any).delete().eq('id', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-templates'] });
      toast({ title: 'Teste removido' });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="flex-1 max-w-sm space-y-1">
          <Label className="text-sm">Selecione a Empresa</Label>
          <Select value={selectedEmpresa} onValueChange={setSelectedEmpresa}>
            <SelectTrigger><SelectValue placeholder="Escolha uma empresa..." /></SelectTrigger>
            <SelectContent>
              {empresas?.map(e => <SelectItem key={e.id} value={e.id}>{e.razao_social}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {selectedEmpresa && (
          <div className="flex gap-2 self-end">
            <Button variant="outline" onClick={() => setShowResults(!showResults)}>
              {showResults ? 'Ver Testes' : 'Ver Resultados'}
            </Button>
            <Button onClick={() => setShowForm(true)}>
              Novo Teste
            </Button>
          </div>
        )}
      </div>

      {!selectedEmpresa ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Selecione uma empresa.</p>
      ) : showResults ? (
        <div>
          <h3 className="text-base font-semibold mb-3">Resultados de Testes</h3>
          {results && results.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Teste</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead>Scores</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{(r.colaboradores as any)?.nome_completo || '—'}</TableCell>
                    <TableCell>{(r.test_templates as any)?.nome || '—'}</TableCell>
                    <TableCell><Badge>{r.perfil_predominante || '—'}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {r.scores && Object.entries(r.scores as Record<string, number>).map(([k, v]) => (
                          <Badge key={k} variant="secondary" className="text-xs">{k}: {v}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{new Date(r.created_at).toLocaleDateString('pt-BR')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum resultado encontrado.</p>
          )}
        </div>
      ) : (
        <>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : tests && tests.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Versão</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tests.map((t: any) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.nome}</TableCell>
                    <TableCell><Badge variant="secondary">{t.tipo}</Badge></TableCell>
                    <TableCell>v{t.versao}</TableCell>
                    <TableCell><Badge variant={t.status === 'ativo' ? 'default' : 'secondary'}>{t.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setEditingTest({ id: t.id, nome: t.nome, tipo: t.tipo })}>
                          Perguntas
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setApplyingTestId(t.id)} title="Aplicar">
                          ▶
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => deleteTest.mutate(t.id)} className="text-destructive">
                          ✕
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum teste encontrado.</p>
          )}
        </>
      )}

      {/* Editor Modal */}
      {editingTest && (
        <TestEditorModal
          testId={editingTest.id}
          testName={editingTest.nome}
          testTipo={editingTest.tipo}
          open={!!editingTest}
          onOpenChange={v => { if (!v) setEditingTest(null); }}
        />
      )}

      {/* Apply Test */}
      {applyingTestId && selectedEmpresa && (
        <ApplyTestDialog testId={applyingTestId} empresaId={selectedEmpresa}
          open={!!applyingTestId} onOpenChange={v => { if (!v) setApplyingTestId(null); }} />
      )}

      {/* New Test */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Novo Teste</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-4">
            <div className="space-y-2"><Label>Nome *</Label><Input required value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} /></div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={v => setForm(p => ({ ...p, tipo: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIPOS_TESTE.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Descrição</Label><Textarea value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} /></div>
            <div className="space-y-2">
              <Label>Categorias/Perfis (separar por vírgula)</Label>
              <Input value={form.categorias} onChange={e => setForm(p => ({ ...p, categorias: e.target.value }))} placeholder="D, I, S, C" />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Salvando...' : 'Criar Teste'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TestesTab;
