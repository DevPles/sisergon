import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { generateAetPdf } from '@/utils/aetPdfReport';
import { fetchCompanyLogoUrl, fetchEvaluatorLabel } from '@/utils/reportBranding';
import { useCompanyTemplate, useTemplateQuestions } from '@/hooks/useCompanyTemplate';
import { ChevronLeft, ChevronRight, Check, CircleDot, Circle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── NR-17 Compliant AET Structure ────────────────────────────────────────────

const AET_SECTIONS = [
  {
    key: 'demanda',
    label: '1. Demanda e Contextualização',
    description: 'Origem da demanda, contexto organizacional e reformulação do problema (NR-17 item 17.1.2)',
    subsections: [
      { key: 'origem_demanda', label: 'Origem da demanda', placeholder: 'Ex: Resultado da AEP com score alto no setor X, queixa dos trabalhadores, afastamentos por LER/DORT, solicitação do SESMT/CIPA, cumprimento de notificação...' },
      { key: 'contexto_organizacional', label: 'Contexto organizacional', placeholder: 'Descreva o ramo de atividade, porte da empresa, número de trabalhadores no setor, turnos, histórico de produção, mudanças recentes...' },
      { key: 'reformulacao_problema', label: 'Reformulação do problema', placeholder: 'Reformule a demanda inicial à luz da análise preliminar. Quais hipóteses serão investigadas? Quais são os determinantes a serem analisados?' },
      { key: 'populacao_alvo', label: 'População-alvo', placeholder: 'Caracterize a população: número de trabalhadores, faixa etária, sexo, tempo na função, escolaridade, vínculo empregatício...' },
    ],
  },
  {
    key: 'analise_atividade',
    label: '2. Análise da Atividade de Trabalho',
    description: 'Análise do trabalho real, organização, conteúdo das tarefas e exigências (NR-17 item 17.1.1)',
    subsections: [
      { key: 'tarefa_prescrita', label: 'Tarefa prescrita vs. trabalho real', placeholder: 'Compare o que é prescrito (procedimentos, normas, metas) com a atividade efetivamente realizada. Identifique variabilidades, regulações, estratégias operatórias...' },
      { key: 'organizacao_trabalho', label: 'Organização do trabalho (NR-17 item 17.6)', placeholder: 'Normas de produção, modo operatório, exigências de tempo, ritmo, conteúdo das tarefas, pausas, turnos, jornada, horas extras, rodízios, autonomia do trabalhador...' },
      { key: 'mobiliario_equipamentos', label: 'Mobiliário e equipamentos (NR-17 item 17.3)', placeholder: 'Descreva postos de trabalho, dimensões, ajustes, ferramentas, telas/monitores, teclados, cadeiras, bancadas, equipamentos de transporte...' },
      { key: 'condicoes_ambientais', label: 'Condições ambientais (NR-17 item 17.5)', placeholder: 'Nível de ruído, iluminação (lux), temperatura (IBUTG), umidade, ventilação, vibração, qualidade do ar, condições de conforto...' },
      { key: 'exigencias_fisicas', label: 'Exigências físicas e biomecânicas', placeholder: 'Posturas adotadas, movimentos repetitivos, esforços musculares, manuseio de cargas, ciclos de trabalho, tempos de exposição...' },
      { key: 'exigencias_cognitivas', label: 'Exigências cognitivas e psíquicas', placeholder: 'Atenção sustentada, tomada de decisão, pressão temporal, monotonia, sobrecarga mental, complexidade da tarefa, responsabilidade, relações interpessoais...' },
    ],
  },
  {
    key: 'metodos',
    label: '3. Métodos e Técnicas Utilizadas',
    description: 'Justificativa metodológica da análise ergonômica (NR-17 item 17.1.1.1)',
    subsections: [
      { key: 'abordagem_metodologica', label: 'Abordagem metodológica', placeholder: 'Descreva a abordagem: AET guiada pela Ergonomia da Atividade, análise sistêmica, global/focalizada. Justifique a escolha...' },
      { key: 'tecnicas_coleta', label: 'Técnicas de coleta de dados', placeholder: 'Observação sistemática (aberta/armada), entrevistas (individuais/coletivas), questionários aplicados, análise documental, autoconfrontação...' },
      { key: 'instrumentos', label: 'Instrumentos e ferramentas', placeholder: 'Filmagens, fotografias, cronometragem, medições ambientais (luxímetro, decibelímetro, termômetro de globo), softwares de análise postural (RULA, REBA, OWAS, NIOSH)...' },
      { key: 'periodo_analise', label: 'Período e duração da análise', placeholder: 'Datas das visitas, duração total da observação, turnos observados, número de trabalhadores acompanhados...' },
    ],
  },
  {
    key: 'diagnostico',
    label: '4. Diagnóstico Ergonômico',
    description: 'Síntese dos determinantes, fatores de risco e suas inter-relações',
    subsections: [
      { key: 'sintese_resultados', label: 'Síntese dos resultados', placeholder: 'Apresente os principais achados, correlacionando os dados coletados. Quais são os fatores determinantes dos problemas identificados?' },
      { key: 'fatores_risco', label: 'Fatores de risco identificados', placeholder: 'Liste e classifique os fatores de risco: biomecânicos, organizacionais, ambientais, cognitivos, psicossociais. Priorize por gravidade e probabilidade...' },
      { key: 'relacao_saude', label: 'Relação com a saúde dos trabalhadores', placeholder: 'Correlacione os achados com queixas, afastamentos, CATs, dados epidemiológicos. Quais condições de trabalho explicam os agravos observados?' },
      { key: 'pontos_positivos', label: 'Pontos positivos identificados', placeholder: 'Destaque boas práticas, estratégias operatórias eficientes, condições adequadas já existentes...' },
    ],
  },
  {
    key: 'recomendacoes',
    label: '5. Recomendações e Plano de Ação',
    description: 'Soluções técnicas com hierarquia de controle e cronograma',
    subsections: [
      { key: 'rec_imediatas', label: 'Ações imediatas (0–30 dias)', placeholder: 'Quick wins: ajustes de mobiliário, reorganização do layout, introdução de pausas, treinamentos emergenciais...' },
      { key: 'rec_curto_prazo', label: 'Ações de curto prazo (30–90 dias)', placeholder: 'Adequação de equipamentos, redesenho de postos, implementação de rodízios, revisão de normas operatórias...' },
      { key: 'rec_medio_prazo', label: 'Ações de médio/longo prazo (90+ dias)', placeholder: 'Projetos de engenharia, aquisição de equipamentos, mudanças organizacionais estruturais, automação de processos...' },
      { key: 'hierarquia_controle', label: 'Hierarquia de controle aplicada', placeholder: 'Descreva como as recomendações seguem a hierarquia: eliminação > substituição > controles de engenharia > controles administrativos > EPIs...' },
    ],
  },
  {
    key: 'restituicao',
    label: '6. Restituição e Validação',
    description: 'Participação dos trabalhadores e validação social dos resultados (NR-17 item 17.3.3)',
    subsections: [
      { key: 'participacao_trabalhadores', label: 'Participação dos trabalhadores', placeholder: 'Como os trabalhadores participaram da análise? Foram ouvidos, validaram observações, contribuíram com soluções?' },
      { key: 'validacao_resultados', label: 'Validação dos resultados', placeholder: 'Como os resultados foram apresentados e validados com trabalhadores, gestores, CIPA, SESMT? Houve sessões de restituição? Quais foram os feedbacks?' },
      { key: 'acompanhamento', label: 'Plano de acompanhamento', placeholder: 'Cronograma de reavaliação, indicadores de eficácia das medidas, responsáveis pelo monitoramento, periodicidade de revisão...' },
    ],
  },
];

const NR17_CHECKLIST = [
  { key: 'mobiliario_adequado', label: 'Mobiliário atende aos requisitos dimensionais (17.3)' },
  { key: 'equipamentos_adequados', label: 'Equipamentos de trabalho adaptados às características do trabalhador (17.4)' },
  { key: 'condicoes_ambientais_ok', label: 'Condições ambientais de conforto verificadas (17.5)' },
  { key: 'organizacao_adequada', label: 'Organização do trabalho avaliada e compatível (17.6)' },
  { key: 'levantamento_cargas', label: 'Levantamento, transporte e descarga de materiais avaliados (17.2)' },
  { key: 'trabalho_telas', label: 'Trabalho com máquinas, equipamentos e ferramentas avaliado (17.4)' },
  { key: 'pausas_adequadas', label: 'Pausas e alternância de atividades adequadas' },
  { key: 'treinamento_realizado', label: 'Treinamento e orientação aos trabalhadores realizados' },
  { key: 'participacao_trabalhadores', label: 'Trabalhadores participaram da análise e validação' },
  { key: 'medidas_propostas', label: 'Medidas de prevenção e correção propostas' },
];

const extractAetDescriptionEntries = (description?: string | null) => {
  const raw = (description || '').trim();
  if (!raw) return [] as { title: string; content: string }[];

  const parsed = raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const separatorIdx = line.indexOf(':');
      if (separatorIdx <= 0) return null;
      const title = line.slice(0, separatorIdx).trim();
      const content = line.slice(separatorIdx + 1).trim();
      if (!title || !content) return null;
      return { title, content };
    })
    .filter((entry): entry is { title: string; content: string } => !!entry);

  if (parsed.length > 0) return parsed;
  return [{ title: 'Descrição técnica da AET', content: raw }];
};

const AETForm = () => {
  const { id } = useParams();
  const isEdit = !!id && id !== 'nova';
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [title, setTitle] = useState('');
  const [empresaId, setEmpresaId] = useState('');
  const [unidadeId, setUnidadeId] = useState('');
  const [setorId, setSetorId] = useState('');
  const [cargoId, setCargoId] = useState('');
  const [colaboradorId, setColaboradorId] = useState('');
  const [sections, setSections] = useState<Record<string, string>>({});
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  const allSteps = useMemo(() => [
    ...AET_SECTIONS.map(s => ({ type: 'section' as const, key: s.key, label: s.label.split('.')[0] + '.' })),
    { type: 'checklist' as const, key: 'checklist', label: 'Check' },
  ], []);

  // Dynamic template for AET
  const { data: dynamicTemplate } = useCompanyTemplate(empresaId || undefined, 'aet');
  const { questions: dynamicQuestions, sections: dynamicSections } = useTemplateQuestions(dynamicTemplate?.id);

  // Data queries
  const { data: empresas } = useQuery({
    queryKey: ['empresas-select'],
    queryFn: async () => {
      const { data } = await supabase.from('empresas').select('id, razao_social, cnpj, cnae, grau_risco').order('razao_social');
      return data || [];
    },
  });

  const { data: unidades } = useQuery({
    queryKey: ['unidades-select', empresaId],
    queryFn: async () => {
      if (!empresaId) return [];
      const { data } = await supabase.from('unidades').select('id, nome, endereco').eq('empresa_id', empresaId);
      return data || [];
    },
    enabled: !!empresaId,
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

  const { data: cargos } = useQuery({
    queryKey: ['cargos-select', empresaId],
    queryFn: async () => {
      if (!empresaId) return [];
      const { data } = await supabase.from('cargos').select('id, nome, cbo').eq('empresa_id', empresaId);
      return data || [];
    },
    enabled: !!empresaId,
  });

  const { data: colaboradores } = useQuery({
    queryKey: ['colaboradores-select', empresaId],
    queryFn: async () => {
      if (!empresaId) return [];
      const { data } = await supabase.from('colaboradores').select('id, nome_completo, matricula').eq('empresa_id', empresaId).eq('status', 'ativo');
      return data || [];
    },
    enabled: !!empresaId,
  });

  const selectedEmpresa = empresas?.find(e => e.id === empresaId);

  // Load existing
  useEffect(() => {
    if (!isEdit) return;
    const load = async () => {
      const { data } = await supabase.from('assessments').select('*').eq('id', id).single();
      if (data) {
        setTitle(data.title || '');
        setEmpresaId(data.empresa_id);
        setUnidadeId(data.unidade_id || '');
        setSetorId(data.setor_id || '');
        setCargoId(data.cargo_id || '');
        setColaboradorId(data.colaborador_id || '');
        const { data: items } = await supabase.from('assessment_items').select('*').eq('assessment_id', id);
        if (items) {
          const s: Record<string, string> = {};
          const c: Record<string, boolean> = {};
          items.forEach((item) => {
            if (item.domain === 'checklist_nr17') {
              c[item.question_text] = item.value === 1;
            } else {
              s[item.domain] = item.comment || '';
            }
          });
          setSections(s);
          setChecklist(c);
        }
      }
    };
    load();
  }, [id, isEdit]);

  // Progress calculation
  const totalFields = AET_SECTIONS.reduce((acc, s) => acc + s.subsections.length, 0) + NR17_CHECKLIST.length;
  const filledFields = AET_SECTIONS.reduce((acc, s) => acc + s.subsections.filter(sub => (sections[sub.key] || '').trim().length > 0).length, 0)
    + NR17_CHECKLIST.filter(c => checklist[c.key]).length;
  const progress = Math.round((filledFields / totalFields) * 100);

  const isSectionComplete = (idx: number) => {
    if (idx < AET_SECTIONS.length) {
      return AET_SECTIONS[idx].subsections.every(sub => (sections[sub.key] || '').trim().length > 0);
    }
    return NR17_CHECKLIST.filter(c => checklist[c.key]).length >= Math.ceil(NR17_CHECKLIST.length * 0.5);
  };

  const unlockedUpTo = useMemo(() => {
    let last = 0;
    for (let i = 0; i < allSteps.length; i++) {
      if (isSectionComplete(i)) last = i + 1;
      else break;
    }
    return last;
  }, [sections, checklist, allSteps]);


  const currentSectionData = activeStep < AET_SECTIONS.length ? AET_SECTIONS[activeStep] : null;

  const handleSave = async (finalize = false) => {
    if (!empresaId) {
      toast({ title: 'Selecione uma empresa', variant: 'destructive' });
      return;
    }
    if (finalize && progress < 60) {
      toast({ title: 'Preencha pelo menos 60% dos campos para finalizar', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const status = finalize ? 'finalizado' as const : 'rascunho' as const;
      const assessmentData = {
        type: 'aet' as const,
        title: title || 'AET sem título',
        empresa_id: empresaId,
        unidade_id: unidadeId || null,
        setor_id: setorId || null,
        cargo_id: cargoId || null,
        colaborador_id: colaboradorId || null,
        description: AET_SECTIONS.map(s => `${s.label}\n${s.subsections.map(sub => `${sub.label}: ${sections[sub.key] || ''}`).join('\n')}`).join('\n\n'),
        status,
        evaluator_id: user?.id,
        finalized_at: finalize ? new Date().toISOString() : null,
      };

      let assessmentId = id;
      if (isEdit) {
        await supabase.from('assessments').update(assessmentData).eq('id', id);
      } else {
        const { data, error } = await supabase.from('assessments').insert(assessmentData).select('id').single();
        if (error) throw error;
        assessmentId = data.id;
      }

      await supabase.from('assessment_items').delete().eq('assessment_id', assessmentId!);

      const items: any[] = [];
      let qNum = 0;
      AET_SECTIONS.forEach((section) => {
        section.subsections.forEach((sub) => {
          items.push({
            assessment_id: assessmentId,
            domain: sub.key,
            question_number: qNum++,
            question_text: sub.label,
            value: (sections[sub.key] || '').trim().length > 0 ? 1 : 0,
            comment: sections[sub.key] || '',
          });
        });
      });

      NR17_CHECKLIST.forEach((c) => {
        items.push({
          assessment_id: assessmentId,
          domain: 'checklist_nr17',
          question_number: qNum++,
          question_text: c.key,
          value: checklist[c.key] ? 1 : 0,
          comment: c.label,
        });
      });

      await supabase.from('assessment_items').insert(items);

      toast({ title: finalize ? 'AET finalizada com sucesso' : 'AET salva como rascunho' });
      navigate('/aet');
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' });
    }
    setSaving(false);
  };

  const handleGeneratePdf = async () => {
    if (!isEdit) {
      toast({ title: 'Salve a AET antes de gerar o laudo', variant: 'destructive' });
      return;
    }

    try {
      const assessmentId = id as string;
      const { data: assessmentData, error: assessmentError } = await supabase
        .from('assessments')
        .select('*')
        .eq('id', assessmentId)
        .single();

      if (assessmentError || !assessmentData) {
        throw assessmentError || new Error('AET não encontrada.');
      }

      const [itemsRes, empRes, unidadeRes, setorRes, cargoRes, colaboradorRes, companyLogoUrl, evaluatorLabel] = await Promise.all([
        supabase.from('assessment_items').select('*').eq('assessment_id', assessmentData.id),
        supabase.from('empresas').select('*').eq('id', assessmentData.empresa_id).single(),
        assessmentData.unidade_id ? supabase.from('unidades').select('nome').eq('id', assessmentData.unidade_id).single() : Promise.resolve({ data: null, error: null } as any),
        assessmentData.setor_id ? supabase.from('setores').select('nome').eq('id', assessmentData.setor_id).single() : Promise.resolve({ data: null, error: null } as any),
        assessmentData.cargo_id ? supabase.from('cargos').select('nome, cbo').eq('id', assessmentData.cargo_id).single() : Promise.resolve({ data: null, error: null } as any),
        assessmentData.colaborador_id ? supabase.from('colaboradores').select('nome_completo').eq('id', assessmentData.colaborador_id).single() : Promise.resolve({ data: null, error: null } as any),
        fetchCompanyLogoUrl(assessmentData.empresa_id),
        fetchEvaluatorLabel(assessmentData.evaluator_id, user?.email || 'Equipe Técnica ERGON'),
      ]);

      if (itemsRes.error) throw itemsRes.error;
      if (empRes.error) throw empRes.error;

      const items = itemsRes.data || [];

      const checklistEntries = items
        .filter((it) => it.domain === 'checklist_nr17')
        .map((it) => ({
          label: it.comment || it.question_text,
          checked: (it.value ?? 0) === 1,
        }));

      const sectionEntriesFromItems = items
        .filter((it) => it.domain !== 'checklist_nr17' && (it.comment || '').trim().length > 0)
        .map((it) => ({
          title: it.question_text,
          content: it.comment || '',
        }));

      const sectionEntriesFromDescription = extractAetDescriptionEntries(assessmentData.description);

      const normalizedSectionEntries = sectionEntriesFromItems.length > 0
        ? sectionEntriesFromItems
        : sectionEntriesFromDescription.length > 0
          ? sectionEntriesFromDescription
          : [{ title: 'Descrição técnica da AET', content: 'Sem conteúdo detalhado salvo para esta AET.' }];

      const normalizedChecklist = checklistEntries.length > 0
        ? checklistEntries
        : [{ label: 'Checklist NR-17 não registrado nesta avaliação', checked: false }];

      const completionPercent = normalizedChecklist.length
        ? Math.round((normalizedChecklist.filter((item) => item.checked).length / normalizedChecklist.length) * 100)
        : undefined;

      await generateAetPdf({
        title: assessmentData.title || 'AET sem título',
        empresa: empRes.data?.razao_social || '',
        companyLogoUrl,
        cnpj: empRes.data?.cnpj || undefined,
        cnae: empRes.data?.cnae || undefined,
        grauRisco: empRes.data?.grau_risco || undefined,
        unidade: unidadeRes.data?.nome || undefined,
        setor: setorRes.data?.nome || undefined,
        cargo: cargoRes.data?.nome || undefined,
        cbo: cargoRes.data?.cbo || undefined,
        colaborador: colaboradorRes.data?.nome_completo || undefined,
        evaluator: evaluatorLabel,
        date: format(new Date(assessmentData.created_at), 'dd/MM/yyyy'),
        finalizedAt: assessmentData.finalized_at ? format(new Date(assessmentData.finalized_at), 'dd/MM/yyyy') : undefined,
        completionPercent,
        sectionEntries: normalizedSectionEntries,
        checklist: normalizedChecklist,
      }, {
        autoDownload: true,
      });

      toast({ title: 'Laudo AET gerado com sucesso' });
    } catch (err: any) {
      toast({ title: 'Erro ao gerar PDF da AET', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{isEdit ? 'Editar AET' : 'Nova Análise Ergonômica do Trabalho'}</h1>
          <p className="text-muted-foreground">Conforme NR-17 item 17.1.2 / 17.3.3 — Portaria MTP nº 423/2021</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/aet')}>Voltar</Button>
      </div>

      {/* Progress bar & stepper */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-muted-foreground">
            Seção {activeStep + 1} de {allSteps.length}
          </p>
          <p className="text-sm text-muted-foreground">{progress}% concluído — {filledFields}/{totalFields} campos</p>
        </div>
        <Progress value={progress} className="h-2" />
        <div className="flex gap-1.5 mt-3 flex-wrap">
          {allSteps.map((step, idx) => {
            const complete = isSectionComplete(idx);
            const unlocked = idx <= unlockedUpTo;
            const isCurrent = idx === activeStep;
            return (
              <button
                key={step.key}
                onClick={() => unlocked && setActiveStep(idx)}
                disabled={!unlocked}
                className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-all ${
                  isCurrent
                    ? 'bg-primary text-primary-foreground border-primary'
                    : complete
                    ? 'bg-primary/10 text-primary border-primary/30 hover:bg-primary/20'
                    : unlocked
                    ? 'bg-muted text-muted-foreground border-border hover:bg-accent'
                    : 'bg-muted/50 text-muted-foreground/40 border-transparent cursor-not-allowed'
                }`}
              >
                {complete ? <Check className="h-3 w-3" /> : isCurrent ? <CircleDot className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
                {step.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Identification */}
      <Card className="mb-6">
        <CardHeader><CardTitle>Identificação da Situação de Trabalho</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Título da AET</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: AET Linha de Montagem — Turno A" />
            </div>
            <div className="space-y-2">
              <Label>Empresa *</Label>
              <Select value={empresaId} onValueChange={(v) => { setEmpresaId(v); setUnidadeId(''); setSetorId(''); setCargoId(''); setColaboradorId(''); }}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{empresas?.map((e) => <SelectItem key={e.id} value={e.id}>{e.razao_social}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Unidade</Label>
              <Select value={unidadeId} onValueChange={setUnidadeId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{unidades?.map((u) => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Setor</Label>
              <Select value={setorId} onValueChange={setSetorId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{setores?.map((s) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Cargo / Função</Label>
              <Select value={cargoId} onValueChange={setCargoId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{cargos?.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}{c.cbo ? ` (CBO: ${c.cbo})` : ''}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Colaborador de referência</Label>
              <Select value={colaboradorId} onValueChange={setColaboradorId}>
                <SelectTrigger><SelectValue placeholder="Selecione (opcional)" /></SelectTrigger>
                <SelectContent>{colaboradores?.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome_completo}{c.matricula ? ` — ${c.matricula}` : ''}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          {selectedEmpresa && (
            <>
              <Separator className="my-4" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">CNPJ</p>
                  <p className="font-medium">{selectedEmpresa.cnpj || '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">CNAE</p>
                  <p className="font-medium">{selectedEmpresa.cnae || '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Grau de Risco</p>
                  <p className="font-medium">{selectedEmpresa.grau_risco ?? '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Avaliador</p>
                  <p className="font-medium">{user?.email || '—'}</p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Active section content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeStep}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.2 }}
        >
          {currentSectionData && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>{currentSectionData.label}</CardTitle>
                <p className="text-sm text-muted-foreground">{currentSectionData.description}</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {currentSectionData.subsections.map((sub) => (
                    <div key={sub.key}>
                      <Label className="text-sm font-semibold mb-2 block">{sub.label}</Label>
                      <Textarea
                        value={sections[sub.key] || ''}
                        onChange={(e) => setSections((prev) => ({ ...prev, [sub.key]: e.target.value }))}
                        rows={5}
                        placeholder={sub.placeholder}
                        className="text-sm"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {(sections[sub.key] || '').trim().length > 0
                          ? `${(sections[sub.key] || '').trim().length} caracteres`
                          : 'Não preenchido'}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* NR-17 Compliance Checklist */}
          {activeStep >= AET_SECTIONS.length && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Checklist de Conformidade NR-17</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Verifique os itens que foram avaliados e estão em conformidade durante esta análise.
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {NR17_CHECKLIST.map((item) => (
                    <div key={item.key} className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                      <Checkbox
                        id={item.key}
                        checked={checklist[item.key] || false}
                        onCheckedChange={(checked) =>
                          setChecklist((prev) => ({ ...prev, [item.key]: !!checked }))
                        }
                        className="mt-0.5"
                      />
                      <label htmlFor={item.key} className="text-sm cursor-pointer flex-1">
                        {item.label}
                      </label>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium">
                    {NR17_CHECKLIST.filter(c => checklist[c.key]).length} de {NR17_CHECKLIST.length} itens verificados
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Navigation between sections */}
          <div className="flex items-center justify-between mb-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveStep((s) => Math.max(0, s - 1))}
              disabled={activeStep === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
            </Button>
            <p className="text-xs text-muted-foreground">
              {isSectionComplete(activeStep) ? '✓ Seção completa' : 'Preencha todos os campos para avançar'}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveStep((s) => Math.min(allSteps.length - 1, s + 1))}
              disabled={activeStep >= allSteps.length - 1 || !isSectionComplete(activeStep)}
            >
              Próximo <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-4 mb-8">
        <Button variant="outline" onClick={() => navigate('/aet')}>Cancelar</Button>
        <Button variant="secondary" onClick={() => handleSave(false)} disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar Rascunho'}
        </Button>
        <Button onClick={() => handleSave(true)} disabled={saving || progress < 60}>
          {saving ? 'Finalizando...' : `Finalizar AET (${progress}%)`}
        </Button>
        {isEdit && (
          <Button variant="outline" onClick={handleGeneratePdf}>
            Gerar Laudo PDF
          </Button>
        )}
      </div>
    </div>
  );
};

export default AETForm;
