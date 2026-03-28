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
import { ChevronLeft, ChevronRight } from 'lucide-react';

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

  const [title, setTitle] = useState('');
  const [empresaId, setEmpresaId] = useState('');
  const [setorId, setSetorId] = useState('');
  const [colaboradorId, setColaboradorId] = useState('');
  const [description, setDescription] = useState('');
  const [values, setValues] = useState<Record<number, number>>({});
  const [comments, setComments] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [autoAdvanceBlocked, setAutoAdvanceBlocked] = useState(false);
  // step 0 = Identification, step 1..N = question pages, step N+1 = review/actions

  const { data: dynamicTemplate } = useCompanyTemplate(empresaId || undefined, 'psicossocial');
  const { questions: dynamicQuestions } = useTemplateQuestions(dynamicTemplate?.id);

  const activeQuestions = useMemo(() => {
    if (dynamicQuestions.length > 0) {
      return dynamicQuestions.map((q: any) => q.texto);
    }
    return ARP_QUESTIONS;
  }, [dynamicQuestions]);

  const totalPages = Math.ceil(activeQuestions.length / QUESTIONS_PER_PAGE);
  const totalSteps = 1 + totalPages + 1; // identification + question pages + review

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
        items.forEach((item) => { v[item.question_number!] = item.value ?? 0; c[item.question_number!] = item.comment || ''; });
        setValues(v);
        setComments(c);
      }
    };
    load();
  }, [assessmentId, isEdit]);

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

  // Check if current question page is fully answered
  const isCurrentPageComplete = useMemo(() => {
    if (currentStep === 0) return !!empresaId;
    if (currentStep > totalPages) return true;
    const pageIdx = currentStep - 1;
    const start = pageIdx * QUESTIONS_PER_PAGE;
    const end = Math.min(start + QUESTIONS_PER_PAGE, activeQuestions.length);
    for (let i = start; i < end; i++) {
      if (values[i] === undefined) return false;
    }
    return true;
  }, [currentStep, empresaId, values, activeQuestions, totalPages]);

  // Auto-advance when last question of page is answered
  useEffect(() => {
    if (currentStep === 0 || currentStep > totalPages) return;
    if (isCurrentPageComplete && currentStep < totalSteps - 1) {
      const timer = setTimeout(() => setCurrentStep((s) => s + 1), 400);
      return () => clearTimeout(timer);
    }
  }, [isCurrentPageComplete, currentStep, totalPages, totalSteps]);

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

      await supabase.from('assessment_items').delete().eq('assessment_id', id!);
      const items = activeQuestions.map((q, i) => ({
        assessment_id: id,
        domain: 'psicossocial',
        question_number: i,
        question_text: q,
        value: values[i] ?? 0,
        comment: comments[i] || null,
      }));
      await supabase.from('assessment_items').insert(items);

      toast({ title: finalize ? 'ARP finalizada' : 'ARP salva como rascunho' });
      onSaved?.();
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
    setSaving(false);
  };

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

      const questions = (items || []).map((it, i) => ({
        number: i + 1,
        text: it.question_text || `Pergunta ${i + 1}`,
        value: it.value ?? 0,
        comment: it.comment || undefined,
      }));

      const hasCriticalPdf = (items || []).some((it) => {
        return (it.question_number === 9 || it.question_number === 10) && (it.value ?? 0) >= 2;
      });

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
      }, { autoDownload: true });

      toast({ title: 'Laudo PDF da ARP gerado com sucesso' });
    } catch (err: any) {
      toast({ title: 'Erro ao gerar PDF', description: err.message, variant: 'destructive' });
    }
  };

  const getStepLabel = () => {
    if (currentStep === 0) return 'Identificação';
    if (currentStep <= totalPages) return `Fatores Psicossociais (${currentStep}/${totalPages})`;
    return 'Revisão e Ações';
  };

  const answeredCount = Object.keys(values).length;
  const progressPercent = Math.round((currentStep / (totalSteps - 1)) * 100);

  return (
    <ScrollArea className="max-h-[75vh] pr-4">
      {/* Score */}
      <Card className="mb-4 border-2 border-primary/20">
        <CardContent className="p-4 flex flex-wrap items-center gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Score</p>
            <p className="text-3xl font-bold">{totalScore.toFixed(1)}</p>
          </div>
          <Badge variant={classification === 'baixo' ? 'secondary' : classification === 'moderado' ? 'default' : 'destructive'} className="text-sm px-3 py-1">
            {classification.charAt(0).toUpperCase() + classification.slice(1)}
          </Badge>
          {hasCritical && <Badge variant="destructive" className="text-xs px-3 py-1">Alerta confidencial — item crítico</Badge>}
        </CardContent>
      </Card>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-xs font-medium text-muted-foreground">{getStepLabel()}</p>
          <p className="text-xs text-muted-foreground">{answeredCount}/{activeQuestions.length} respondidas</p>
        </div>
        <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
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
            <Card className="mb-4">
              <CardHeader className="pb-3"><CardTitle className="text-base">Identificação</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs">Título</Label>
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: ARP Setor Administrativo" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Empresa *</Label>
                    <Select value={empresaId} onValueChange={setEmpresaId}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>{empresas?.map((e) => <SelectItem key={e.id} value={e.id}>{e.razao_social}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Setor</Label>
                    <Select value={setorId} onValueChange={setSetorId}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>{setores?.map((s) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Colaborador</Label>
                    <Select value={colaboradorId} onValueChange={setColaboradorId}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>{colaboradores?.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome_completo}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <Label className="text-xs">Observações</Label>
                    <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Dynamic template indicator */}
            {dynamicTemplate && dynamicQuestions.length > 0 && (
              <div className="mb-3 p-2 rounded-lg border border-primary/20 bg-primary/5">
                <p className="text-xs text-muted-foreground">
                  📋 Formulário: <strong>{dynamicTemplate.nome}</strong> (v{dynamicTemplate.versao})
                </p>
              </div>
            )}

            <div className="flex justify-end pb-4">
              <Button onClick={() => setCurrentStep(1)} disabled={!empresaId}>
                Próximo <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* Steps 1..N: Question pages */}
        {currentStep >= 1 && currentStep <= totalPages && (
          <motion.div key={`questions-page-${currentStep}`} {...fadeIn}>
            <Card className="mb-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  Fatores Psicossociais — Página {currentStep} de {totalPages}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-5">
                  {(() => {
                    const pageIdx = currentStep - 1;
                    const start = pageIdx * QUESTIONS_PER_PAGE;
                    const end = Math.min(start + QUESTIONS_PER_PAGE, activeQuestions.length);
                    return activeQuestions.slice(start, end).map((q: string, idx: number) => {
                      const i = start + idx;
                      return (
                        <div key={i} className="border-b pb-4 last:border-b-0 last:pb-0">
                          <p className="text-sm font-medium mb-3">{i + 1}) {q}</p>
                          <div className="flex flex-wrap gap-2 mb-2">
                            {SCORE_LABELS.map((label, val) => (
                              <Button key={val} type="button" variant={values[i] === val ? 'default' : 'outline'} size="sm"
                                className="min-w-[110px]"
                                onClick={() => setValues((prev) => ({ ...prev, [i]: val }))}>{label}</Button>
                            ))}
                          </div>
                          <Input placeholder="Observação (opcional)" value={comments[i] || ''} onChange={(e) => setComments((prev) => ({ ...prev, [i]: e.target.value }))} className="mt-1" />
                        </div>
                      );
                    });
                  })()}
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between pb-4">
              <Button variant="outline" onClick={() => setCurrentStep((s) => s - 1)}>
                <ChevronLeft className="mr-1 h-4 w-4" /> Anterior
              </Button>
              <Button onClick={() => setCurrentStep((s) => s + 1)} disabled={!isCurrentPageComplete}>
                Próximo <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* Last step: Review & Actions */}
        {currentStep > totalPages && (
          <motion.div key="review" {...fadeIn}>
            <Card className="mb-4">
              <CardHeader className="pb-3"><CardTitle className="text-base">Revisão</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                  {activeQuestions.map((q: string, i: number) => (
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

            <div className="flex flex-wrap gap-3 pb-4">
              <Button variant="outline" onClick={() => setCurrentStep((s) => s - 1)}>
                <ChevronLeft className="mr-1 h-4 w-4" /> Anterior
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
