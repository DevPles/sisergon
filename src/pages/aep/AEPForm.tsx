import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { generateAepPdf } from '@/utils/aepPdfReport';
import { fetchCompanyLogoUrl, fetchEvaluatorLabel } from '@/utils/reportBranding';
import { format } from 'date-fns';
import { useCompanyTemplate, useTemplateQuestions } from '@/hooks/useCompanyTemplate';

// AEP Questions per block from the document
const AEP_BLOCKS = [
  {
    domain: 'posturas',
    label: 'Bloco A — Posturas e alcances',
    weight: 25,
    questions: [
      'Tronco inclinado/rotacionado por períodos significativos',
      'Pescoço em flexão/extensão sustentada',
      'Ombros elevados/braços acima do ombro frequentes',
      'Alcances longos ou trabalho fora da "zona confortável"',
      'Punhos em desvio/pegas desconfortáveis',
    ],
  },
  {
    domain: 'forca',
    label: 'Bloco B — Força/carga',
    weight: 20,
    questions: [
      'Empurrar/puxar com esforço perceptível',
      'Levantar/transportar cargas com frequência relevante',
      'Preensão forte/pinça fina prolongada (ferramentas/peças)',
      'Contato mecânico (bordas/pressão localizada) em mãos/antebraço',
      'Vibração (ferramenta/veículo) significativa',
    ],
  },
  {
    domain: 'repetitividade',
    label: 'Bloco C — Repetitividade e ritmo',
    weight: 15,
    questions: [
      'Ciclos curtos com alta repetição do mesmo gesto',
      'Metas/ritmo rígido com baixa autonomia',
      'Pausas insuficientes (micro e macro) para recuperação',
      'Picos de demanda sem ajuste de recursos',
      'Pressão temporal constante (urgência permanente)',
    ],
  },
  {
    domain: 'posto',
    label: 'Bloco D — Posto, mobiliário e ferramentas',
    weight: 10,
    questions: [
      'Altura do plano de trabalho inadequada (muito alto/baixo)',
      'Cadeira/mesa sem ajustes mínimos (quando aplicável)',
      'Layout obriga torções/alcances/deslocamentos evitáveis',
      'Ferramentas inadequadas ou sem manutenção',
      'Tela/teclado/mouse mal posicionados (quando aplicável)',
    ],
  },
  {
    domain: 'ambiente',
    label: 'Bloco E — Ambiente e conforto',
    weight: 5,
    questions: [
      'Iluminação insuficiente/ofuscamento',
      'Ruído interfere na tarefa/comunicação',
      'Calor/frio desconfortável sem controle',
      'Espaço restrito/obstáculos',
      'Organização/limpeza afeta segurança e eficiência',
    ],
  },
  {
    domain: 'organizacao',
    label: 'Bloco F — Organização do trabalho',
    weight: 15,
    questions: [
      'Normas de produção exigem velocidade incompatível com recuperação',
      'Variabilidade alta sem treinamento/margem de manobra',
      'Rodízio inadequado (quando necessário)',
      'Jornada/turnos aumentam fadiga sem mitigação',
      'Comunicação operacional falha (mudança, prioridade, exceções)',
    ],
  },
  {
    domain: 'psicossociais',
    label: 'Bloco G — Psicossociais (ARP)',
    weight: 10,
    questions: [
      'Baixa clareza de papel/função',
      'Falta de suporte/apoio (liderança/equipe)',
      'Baixo reconhecimento/recompensas desproporcionais',
      'Má gestão de mudanças organizacionais',
      'Comunicação difícil/isolamento (inclui remoto)',
      'Indícios de assédio/violência/ameaça (qualquer natureza)',
    ],
  },
];

const SCORE_LABELS = ['0 — Adequado', '1 — Leve', '2 — Moderado', '3 — Alto'];

const classifyScore = (score: number): string => {
  if (score <= 33) return 'baixo';
  if (score <= 66) return 'moderado';
  return 'alto';
};

const AEPForm = () => {
  const { id } = useParams();
  const isEdit = !!id && id !== 'nova';
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [title, setTitle] = useState('');
  const [empresaId, setEmpresaId] = useState('');
  const [unidadeId, setUnidadeId] = useState('');
  const [setorId, setSetorId] = useState('');
  const [cargoId, setCargoId] = useState('');
  const [description, setDescription] = useState('');
  const [values, setValues] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Try to load dynamic template for this empresa
  const { data: dynamicTemplate } = useCompanyTemplate(empresaId || undefined, 'aep');
  const { questions: dynamicQuestions, sections: dynamicSections, getOptionsForQuestion } = useTemplateQuestions(dynamicTemplate?.id);

  // Build blocks: use dynamic template if available, else hardcoded
  const activeBlocks = useMemo(() => {
    if (dynamicQuestions.length > 0 && dynamicSections.length > 0) {
      return dynamicSections.map((section: any, idx: number) => {
        const sectionQs = dynamicQuestions.filter((q: any) => q.section_id === section.id);
        return {
          domain: `section-${idx}`,
          label: section.nome || `Bloco ${idx + 1}`,
          weight: Math.round(100 / dynamicSections.length),
          questions: sectionQs.map((q: any) => q.texto),
          questionIds: sectionQs.map((q: any) => q.id),
        };
      });
    }
    if (dynamicQuestions.length > 0) {
      return [{
        domain: 'dynamic',
        label: 'Avaliação',
        weight: 100,
        questions: dynamicQuestions.map((q: any) => q.texto),
        questionIds: dynamicQuestions.map((q: any) => q.id),
      }];
    }
    return AEP_BLOCKS;
  }, [dynamicQuestions, dynamicSections]);

  // Fetch empresas
  const { data: empresas } = useQuery({
    queryKey: ['empresas-select'],
    queryFn: async () => {
      const { data } = await supabase.from('empresas').select('id, razao_social, cnpj, cnae, grau_risco').order('razao_social');
      return data || [];
    },
  });

  // Fetch unidades, setores, cargos based on empresa
  const { data: unidades } = useQuery({
    queryKey: ['unidades-select', empresaId],
    queryFn: async () => {
      if (!empresaId) return [];
      const { data } = await supabase.from('unidades').select('id, nome').eq('empresa_id', empresaId);
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

  // Load existing assessment
  useEffect(() => {
    if (!isEdit) return;
    const load = async () => {
      const { data: assessment } = await supabase.from('assessments').select('*').eq('id', id).single();
      if (assessment) {
        setTitle(assessment.title || '');
        setEmpresaId(assessment.empresa_id);
        setUnidadeId(assessment.unidade_id || '');
        setSetorId(assessment.setor_id || '');
        setCargoId(assessment.cargo_id || '');
        setDescription(assessment.description || '');
      }
      const { data: items } = await supabase.from('assessment_items').select('*').eq('assessment_id', id);
      if (items) {
        const vals: Record<string, number> = {};
        const cmts: Record<string, string> = {};
        items.forEach((item) => {
          const key = `${item.domain}-${item.question_number}`;
          vals[key] = item.value ?? 0;
          cmts[key] = item.comment || '';
        });
        setValues(vals);
        setComments(cmts);
      }
    };
    load();
  }, [id, isEdit]);

  // Calculate scores
  const { blockScores, totalScore, classification } = useMemo(() => {
    const blockScores: Record<string, number> = {};
    let totalScore = 0;

    activeBlocks.forEach((block) => {
      const blockValues = block.questions.map((_, i) => values[`${block.domain}-${i}`] ?? 0);
      const avg = blockValues.reduce((a, b) => a + b, 0) / block.questions.length;
      const score = (avg / 3) * block.weight;
      blockScores[block.domain] = Math.round(score * 100) / 100;
      totalScore += score;
    });

    totalScore = Math.round(totalScore * 100) / 100;
    const classification = classifyScore(totalScore);
    return { blockScores, totalScore, classification };
  }, [values, activeBlocks]);

  const handleSave = async (finalize = false) => {
    if (!empresaId) {
      toast({ title: 'Selecione uma empresa', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const status = finalize ? 'finalizado' as const : 'rascunho' as const;
      const classificationTyped = classification as 'baixo' | 'moderado' | 'alto' | 'critico';
      const assessmentData = {
        type: 'aep' as const,
        title: title || 'AEP sem título',
        empresa_id: empresaId,
        unidade_id: unidadeId || null,
        setor_id: setorId || null,
        cargo_id: cargoId || null,
        description,
        status,
        score_total: totalScore,
        risk_classification: classificationTyped,
        needs_aet: totalScore >= 67,
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

      // Delete old items and re-insert
      await supabase.from('assessment_items').delete().eq('assessment_id', assessmentId!);

      const items: any[] = [];
      activeBlocks.forEach((block) => {
        block.questions.forEach((q, i) => {
          items.push({
            assessment_id: assessmentId,
            domain: block.domain,
            question_number: i,
            question_text: q,
            value: values[`${block.domain}-${i}`] ?? 0,
            comment: comments[`${block.domain}-${i}`] || null,
          });
        });
      });

      await supabase.from('assessment_items').insert(items);

      // Auto-create action plan if risk >= moderado
      if (finalize && totalScore >= 34) {
        await supabase.from('action_plans').insert({
          assessment_id: assessmentId,
          empresa_id: empresaId,
          origin: 'aep_automatico',
          action: totalScore >= 67
            ? 'Medidas imediatas necessárias — escalar para AET'
            : 'Plano de ação estruturado — reavaliação necessária',
          priority: totalScore >= 67 ? 'alta' : 'media',
          status: 'pendente',
          created_by: user?.id,
        });
      }

      queryClient.invalidateQueries({ queryKey: ['aep-list'] });
      queryClient.invalidateQueries({ queryKey: ['home-counts'] });
      toast({ title: finalize ? 'AEP finalizada com sucesso' : 'AEP salva como rascunho' });
      navigate('/aep');
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' });
    }
    setSaving(false);
  };

  const riskBadgeColor = classification === 'baixo' ? 'secondary' : classification === 'moderado' ? 'default' : 'destructive';

  const handleGeneratePdf = async () => {
    if (!isEdit || !id) {
      toast({ title: 'Salve a AEP antes de gerar o laudo', variant: 'destructive' });
      return;
    }

    try {
      const [{ data: assessment, error: assessmentError }, { data: items, error: itemsError }] = await Promise.all([
        supabase.from('assessments').select('*').eq('id', id).single(),
        supabase.from('assessment_items').select('*').eq('assessment_id', id),
      ]);

      if (assessmentError || !assessment) throw assessmentError || new Error('AEP não encontrada.');
      if (itemsError) throw itemsError;

      const [empRes, cargoRes, unidadeRes, setorRes, companyLogoUrl, evaluatorLabel] = await Promise.all([
        supabase.from('empresas').select('*').eq('id', assessment.empresa_id).single(),
        assessment.cargo_id
          ? supabase.from('cargos').select('nome, cbo').eq('id', assessment.cargo_id).single()
          : Promise.resolve({ data: null, error: null } as any),
        assessment.unidade_id
          ? supabase.from('unidades').select('nome').eq('id', assessment.unidade_id).single()
          : Promise.resolve({ data: null, error: null } as any),
        assessment.setor_id
          ? supabase.from('setores').select('nome').eq('id', assessment.setor_id).single()
          : Promise.resolve({ data: null, error: null } as any),
        fetchCompanyLogoUrl(assessment.empresa_id),
        fetchEvaluatorLabel(assessment.evaluator_id, user?.email || 'Equipe Técnica ERGON'),
      ]);

      if (empRes.error) throw empRes.error;

      const blocks = activeBlocks.map((block) => {
        const blockItems = (items || [])
          .filter((it) => it.domain === block.domain)
          .sort((x, y) => x.question_number - y.question_number);

        const vals = blockItems.map((it) => it.value ?? 0);
        const avg = vals.length ? vals.reduce((sum, value) => sum + value, 0) / vals.length : 0;

        return {
          ...block,
          score: Math.round((avg / 3) * block.weight * 100) / 100,
          questions: blockItems.length > 0
            ? blockItems.map((it) => ({
                number: it.question_number + 1,
                text: it.question_text,
                value: it.value ?? 0,
                comment: it.comment || undefined,
              }))
            : block.questions.map((question, index) => ({
                number: index + 1,
                text: question,
                value: 0,
                comment: 'Sem resposta registrada nesta avaliação finalizada.',
              })),
        };
      });

      await generateAepPdf({
        title: assessment.title || 'Sem título',
        empresa: empRes.data?.razao_social || '',
        companyLogoUrl,
        cnpj: empRes.data?.cnpj || undefined,
        cnae: empRes.data?.cnae || undefined,
        grauRisco: empRes.data?.grau_risco || undefined,
        unidade: unidadeRes.data?.nome || undefined,
        setor: setorRes.data?.nome || undefined,
        cargo: cargoRes.data?.nome || undefined,
        cbo: cargoRes.data?.cbo || undefined,
        description: assessment.description || undefined,
        evaluator: evaluatorLabel,
        date: format(new Date(assessment.created_at), 'dd/MM/yyyy'),
        finalizedAt: assessment.finalized_at ? format(new Date(assessment.finalized_at), 'dd/MM/yyyy') : undefined,
        totalScore: Number(assessment.score_total) || 0,
        classification: assessment.risk_classification || 'baixo',
        needsAet: assessment.needs_aet || false,
        blocks,
      }, {
        autoDownload: true,
      });

      toast({ title: 'Laudo PDF gerado com sucesso' });
    } catch (err: any) {
      toast({ title: 'Erro ao gerar PDF', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{isEdit ? 'Editar AEP' : 'Nova Avaliação AEP'}</h1>
          <p className="text-muted-foreground">Avaliação Ergonômica Preliminar — NR-17</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/aep')}>Voltar</Button>
      </div>

      {/* Score summary card */}
      <Card className="mb-6 border-2 border-primary/20">
        <CardContent className="p-6">
          <div className="flex flex-wrap items-center gap-6">
            <div>
              <p className="text-sm text-muted-foreground">Score Total</p>
              <p className="text-4xl font-bold text-foreground">{totalScore.toFixed(1)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Classificação</p>
              <Badge variant={riskBadgeColor} className="text-base px-4 py-1 mt-1">
                {classification.charAt(0).toUpperCase() + classification.slice(1)}
              </Badge>
            </div>
            {totalScore >= 67 && (
              <div className="ml-auto">
                <Badge variant="destructive" className="text-sm px-4 py-1">Necessidade de AET</Badge>
              </div>
            )}
            <div className="flex flex-wrap gap-3 ml-auto">
              {activeBlocks.map((block) => (
                <div key={block.domain} className="text-center">
                  <p className="text-xs text-muted-foreground">{block.domain.slice(0, 4).toUpperCase()}</p>
                  <p className="text-sm font-semibold">{blockScores[block.domain]?.toFixed(1) ?? '0.0'}</p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Identification block */}
      <Card className="mb-6">
        <CardHeader><CardTitle>Identificação</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Título da avaliação</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: AEP Setor Produção" />
            </div>
            <div className="space-y-2">
              <Label>Empresa *</Label>
              <Select value={empresaId} onValueChange={setEmpresaId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {empresas?.map((e) => <SelectItem key={e.id} value={e.id}>{e.razao_social}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Unidade</Label>
              <Select value={unidadeId} onValueChange={setUnidadeId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {unidades?.map((u) => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Setor</Label>
              <Select value={setorId} onValueChange={setSetorId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {setores?.map((s) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Cargo</Label>
              <Select value={cargoId} onValueChange={setCargoId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {cargos?.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Descrição / Observações gerais</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Descreva a atividade, tarefa, frequência, ciclo de trabalho..." />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dynamic template indicator */}
      {dynamicTemplate && dynamicQuestions.length > 0 && (
        <div className="mb-4 p-3 rounded-lg border border-primary/20 bg-primary/5">
          <p className="text-xs text-muted-foreground">
            📋 Usando formulário personalizado: <strong>{dynamicTemplate.nome}</strong> (v{dynamicTemplate.versao})
          </p>
        </div>
      )}

      {/* Question blocks — 2 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {activeBlocks.map((block) => (
          <Card key={block.domain}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{block.label}</CardTitle>
                <Badge variant="outline" className="text-xs">Peso: {block.weight} | Score: {blockScores[block.domain]?.toFixed(1) ?? '0.0'}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {block.questions.map((q, i) => {
                  const key = `${block.domain}-${i}`;
                  return (
                    <div key={key} className="border-b pb-3 last:border-b-0 last:pb-0">
                      <p className="text-sm font-medium text-foreground mb-2">
                        {i + 1}) {q}
                      </p>
                      <div className="flex flex-wrap gap-1 mb-1">
                        {SCORE_LABELS.map((label, val) => (
                          <Button
                            key={val}
                            type="button"
                            variant={values[key] === val ? 'default' : 'outline'}
                            size="sm"
                            className="text-xs h-7 px-2"
                            onClick={() => setValues((prev) => ({ ...prev, [key]: val }))}
                          >
                            {label}
                          </Button>
                        ))}
                      </div>
                      <Input
                        placeholder="Observação (opcional)"
                        value={comments[key] || ''}
                        onChange={(e) => setComments((prev) => ({ ...prev, [key]: e.target.value }))}
                        className="mt-1 h-8 text-sm"
                      />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-4 mb-8">
        <Button variant="outline" onClick={() => navigate('/aep')}>Cancelar</Button>
        <Button variant="secondary" onClick={() => handleSave(false)} disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar Rascunho'}
        </Button>
        <Button onClick={() => handleSave(true)} disabled={saving}>
          {saving ? 'Finalizando...' : 'Finalizar AEP'}
        </Button>
        {isEdit && (
          <Button
            variant="outline"
            onClick={handleGeneratePdf}
          >
            Gerar Laudo PDF
          </Button>
        )}
      </div>
    </div>
  );
};

export default AEPForm;
