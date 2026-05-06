import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useCompanyTemplate, useTemplateQuestions } from '@/hooks/useCompanyTemplate';
import { generateArpPdf } from '@/utils/arpPdfReport';
import { fetchCompanyLogoUrl, fetchEvaluatorLabel } from '@/utils/reportBranding';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion, AnimatePresence } from 'framer-motion';


/* ─── ARP Questions ─── */
const ARP_QUESTIONS = [
  'Baixa clareza de papel/função',
  'Falta de suporte/apoio da liderança',
  'Falta de suporte/apoio da equipe',
  'Baixo reconhecimento / recompensas desproporcionais',
  'Pressão excessiva por metas',
  'Excesso de demanda / sobrecarga',
  'Baixa autonomia sobre o próprio trabalho',
  'Comunicação falha ou insuficiente',
  'Conflito interpessoal recorrente',
  'Indícios de assédio moral',
  'Ameaça ou violência (qualquer natureza)',
  'Isolamento (inclui trabalho remoto)',
  'Sobrecarga emocional',
  'Má gestão de mudanças organizacionais',
];

const SCORE_LABELS = ['0 — Adequado', '1 — Leve', '2 — Moderado', '3 — Alto'];
const QUESTIONS_PER_PAGE = 3;

/* ─── Likert Blocks ─── */
const LIKERT_BLOCKS = [
  {
    id: 'demandas', label: 'Demandas do Trabalho',
    description: 'Carga de trabalho, pressão por prazos e exigências emocionais.',
    questions: [
      'Tenho que trabalhar muito rápido para dar conta das tarefas.',
      'Meu trabalho exige muito esforço mental/concentração.',
      'Recebo demandas conflitantes de diferentes pessoas.',
      'Sinto pressão constante por prazos apertados.',
      'Meu trabalho me expõe a situações emocionalmente difíceis.',
    ],
  },
  {
    id: 'controle', label: 'Controle sobre o Trabalho',
    description: 'Autonomia, participação em decisões e uso de habilidades.',
    questions: [
      'Tenho liberdade para decidir como realizar minhas tarefas.',
      'Posso influenciar as decisões que afetam meu trabalho.',
      'Meu trabalho me permite desenvolver novas habilidades.',
      'Consigo fazer pausas quando preciso.',
      'Tenho autonomia sobre o ritmo do meu trabalho.',
    ],
  },
  {
    id: 'apoio', label: 'Apoio Social e Relações',
    description: 'Suporte de colegas e liderança, comunicação e reconhecimento.',
    questions: [
      'Recebo apoio adequado dos meus colegas de trabalho.',
      'Minha chefia me apoia quando preciso.',
      'Recebo feedback construtivo sobre meu desempenho.',
      'Sinto que meu trabalho é reconhecido/valorizado.',
      'A comunicação no meu setor funciona bem.',
    ],
  },
  {
    id: 'violencia', label: 'Violência e Assédio',
    description: 'Exposição a violência, assédio e discriminação.',
    questions: [
      'Já fui alvo de gritos, xingamentos ou humilhação no trabalho.',
      'Presenciei ou sofri intimidação/ameaça no ambiente de trabalho.',
      'Já fui discriminado(a) por gênero, raça, idade ou outra característica.',
      'Há situações de assédio moral recorrentes no meu setor.',
      'Sinto medo de represálias ao denunciar situações inadequadas.',
    ],
  },
  {
    id: 'saude', label: 'Saúde e Bem-estar',
    description: 'Impactos percebidos na saúde física e mental.',
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

const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
  transition: { duration: 0.3 },
};

interface ARPFormFieldsProps {
  assessmentId?: string;
  onSaved?: () => void;
  onCancel?: () => void;
}

const ARPFormFields = ({ assessmentId, onSaved, onCancel }: ARPFormFieldsProps) => {
  const isEdit = !!assessmentId;
  const { toast } = useToast();
  const { user } = useAuth();

  // ARP state
  const [title, setTitle] = useState('');
  const [empresaId, setEmpresaId] = useState('');
  const [setorId, setSetorId] = useState('');
  const [colaboradorId, setColaboradorId] = useState('');
  const [description, setDescription] = useState('');
  const [values, setValues] = useState<Record<number, number>>({});
  const [comments, setComments] = useState<Record<number, string>>({});

  // Likert state
  const [likertAnswers, setLikertAnswers] = useState<Record<string, number>>({});

  const [saving, setSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [autoAdvanceBlocked, setAutoAdvanceBlocked] = useState(false);

  const { data: dynamicTemplate } = useCompanyTemplate(empresaId || undefined, 'psicossocial');
  const { questions: dynamicQuestions } = useTemplateQuestions(dynamicTemplate?.id);

  const activeQuestions = useMemo(() => {
    if (dynamicQuestions.length > 0) return dynamicQuestions.map((q: any) => q.texto);
    return ARP_QUESTIONS;
  }, [dynamicQuestions]);

  const arpPages = Math.ceil(activeQuestions.length / QUESTIONS_PER_PAGE);
  const likertBlockCount = LIKERT_BLOCKS.length;
  // Steps: 0=Identification, 1..arpPages=ARP questions, arpPages+1..arpPages+likertBlockCount=Likert, last=Review
  const totalSteps = 1 + arpPages + likertBlockCount + 1;
  const likertStartStep = 1 + arpPages;
  const reviewStep = totalSteps - 1;

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
      const { data } = await supabase.from('setores').select('id, nome').eq('empresa_id', empresaId);
      return data || [];
    },
    enabled: !!empresaId,
  });

  const { data: colaboradores } = useQuery({
    queryKey: ['colaboradores-select', empresaId],
    queryFn: async () => {
      if (!empresaId) return [];
      const { data } = await supabase.from('colaboradores').select('id, nome_completo').eq('empresa_id', empresaId).eq('status', 'ativo').order('nome_completo');
      return data || [];
    },
    enabled: !!empresaId,
  });

  useEffect(() => {
    if (!isEdit || !assessmentId) return;
    const load = async () => {
      const { data } = await supabase.from('assessments').select('*').eq('id', assessmentId).single();
      if (data) {
        setTitle(data.title || '');
        setEmpresaId(data.empresa_id);
        setSetorId(data.setor_id || '');
        setColaboradorId(data.colaborador_id || '');
        setDescription(data.description || '');
      }
      const { data: items } = await supabase.from('assessment_items').select('*').eq('assessment_id', assessmentId);
      if (items) {
        const v: Record<number, number> = {};
        const c: Record<number, string> = {};
        const la: Record<string, number> = {};
        items.forEach((item) => {
          if (item.domain === 'likert') {
            la[item.question_text || ''] = item.value ?? 0;
          } else {
            v[item.question_number!] = item.value ?? 0;
            c[item.question_number!] = item.comment || '';
          }
        });
        setValues(v);
        setComments(c);
        if (Object.keys(la).length > 0) setLikertAnswers(la);
      }
    };
    load();
  }, [assessmentId, isEdit]);

  /* ─── ARP Score ─── */
  const { totalScore, classification } = useMemo(() => {
    const vals = activeQuestions.map((_, i) => values[i] ?? 0);
    const avg = vals.reduce((a, b) => a + b, 0) / activeQuestions.length;
    const score = Math.round((avg / 3) * 100 * 100) / 100;
    const cls = score <= 33 ? 'baixo' : score <= 66 ? 'moderado' : 'alto';
    return { totalScore: score, classification: cls };
  }, [values, activeQuestions]);

  const hasCritical = Object.entries(values).some(([i, v]) => {
    const idx = Number(i);
    return (idx === 9 || idx === 10) && v >= 2;
  });

  /* ─── Likert Scores ─── */
  const likertScores = useMemo(() => {
    const blockScores: Record<string, { score: number; max: number; pct: number }> = {};
    let total = 0;
    let maxTotal = 0;
    LIKERT_BLOCKS.forEach(b => {
      let bScore = 0;
      const max = b.questions.length * 5;
      b.questions.forEach((_, qi) => { bScore += likertAnswers[`${b.id}-${qi}`] ?? 0; });
      const isInverted = b.id === 'controle' || b.id === 'apoio';
      const adjusted = isInverted ? max - bScore : bScore;
      blockScores[b.id] = { score: adjusted, max, pct: Math.round((adjusted / max) * 100) };
      total += adjusted;
      maxTotal += max;
    });
    const pct = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
    const cls = pct <= 30 ? 'baixo' : pct <= 50 ? 'moderado' : pct <= 70 ? 'alto' : 'muito_alto';
    return { blockScores, total, maxTotal, classification: cls };
  }, [likertAnswers]);

  const hasViolenceAlert = useMemo(() => {
    const vBlock = LIKERT_BLOCKS.find(b => b.id === 'violencia');
    if (!vBlock) return false;
    return vBlock.questions.some((_, qi) => (likertAnswers[`violencia-${qi}`] ?? 0) >= 3);
  }, [likertAnswers]);

  const likertAnsweredCount = Object.keys(likertAnswers).length;
  const likertTotalQuestions = LIKERT_BLOCKS.reduce((s, b) => s + b.questions.length, 0);

  /* ─── Step completeness ─── */
  const isCurrentPageComplete = useMemo(() => {
    if (currentStep === 0) return !!empresaId;
    if (currentStep >= 1 && currentStep <= arpPages) {
      const pageIdx = currentStep - 1;
      const start = pageIdx * QUESTIONS_PER_PAGE;
      const end = Math.min(start + QUESTIONS_PER_PAGE, activeQuestions.length);
      for (let i = start; i < end; i++) {
        if (values[i] === undefined) return false;
      }
      return true;
    }
    if (currentStep >= likertStartStep && currentStep < reviewStep) {
      const blockIdx = currentStep - likertStartStep;
      const block = LIKERT_BLOCKS[blockIdx];
      return block.questions.every((_, qi) => likertAnswers[`${block.id}-${qi}`] !== undefined);
    }
    return true;
  }, [currentStep, empresaId, values, activeQuestions, arpPages, likertStartStep, reviewStep, likertAnswers]);

  // Auto-advance for ARP pages
  useEffect(() => {
    if (autoAdvanceBlocked) return;
    if (currentStep < 1 || currentStep > arpPages) return;
    if (isCurrentPageComplete && currentStep < totalSteps - 1) {
      const timer = setTimeout(() => setCurrentStep(s => s + 1), 400);
      return () => clearTimeout(timer);
    }
  }, [isCurrentPageComplete, currentStep, arpPages, totalSteps, autoAdvanceBlocked]);

  const handleValueChange = (questionIdx: number, val: number) => {
    setAutoAdvanceBlocked(false);
    setValues(prev => ({ ...prev, [questionIdx]: val }));
  };

  const handleLikertAnswer = (key: string, val: number) => {
    setLikertAnswers(prev => ({ ...prev, [key]: val }));
  };

  const goBack = () => {
    setAutoAdvanceBlocked(true);
    setCurrentStep(s => s - 1);
  };

  /* ─── Save ─── */
  const handleSave = async (finalize = false) => {
    if (!empresaId) { toast({ title: 'Selecione uma empresa', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      const status = finalize ? 'finalizado' as const : 'rascunho' as const;
      const data = {
        type: 'arp' as const,
        title: title || 'ARP sem título',
        empresa_id: empresaId,
        setor_id: setorId || null,
        colaborador_id: colaboradorId || null,
        description,
        status,
        score_total: totalScore,
        risk_classification: classification as 'baixo' | 'moderado' | 'alto' | 'critico',
        evaluator_id: user?.id,
        finalized_at: finalize ? new Date().toISOString() : null,
      };

      let id = assessmentId;
      if (isEdit) {
        await supabase.from('assessments').update(data).eq('id', assessmentId);
      } else {
        const { data: created, error } = await supabase.from('assessments').insert(data).select('id').single();
        if (error) throw error;
        id = created.id;
      }

      // Delete existing items and re-insert ARP + Likert items
      await supabase.from('assessment_items').delete().eq('assessment_id', id!);

      const arpItems = activeQuestions.map((q, i) => ({
        assessment_id: id,
        domain: 'psicossocial',
        question_number: i,
        question_text: q,
        value: values[i] ?? 0,
        comment: comments[i] || null,
      }));

      const likertItems: any[] = [];
      let likertIdx = activeQuestions.length;
      LIKERT_BLOCKS.forEach(block => {
        block.questions.forEach((q, qi) => {
          likertItems.push({
            assessment_id: id,
            domain: 'likert',
            question_number: likertIdx++,
            question_text: `${block.id}-${qi}`,
            value: likertAnswers[`${block.id}-${qi}`] ?? 0,
            comment: q,
          });
        });
      });

      await supabase.from('assessment_items').insert([...arpItems, ...likertItems]);

      // Save Likert summary to dedicated table too
      if (finalize && likertAnsweredCount > 0) {
        const hash = `arp-${id}-${Date.now()}`;
        await supabase.from('avaliacoes_psicossociais_likert').insert({
          empresa_id: empresaId,
          setor_id: setorId || null,
          respondente_hash: hash,
          respostas: likertAnswers as any,
          scores: likertScores.blockScores as any,
          score_total: likertScores.total,
          classificacao: likertScores.classification,
          alerta_violencia: hasViolenceAlert,
          enfermeira_id: user?.id,
          status: 'finalizado',
          finalizado_em: new Date().toISOString(),
        });
      }

      // Alert notification if violence
      if (finalize && hasViolenceAlert && user?.id) {
        const empNome = empresas?.find(e => e.id === empresaId)?.razao_social;
        await supabase.from('notifications').insert({
          user_id: user.id,
          type: 'alerta_psicossocial',
          title: '⚠️ Alerta de Violência/Assédio detectado',
          description: `ARP com indicadores críticos no bloco de violência. Empresa: ${empNome}`,
          priority: 'critical',
          entity_type: 'avaliacao_psicossocial',
          company_id: empresaId,
          action_link: '/riscos-psicossociais',
        });
      }

      toast({ title: finalize ? 'ARP finalizada com sucesso' : 'ARP salva como rascunho' });
      onSaved?.();
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
    setSaving(false);
  };

  /* ─── PDF ─── */
  const handleGeneratePdf = async () => {
    if (!isEdit || !assessmentId) {
      toast({ title: 'Salve a ARP antes de gerar o laudo', variant: 'destructive' });
      return;
    }
    try {
      const [{ data: assessment }, { data: items }] = await Promise.all([
        supabase.from('assessments').select('*').eq('id', assessmentId).single(),
        supabase.from('assessment_items').select('*').eq('assessment_id', assessmentId).order('question_number'),
      ]);
      if (!assessment) throw new Error('ARP não encontrada');

      const [empRes, setorRes, companyLogoUrl, evaluatorLabel] = await Promise.all([
        supabase.from('empresas').select('*').eq('id', assessment.empresa_id).single(),
        assessment.setor_id ? supabase.from('setores').select('nome').eq('id', assessment.setor_id).single() : Promise.resolve({ data: null } as any),
        fetchCompanyLogoUrl(assessment.empresa_id),
        fetchEvaluatorLabel(assessment.evaluator_id, user?.email || 'Equipe Técnica ERGON'),
      ]);

      const arpItems = (items || []).filter(it => it.domain !== 'likert');
      const likertItemsFromDb = (items || []).filter(it => it.domain === 'likert');

      const questions = arpItems.map((it, i) => ({
        number: i + 1,
        text: it.question_text || `Pergunta ${i + 1}`,
        value: it.value ?? 0,
        comment: it.comment || undefined,
      }));

      const hasCriticalPdf = arpItems.some(it =>
        (it.question_number === 9 || it.question_number === 10) && (it.value ?? 0) >= 2
      );

      // Rebuild Likert scores for PDF
      const likertData: Record<string, number> = {};
      likertItemsFromDb.forEach(it => {
        if (it.question_text) likertData[it.question_text] = it.value ?? 0;
      });

      const likertBlockScores: { id: string; label: string; pct: number; alerts: string[] }[] = [];
      let likertTotal = 0;
      let likertMax = 0;
      let violenceAlert = false;

      LIKERT_BLOCKS.forEach(b => {
        let bScore = 0;
        const max = b.questions.length * 5;
        const alerts: string[] = [];
        b.questions.forEach((q, qi) => {
          const val = likertData[`${b.id}-${qi}`] ?? 0;
          bScore += val;
          if (b.id === 'violencia' && val >= 3) {
            violenceAlert = true;
            alerts.push(q);
          }
          if (val >= 4) alerts.push(q);
        });
        const isInverted = b.id === 'controle' || b.id === 'apoio';
        const adjusted = isInverted ? max - bScore : bScore;
        likertBlockScores.push({ id: b.id, label: b.label, pct: Math.round((adjusted / max) * 100), alerts });
        likertTotal += adjusted;
        likertMax += max;
      });

      const likertPct = likertMax > 0 ? Math.round((likertTotal / likertMax) * 100) : 0;
      const likertClass = likertPct <= 30 ? 'baixo' : likertPct <= 50 ? 'moderado' : likertPct <= 70 ? 'alto' : 'muito_alto';

      await generateArpPdf({
        title: assessment.title || 'ARP',
        empresa: empRes.data?.razao_social || '',
        companyLogoUrl,
        cnpj: empRes.data?.cnpj || undefined,
        cnae: empRes.data?.cnae || undefined,
        grauRisco: empRes.data?.grau_risco || undefined,
        setor: setorRes.data?.nome || undefined,
        evaluator: evaluatorLabel,
        date: format(new Date(assessment.created_at), 'dd/MM/yyyy'),
        finalizedAt: assessment.finalized_at ? format(new Date(assessment.finalized_at), 'dd/MM/yyyy') : undefined,
        description: assessment.description || undefined,
        totalScore: Number(assessment.score_total) || 0,
        classification: assessment.risk_classification || 'baixo',
        hasCritical: hasCriticalPdf,
        questions,
        likert: likertItemsFromDb.length > 0 ? {
          totalPct: likertPct,
          classification: likertClass,
          blocks: likertBlockScores,
          violenceAlert,
        } : undefined,
      }, { autoDownload: true });

      toast({ title: 'Laudo PDF unificado gerado com sucesso' });
    } catch (err: any) {
      toast({ title: 'Erro ao gerar PDF', description: err.message, variant: 'destructive' });
    }
  };

  /* ─── Step label ─── */
  const getStepLabel = () => {
    if (currentStep === 0) return 'Identificação';
    if (currentStep <= arpPages) return `Fatores ARP (${currentStep}/${arpPages})`;
    if (currentStep < reviewStep) {
      const blockIdx = currentStep - likertStartStep;
      return `Likert — ${LIKERT_BLOCKS[blockIdx]?.label}`;
    }
    return 'Revisão e Ações';
  };

  const getPhaseLabel = () => {
    if (currentStep === 0) return { label: 'Identificação' };
    if (currentStep <= arpPages) return { label: 'Avaliação Técnica (ARP)' };
    if (currentStep < reviewStep) return { label: 'Questionário Likert' };
    return { label: 'Revisão Final' };
  };

  const answeredCount = Object.keys(values).length;
  const progressPercent = Math.round((currentStep / (totalSteps - 1)) * 100);
  const phase = getPhaseLabel();

  const classLabelMap: Record<string, string> = { baixo: 'Baixo', moderado: 'Moderado', alto: 'Alto', muito_alto: 'Muito Alto' };
  const classVariant = (c: string): 'secondary' | 'default' | 'destructive' =>
    c === 'baixo' ? 'secondary' : c === 'moderado' ? 'default' : 'destructive';

  return (
    <ScrollArea className="max-h-[75vh] pr-4">
      {/* Combined Score Header */}
      <div className="mb-4 rounded-xl border border-border/50 p-4 flex flex-wrap items-center gap-4" style={{ background: 'rgba(164,175,194,0.15)' }}>
        <div className="flex items-center gap-2">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">ARP Score</p>
            <p className="text-2xl font-bold text-foreground">{totalScore.toFixed(1)}</p>
          </div>
        </div>
        <Badge variant={classVariant(classification)} className="text-sm px-3 py-1">
          {classification.charAt(0).toUpperCase() + classification.slice(1)}
        </Badge>
        {hasCritical && <Badge variant="destructive" className="text-xs px-3 py-1">⚠ Item crítico</Badge>}

        {likertAnsweredCount > 0 && (
          <>
            <div className="w-px h-8 bg-border" />
            <div className="flex items-center gap-2">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Likert</p>
                <p className="text-2xl font-bold text-foreground">{likertScores.total}/{likertScores.maxTotal}</p>
              </div>
            </div>
            <Badge variant={classVariant(likertScores.classification)} className="text-sm px-3 py-1">
              {classLabelMap[likertScores.classification] || likertScores.classification}
            </Badge>
          </>
        )}

        {hasViolenceAlert && (
          <Badge variant="destructive" className="text-xs px-3 py-1">
            Alerta violência
          </Badge>
        )}
      </div>

      {/* Phase & Progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-xs font-medium text-muted-foreground">
            {phase.label} — {getStepLabel()}
          </p>
          <p className="text-xs text-muted-foreground">{progressPercent}%</p>
        </div>
        <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(164,175,194,0.3)' }}>
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* Step 0: Identification */}
        {currentStep === 0 && (
          <motion.div key="identification" {...fadeIn}>
            <div className="mb-4 rounded-xl border border-border/50 p-6" style={{ background: 'rgba(164,175,194,0.15)' }}>
              <h3 className="text-base font-semibold text-foreground mb-3">Identificação</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">Título</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: ARP Setor Administrativo" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Empresa *</Label>
                  <Select value={empresaId} onValueChange={setEmpresaId}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{empresas?.map(e => <SelectItem key={e.id} value={e.id}>{e.razao_social}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Setor</Label>
                  <Select value={setorId} onValueChange={setSetorId}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{setores?.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Colaborador</Label>
                  <Select value={colaboradorId} onValueChange={setColaboradorId}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{colaboradores?.map(c => <SelectItem key={c.id} value={c.id}>{c.nome_completo}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label className="text-xs">Observações</Label>
                  <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} />
                </div>
              </div>
            </div>

            {dynamicTemplate && dynamicQuestions.length > 0 && (
              <div className="mb-3 p-2 rounded-lg border border-primary/20 bg-primary/5">
                <p className="text-xs text-muted-foreground">
                  Formulário: <strong>{dynamicTemplate.nome}</strong> (v{dynamicTemplate.versao})
                </p>
              </div>
            )}

            <div className="flex justify-end pb-4">
              <Button onClick={() => setCurrentStep(1)} disabled={!empresaId}>
                Próximo →
              </Button>
            </div>
          </motion.div>
        )}

        {/* Steps 1..arpPages: ARP Questions */}
        {currentStep >= 1 && currentStep <= arpPages && (
          <motion.div key={`arp-page-${currentStep}`} {...fadeIn}>
            <Card className="mb-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Fatores Psicossociais — Página {currentStep} de {arpPages}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(() => {
                    const pageIdx = currentStep - 1;
                    const start = pageIdx * QUESTIONS_PER_PAGE;
                    const end = Math.min(start + QUESTIONS_PER_PAGE, activeQuestions.length);
                    return activeQuestions.slice(start, end).map((q: string, idx: number) => {
                      const i = start + idx;
                      return (
                        <div key={i} className="border-b pb-3 last:border-b-0 last:pb-0">
                          <p className="text-sm font-medium text-foreground mb-2">{i + 1}) {q}</p>
                          <div className="flex flex-wrap gap-2 mb-2">
                            {SCORE_LABELS.map((label, val) => (
                              <Button key={val} type="button" variant={values[i] === val ? 'default' : 'outline'} size="sm"
                                className="min-w-[110px]" onClick={() => handleValueChange(i, val)}>{label}</Button>
                            ))}
                          </div>
                          <Input placeholder="Observação (opcional)" value={comments[i] || ''} onChange={e => setComments(prev => ({ ...prev, [i]: e.target.value }))} className="mt-1" />
                        </div>
                      );
                    });
                  })()}
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between pb-4">
              <Button variant="outline" onClick={goBack}>
                ← Anterior
              </Button>
              <Button onClick={() => setCurrentStep(s => s + 1)} disabled={!isCurrentPageComplete}>
                Próximo →
              </Button>
            </div>
          </motion.div>
        )}

        {/* Likert Blocks */}
        {currentStep >= likertStartStep && currentStep < reviewStep && (
          <motion.div key={`likert-${currentStep}`} {...fadeIn}>
            {(() => {
              const blockIdx = currentStep - likertStartStep;
              const block = LIKERT_BLOCKS[blockIdx];
              return (
                <Card className="mb-4">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{block.label}</CardTitle>
                      <Badge variant="secondary" className="text-[10px]">Likert {blockIdx + 1}/{likertBlockCount}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{block.description}</p>
                  </CardHeader>
                  <CardContent>
                    {block.id === 'violencia' && (
                      <div className="mb-4 p-3 rounded-lg border border-destructive/30 bg-destructive/5">
                        <p className="text-xs text-destructive font-medium">
                          Bloco sensível — respostas ≥ 3 geram alerta automático
                        </p>
                      </div>
                    )}

                    <div className="space-y-4">
                      {block.questions.map((q, qi) => {
                        const key = `${block.id}-${qi}`;
                        const selected = likertAnswers[key];
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
                                  onClick={() => handleLikertAnswer(key, opt.value)}
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
              );
            })()}

            <div className="flex justify-between pb-4">
              <Button variant="outline" onClick={goBack}>
                ← Anterior
              </Button>
              <Button onClick={() => setCurrentStep(s => s + 1)} disabled={!isCurrentPageComplete}>
                {currentStep === reviewStep - 1 ? 'Ver Revisão' : 'Próximo'} →
              </Button>
            </div>
          </motion.div>
        )}

        {/* Review Step */}
        {currentStep === reviewStep && (
          <motion.div key="review" {...fadeIn}>
            {/* Violence alert banner */}
            {hasViolenceAlert && (
              <Card className="mb-4 border-destructive/50 bg-destructive/5">
                <CardContent className="p-4">
                  <p className="text-sm font-semibold text-destructive">Alerta Imediato — Violência/Assédio</p>
                  <p className="text-xs text-muted-foreground mt-1">Respostas no bloco de Violência indicam exposição significativa. Notificação automática será enviada ao finalizar.</p>
                </CardContent>
              </Card>
            )}

            {/* ARP Review */}
            <Card className="mb-4">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">ARP — Fatores Psicossociais</CardTitle>
                  <Badge variant={classVariant(classification)} className="text-xs">{totalScore.toFixed(1)} — {classification}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                  {activeQuestions.map((_q: string, i: number) => (
                    <div key={i} className="flex items-center gap-2 p-1.5 rounded bg-muted/50">
                      <span className="text-xs text-muted-foreground w-5">{i + 1})</span>
                      <Badge variant={
                        (values[i] ?? 0) === 0 ? 'secondary' :
                        (values[i] ?? 0) === 1 ? 'secondary' :
                        (values[i] ?? 0) === 2 ? 'default' : 'destructive'
                      } className="text-xs">
                        {values[i] ?? 0}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Likert Review */}
            {likertAnsweredCount > 0 && (
              <Card className="mb-4">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Questionário Likert</CardTitle>
                    <Badge variant={classVariant(likertScores.classification)} className="text-xs">
                      {likertScores.total}/{likertScores.maxTotal} — {classLabelMap[likertScores.classification]}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {LIKERT_BLOCKS.map(b => {
                      const s = likertScores.blockScores[b.id];
                      if (!s) return null;
                      const isHigh = s.pct >= 70;
                      return (
                        <div key={b.id} className={`flex justify-between items-center p-2.5 rounded-lg ${isHigh ? 'bg-destructive/10 border border-destructive/30' : 'bg-muted/50'}`}>
                          <span className="text-sm">{b.label}</span>
                          <span className="font-mono font-medium text-sm">{s.pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex flex-wrap gap-3 pb-4">
              <Button variant="outline" onClick={goBack}>
                ← Anterior
              </Button>
              {onCancel && <Button variant="outline" onClick={onCancel}>Cancelar</Button>}
              <Button variant="secondary" onClick={() => handleSave(false)} disabled={saving}>Salvar Rascunho</Button>
              <Button onClick={() => handleSave(true)} disabled={saving}>Finalizar ARP</Button>
              {isEdit && <Button variant="outline" onClick={handleGeneratePdf}>Gerar Laudo PDF</Button>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </ScrollArea>
  );
};

export default ARPFormFields;
