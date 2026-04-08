import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import PageTransition from '@/components/PageTransition';
import { useAutoSave } from '@/hooks/useAutoSave';
import AutoSaveBadge from '@/components/AutoSaveBadge';

/* ─── Likert Psychosocial Questionnaire Blocks ─── */
const LIKERT_BLOCKS = [
  {
    id: 'demandas',
    label: 'Bloco 1 — Demandas do Trabalho',
    shortLabel: 'Demandas',
    description: 'Avalia a carga de trabalho, pressão por prazos e exigências emocionais.',
    questions: [
      'Tenho que trabalhar muito rápido para dar conta das tarefas.',
      'Meu trabalho exige muito esforço mental/concentração.',
      'Recebo demandas conflitantes de diferentes pessoas.',
      'Sinto pressão constante por prazos apertados.',
      'Meu trabalho me expõe a situações emocionalmente difíceis.',
    ],
  },
  {
    id: 'controle',
    label: 'Bloco 2 — Controle sobre o Trabalho',
    shortLabel: 'Controle',
    description: 'Avalia autonomia, participação em decisões e uso de habilidades.',
    questions: [
      'Tenho liberdade para decidir como realizar minhas tarefas.',
      'Posso influenciar as decisões que afetam meu trabalho.',
      'Meu trabalho me permite desenvolver novas habilidades.',
      'Consigo fazer pausas quando preciso.',
      'Tenho autonomia sobre o ritmo do meu trabalho.',
    ],
  },
  {
    id: 'apoio',
    label: 'Bloco 3 — Apoio Social e Relações',
    shortLabel: 'Apoio',
    description: 'Avalia suporte de colegas e liderança, comunicação e reconhecimento.',
    questions: [
      'Recebo apoio adequado dos meus colegas de trabalho.',
      'Minha chefia me apoia quando preciso.',
      'Recebo feedback construtivo sobre meu desempenho.',
      'Sinto que meu trabalho é reconhecido/valorizado.',
      'A comunicação no meu setor funciona bem.',
    ],
  },
  {
    id: 'violencia',
    label: 'Bloco 4 — Violência e Assédio',
    shortLabel: 'Violência',
    description: 'Avalia exposição a situações de violência, assédio e discriminação.',
    questions: [
      'Já fui alvo de gritos, xingamentos ou humilhação no trabalho.',
      'Presenciei ou sofri intimidação/ameaça no ambiente de trabalho.',
      'Já fui discriminado(a) por gênero, raça, idade ou outra característica.',
      'Há situações de assédio moral recorrentes no meu setor.',
      'Sinto medo de represálias ao denunciar situações inadequadas.',
    ],
  },
  {
    id: 'saude',
    label: 'Bloco 5 — Saúde e Bem-estar',
    shortLabel: 'Saúde',
    description: 'Avalia impactos percebidos na saúde física e mental.',
    questions: [
      'Tenho dificuldade para dormir por preocupações com o trabalho.',
      'Sinto cansaço extremo ao final do expediente.',
      'Tenho sintomas físicos (dor de cabeça, tensão muscular) relacionados ao trabalho.',
      'Sinto ansiedade ou angústia frequente no trabalho.',
      'Já pensei em pedir demissão por questões de saúde mental.',
    ],
  },
];

const LIKERT_OPTIONS = [
  { value: 1, label: 'Discordo totalmente' },
  { value: 2, label: 'Discordo' },
  { value: 3, label: 'Neutro' },
  { value: 4, label: 'Concordo' },
  { value: 5, label: 'Concordo totalmente' },
];

const classifyLikert = (score: number, total: number): string => {
  const pct = (score / total) * 100;
  if (pct <= 30) return 'baixo';
  if (pct <= 50) return 'moderado';
  if (pct <= 70) return 'alto';
  return 'muito_alto';
};

const classLabel: Record<string, string> = {
  baixo: 'Baixo', moderado: 'Moderado', alto: 'Alto', muito_alto: 'Muito Alto',
};
const classBadge: Record<string, 'secondary' | 'default' | 'destructive'> = {
  baixo: 'secondary', moderado: 'default', alto: 'destructive', muito_alto: 'destructive',
};

const LikertQuestionnaireForm = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [empresaId, setEmpresaId] = useState('');
  const [setorId, setSetorId] = useState('all');
  const [activeBlock, setActiveBlock] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

  // Auto-save
  const formData = useMemo(() => ({ empresaId, setorId, activeBlock, answers }), [empresaId, setorId, activeBlock, answers]);
  const { lastSaved, recover, clear: clearDraft, hasSavedData, recovered } = useAutoSave({
    key: 'likert-nova',
    data: formData,
    debounceMs: 10000,
  });

  useEffect(() => {
    if (hasSavedData()) {
      const saved = recover();
      if (saved) {
        setEmpresaId(saved.empresaId || '');
        setSetorId(saved.setorId || 'all');
        setActiveBlock(saved.activeBlock || 0);
        setAnswers(saved.answers || {});
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: empresas = [] } = useQuery({
    queryKey: ['empresas-likert'],
    queryFn: async () => {
      const { data } = await supabase.from('empresas').select('id, razao_social').eq('ativa', true).order('razao_social');
      return data ?? [];
    },
  });

  const { data: setores = [] } = useQuery({
    queryKey: ['setores-likert', empresaId],
    queryFn: async () => {
      if (!empresaId) return [];
      const { data } = await supabase.from('setores').select('id, nome').eq('empresa_id', empresaId).order('nome');
      return data ?? [];
    },
    enabled: !!empresaId,
  });

  const block = LIKERT_BLOCKS[activeBlock];
  const totalQuestions = LIKERT_BLOCKS.reduce((s, b) => s + b.questions.length, 0);
  const answeredCount = Object.keys(answers).length;
  const progressPct = Math.round((answeredCount / totalQuestions) * 100);

  const isBlockComplete = (idx: number) => {
    const b = LIKERT_BLOCKS[idx];
    return b.questions.every((_, qi) => answers[`${b.id}-${qi}`] !== undefined);
  };

  const allComplete = LIKERT_BLOCKS.every((_, i) => isBlockComplete(i));

  const hasViolenceAlert = useMemo(() => {
    const vBlock = LIKERT_BLOCKS.find(b => b.id === 'violencia');
    if (!vBlock) return false;
    return vBlock.questions.some((_, qi) => (answers[`violencia-${qi}`] ?? 0) >= 3);
  }, [answers]);

  const scores = useMemo(() => {
    const blockScores: Record<string, { score: number; max: number; pct: number }> = {};
    let total = 0;
    let maxTotal = 0;
    LIKERT_BLOCKS.forEach(b => {
      let bScore = 0;
      const max = b.questions.length * 5;
      b.questions.forEach((_, qi) => { bScore += answers[`${b.id}-${qi}`] ?? 0; });
      const isInverted = b.id === 'controle' || b.id === 'apoio';
      const adjusted = isInverted ? max - bScore : bScore;
      blockScores[b.id] = { score: adjusted, max, pct: Math.round((adjusted / max) * 100) };
      total += adjusted;
      maxTotal += max;
    });
    const classification = classifyLikert(total, maxTotal);
    return { blockScores, total, maxTotal, classification };
  }, [answers]);

  const handleAnswer = (questionKey: string, value: number) => {
    setAnswers(prev => ({ ...prev, [questionKey]: value }));
  };

  const handleSave = async () => {
    if (!empresaId) {
      toast({ title: 'Selecione uma empresa', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const hash = `anon-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const { error } = await supabase.from('avaliacoes_psicossociais_likert' as any).insert({
        empresa_id: empresaId,
        setor_id: setorId === 'all' ? null : setorId,
        respondente_hash: hash,
        respostas: answers,
        scores: scores.blockScores,
        score_total: scores.total,
        classificacao: scores.classification,
        alerta_violencia: hasViolenceAlert,
        enfermeira_id: user?.id,
        status: 'finalizado',
        finalizado_em: new Date().toISOString(),
      } as any);
      if (error) throw error;

      if (hasViolenceAlert && user?.id) {
        await supabase.from('notifications').insert({
          user_id: user.id,
          type: 'alerta_psicossocial',
          title: 'Alerta de Violência/Assédio detectado',
          description: `Questionário psicossocial com indicadores ≥ 3 no bloco de violência. Empresa: ${empresas.find(e => e.id === empresaId)?.razao_social}`,
          priority: 'critical',
          entity_type: 'avaliacao_psicossocial',
          company_id: empresaId,
          action_link: '/riscos-psicossociais',
        });
      }

      clearDraft();
      queryClient.invalidateQueries({ queryKey: ['avaliacoes-likert'] });
      toast({ title: 'Avaliação registrada com sucesso!' });
      navigate('/riscos-psicossociais');
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
    setSaving(false);
  };

  return (
    <PageTransition>
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">Questionário Psicossocial</h1>
              <AutoSaveBadge lastSaved={lastSaved} recovered={recovered} />
            </div>
            <p className="text-muted-foreground">Escala Likert — 5 blocos, avaliação anônima</p>
          </div>
          <Button variant="outline" onClick={() => navigate('/riscos-psicossociais')}>Voltar</Button>
        </div>

        {/* Score summary card */}
        <Card className="mb-6 border-2 border-primary/20">
          <CardContent className="p-6">
            <div className="flex flex-wrap items-center gap-6">
              <div>
                <p className="text-sm text-muted-foreground">Score Total</p>
                <p className="text-4xl font-bold text-foreground">{scores.total}/{scores.maxTotal}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Classificação</p>
                <Badge variant={classBadge[scores.classification]} className="text-base px-4 py-1 mt-1">
                  {classLabel[scores.classification]}
                </Badge>
              </div>
              {hasViolenceAlert && (
                <div className="ml-auto">
                  <Badge variant="destructive" className="text-sm px-4 py-1">⚠ Alerta Violência</Badge>
                </div>
              )}
              <div className="flex flex-wrap gap-3 ml-auto">
                {LIKERT_BLOCKS.map(b => {
                  const s = scores.blockScores[b.id];
                  return (
                    <div key={b.id} className="text-center">
                      <p className="text-xs text-muted-foreground">{b.shortLabel}</p>
                      <p className="text-sm font-semibold">{s?.pct ?? 0}%</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Identification */}
        <Card className="mb-6">
          <CardHeader><CardTitle>Identificação</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Empresa *</Label>
                <Select value={empresaId} onValueChange={v => { setEmpresaId(v); setSetorId('all'); }}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{empresas.map(e => <SelectItem key={e.id} value={e.id}>{e.razao_social}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Setor (opcional)</Label>
                <Select value={setorId} onValueChange={setSetorId}>
                  <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {setores.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stepper progress */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-muted-foreground">
              Bloco {activeBlock + 1} de {LIKERT_BLOCKS.length}
            </p>
            <p className="text-sm text-muted-foreground">{progressPct}% concluído</p>
          </div>
          <Progress value={progressPct} className="h-2" />
          <div className="flex gap-1.5 mt-3 flex-wrap">
            {LIKERT_BLOCKS.map((b, i) => {
              const complete = isBlockComplete(i);
              const isCurrent = i === activeBlock;
              return (
                <button
                  key={b.id}
                  onClick={() => setActiveBlock(i)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                    isCurrent
                      ? 'bg-primary text-primary-foreground border-primary'
                      : complete
                      ? 'bg-primary/10 text-primary border-primary/30 hover:bg-primary/20'
                      : 'bg-muted text-muted-foreground border-border hover:bg-accent'
                  }`}
                >
                  {complete && '✓ '}{b.shortLabel}
                </button>
              );
            })}
          </div>
        </div>

        {/* Violence alert */}
        {hasViolenceAlert && (
          <Card className="mb-4 border-destructive/50 bg-destructive/5">
            <CardContent className="p-4">
              <p className="text-sm font-semibold text-destructive">⚠ Alerta imediato de violência/assédio</p>
              <p className="text-xs text-muted-foreground mt-1">Respostas no bloco de Violência indicam exposição significativa (≥ 3).</p>
            </CardContent>
          </Card>
        )}

        {/* Active block */}
        <AnimatePresence mode="wait">
          <motion.div
            key={block.id}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="mb-6">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{block.label}</CardTitle>
                  <Badge variant="outline" className="text-xs">
                    {block.questions.filter((_, qi) => answers[`${block.id}-${qi}`] !== undefined).length}/{block.questions.length} respondidas
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{block.description}</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {block.questions.map((q, qi) => {
                    const key = `${block.id}-${qi}`;
                    const selected = answers[key];
                    return (
                      <div key={qi} className="border-b pb-3 last:border-b-0 last:pb-0">
                        <p className="text-sm font-medium text-foreground mb-2">{qi + 1}) {q}</p>
                        <div className="flex flex-wrap gap-2">
                          {LIKERT_OPTIONS.map(opt => (
                            <Button
                              key={opt.value}
                              type="button"
                              variant={selected === opt.value ? 'default' : 'outline'}
                              size="sm"
                              className="min-w-[110px]"
                              onClick={() => handleAnswer(key, opt.value)}
                            >
                              {opt.value} — {opt.label}
                            </Button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="outline" disabled={activeBlock === 0} onClick={() => setActiveBlock(p => p - 1)}>
            ← Anterior
          </Button>
          {activeBlock < LIKERT_BLOCKS.length - 1 ? (
            <Button onClick={() => setActiveBlock(p => p + 1)}>
              Próximo →
            </Button>
          ) : (
            <Button disabled={!allComplete || !empresaId || saving} onClick={handleSave}>
              {saving ? 'Salvando...' : 'Finalizar Avaliação'}
            </Button>
          )}
        </div>

        {/* Score summary (visible when complete) */}
        {allComplete && (
          <Card className="mb-6">
            <CardHeader><CardTitle className="text-base">Resultado</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold">{scores.total}/{scores.maxTotal}</span>
                <Badge variant={classBadge[scores.classification]}>
                  {classLabel[scores.classification]}
                </Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                {LIKERT_BLOCKS.map(b => {
                  const s = scores.blockScores[b.id];
                  return s ? (
                    <div key={b.id} className={`flex justify-between p-2.5 rounded-lg ${s.pct >= 70 ? 'bg-destructive/10 border border-destructive/30' : 'bg-muted/50'}`}>
                      <span>{b.shortLabel}</span>
                      <span className="font-mono font-medium">{s.pct}%</span>
                    </div>
                  ) : null;
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PageTransition>
  );
};

export default LikertQuestionnaireForm;
