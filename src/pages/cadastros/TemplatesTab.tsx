import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { getDefaultStagesForType } from '@/utils/defaultTemplates';
import { MoreHorizontal } from 'lucide-react';

const TIPOS_TEMPLATE = [
  { value: 'aep', label: 'AEP' },
  { value: 'aet', label: 'AET' },
  { value: 'psicossocial', label: 'Psicossocial' },
  { value: 'checklist', label: 'Checklist Mensal' },
  { value: 'plano_acao', label: 'Plano de Ação' },
  { value: 'formulario_custom', label: 'Formulário Customizado' },
];

/* ── Types ── */
interface Option { texto: string; peso: number; }
interface QuestionLocal {
  pergunta: string;
  obrigatoria: boolean;
  eliminatoria: boolean;
  opcoes: Option[];
}
interface StageLocal {
  titulo: string;
  descricao: string;
  perguntas: QuestionLocal[];
  dbId?: string;
}
interface BehavioralQuestion {
  pergunta: string;
  opcoes: { label: string; perfil: 'D' | 'I' | 'S' | 'C' }[];
}

/* ── DISC 10 default questions ── */
const DEFAULT_BEHAVIORAL: BehavioralQuestion[] = [
  { pergunta: 'Quando enfrenta um desafio no trabalho, você tende a:', opcoes: [{ label: 'Agir rapidamente e tomar decisões firmes', perfil: 'D' }, { label: 'Conversar com colegas e buscar consenso', perfil: 'I' }, { label: 'Analisar calmamente antes de agir', perfil: 'S' }, { label: 'Seguir procedimentos e regras estabelecidas', perfil: 'C' }] },
  { pergunta: 'Em reuniões de equipe, você geralmente:', opcoes: [{ label: 'Lidera a discussão e direciona o grupo', perfil: 'D' }, { label: 'Motiva os outros e mantém o clima positivo', perfil: 'I' }, { label: 'Ouve atentamente e contribui quando solicitado', perfil: 'S' }, { label: 'Apresenta dados e análises detalhadas', perfil: 'C' }] },
  { pergunta: 'Sob pressão, você costuma:', opcoes: [{ label: 'Ficar mais direto e exigente', perfil: 'D' }, { label: 'Buscar apoio emocional e expressar sentimentos', perfil: 'I' }, { label: 'Evitar conflitos e buscar estabilidade', perfil: 'S' }, { label: 'Se retrair e focar em detalhes', perfil: 'C' }] },
  { pergunta: 'O que mais o motiva no trabalho?', opcoes: [{ label: 'Resultados, metas e conquistas', perfil: 'D' }, { label: 'Reconhecimento, interação social e novidades', perfil: 'I' }, { label: 'Segurança, rotina e ambiente harmonioso', perfil: 'S' }, { label: 'Qualidade, precisão e excelência técnica', perfil: 'C' }] },
  { pergunta: 'Quando recebe um feedback negativo, você:', opcoes: [{ label: 'Argumenta e defende seu ponto de vista', perfil: 'D' }, { label: 'Fica desconfortável mas tenta manter bom humor', perfil: 'I' }, { label: 'Aceita em silêncio e reflete depois', perfil: 'S' }, { label: 'Pede exemplos específicos e dados concretos', perfil: 'C' }] },
  { pergunta: 'Como você prefere se comunicar?', opcoes: [{ label: 'De forma direta, breve e objetiva', perfil: 'D' }, { label: 'De forma entusiasmada e expressiva', perfil: 'I' }, { label: 'De forma calma, gentil e empática', perfil: 'S' }, { label: 'De forma formal, precisa e detalhada', perfil: 'C' }] },
  { pergunta: 'Em situações de mudança, você:', opcoes: [{ label: 'Abraça a mudança como oportunidade', perfil: 'D' }, { label: 'Se adapta facilmente e anima os outros', perfil: 'I' }, { label: 'Prefere transições graduais e previsíveis', perfil: 'S' }, { label: 'Analisa os riscos antes de aceitar', perfil: 'C' }] },
  { pergunta: 'Qual característica melhor o descreve?', opcoes: [{ label: 'Competitivo e determinado', perfil: 'D' }, { label: 'Otimista e sociável', perfil: 'I' }, { label: 'Paciente e leal', perfil: 'S' }, { label: 'Perfeccionista e analítico', perfil: 'C' }] },
  { pergunta: 'Quando lidera um projeto, você:', opcoes: [{ label: 'Define metas claras e cobra resultados', perfil: 'D' }, { label: 'Inspira e envolve a equipe com entusiasmo', perfil: 'I' }, { label: 'Garante que todos estejam confortáveis e ouvidos', perfil: 'S' }, { label: 'Cria planos detalhados e acompanha métricas', perfil: 'C' }] },
  { pergunta: 'O que mais incomoda você no ambiente de trabalho?', opcoes: [{ label: 'Falta de autonomia e lentidão nas decisões', perfil: 'D' }, { label: 'Isolamento e falta de reconhecimento', perfil: 'I' }, { label: 'Conflitos constantes e instabilidade', perfil: 'S' }, { label: 'Falta de padrão, erros e desorganização', perfil: 'C' }] },
];

const DISC_PROFILES = ['D', 'I', 'S', 'C'] as const;

/* ═══════════════════════════════════════════════════════════
   TEMPLATE EDITOR MODAL — local state, save all at once
   ═══════════════════════════════════════════════════════════ */
interface TemplateEditorProps {
  editId: string | null;
  empresaId: string;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const TemplateEditorModal = ({ editId, empresaId: initialEmpresaId, open, onClose, onSaved }: TemplateEditorProps) => {
  const { user, isAdmin, isConsultor } = useAuth();
  const { toast } = useToast();

  const [form, setForm] = useState({ nome: '', tipo: 'aep', descricao: '', status: 'ativo' });
  const [selectedEmpresaId, setSelectedEmpresaId] = useState(initialEmpresaId || '__global__');
  const [stages, setStages] = useState<StageLocal[]>([]);
  const [behavioralQuestions, setBehavioralQuestions] = useState<BehavioralQuestion[]>([]);
  const [behavioralEnabled, setBehavioralEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(!editId);

  const { data: empresasModal } = useQuery({
    queryKey: ['empresas-modal-templates', user?.id, isConsultor],
    queryFn: async () => {
      if (isConsultor && !isAdmin && user?.id) {
        const { data: links } = await supabase.from('consultor_empresas').select('empresa_id').eq('user_id', user.id).eq('ativo', true);
        const ids = (links || []).map(l => l.empresa_id);
        if (ids.length === 0) return [];
        const { data } = await supabase.from('empresas').select('id, razao_social').in('id', ids).eq('ativa', true).order('razao_social');
        return data ?? [];
      }
      const { data } = await supabase.from('empresas').select('id, razao_social').eq('ativa', true).order('razao_social');
      return data ?? [];
    },
    enabled: open,
  });

  // Load existing template data
  useEffect(() => {
    if (!editId || !open) { setLoaded(true); return; }
    setLoaded(false);
    (async () => {
      // Template info
      const { data: t } = await supabase.from('form_templates' as any).select('*').eq('id', editId).single();
      if (t) {
        const td = t as any;
        setForm({ nome: td.nome, tipo: td.tipo, descricao: td.descricao || '', status: td.status });
      }

      // Sections
      const { data: sectionsData } = await supabase.from('form_template_sections' as any).select('*').eq('template_id', editId).order('ordem');

      // Questions
      const { data: questionsData } = await supabase.from('form_template_questions' as any).select('*').eq('template_id', editId).order('ordem');

      // Options
      const qIds = (questionsData || []).map((q: any) => q.id);
      let optionsData: any[] = [];
      if (qIds.length > 0) {
        const { data: opts } = await supabase.from('form_template_options' as any).select('*').in('question_id', qIds).order('ordem');
        optionsData = opts || [];
      }

      // Build local stages
      const loadedStages: StageLocal[] = (sectionsData || []).map((s: any) => ({
        titulo: s.nome,
        descricao: s.descricao || '',
        dbId: s.id,
        perguntas: (questionsData || []).filter((q: any) => q.section_id === s.id).map((q: any) => ({
          pergunta: q.texto,
          obrigatoria: q.obrigatoria ?? true,
          eliminatoria: q.eliminatoria ?? false,
          opcoes: optionsData.filter((o: any) => o.question_id === q.id).map((o: any) => ({
            texto: o.texto,
            peso: o.valor ?? 0,
          })),
        })),
      }));

      // Unsectioned questions as a virtual stage
      const unsectioned = (questionsData || []).filter((q: any) => !q.section_id);
      if (unsectioned.length > 0) {
        loadedStages.push({
          titulo: 'Perguntas Avulsas',
          descricao: '',
          perguntas: unsectioned.map((q: any) => ({
            pergunta: q.texto,
            obrigatoria: q.obrigatoria ?? true,
            eliminatoria: q.eliminatoria ?? false,
            opcoes: optionsData.filter((o: any) => o.question_id === q.id).map((o: any) => ({
              texto: o.texto,
              peso: o.valor ?? 0,
            })),
          })),
        });
      }

      setStages(loadedStages);

      // Load DISC test
      const realEmpresaId = (t as any)?.empresa_id || selectedEmpresaId;
      if (realEmpresaId && realEmpresaId !== '__global__') {
        const { data: disc } = await supabase.from('test_templates' as any).select('*')
          .eq('empresa_id', realEmpresaId).eq('tipo', 'disc').limit(1).maybeSingle();
        if (disc) {
          setBehavioralEnabled((disc as any).status === 'ativo');
          const { data: dqs } = await supabase.from('test_questions' as any).select('*').eq('test_id', (disc as any).id).order('ordem');
          if (dqs && dqs.length > 0) {
            const dqIds = (dqs as any[]).map(q => q.id);
            const { data: dopts } = await supabase.from('test_options' as any).select('*').in('question_id', dqIds).order('ordem');
            setBehavioralQuestions((dqs as any[]).map(q => ({
              pergunta: q.texto,
              opcoes: (dopts || []).filter((o: any) => o.question_id === q.id).map((o: any) => ({
                label: o.texto,
                perfil: o.perfil as 'D' | 'I' | 'S' | 'C',
              })),
            })));
          }
        }
      }

      setLoaded(true);
    })();
  }, [editId, open]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setForm({ nome: '', tipo: 'aep', descricao: '', status: 'ativo' });
      setSelectedEmpresaId(initialEmpresaId || '__global__');
      setStages([]);
      setBehavioralQuestions([]);
      setBehavioralEnabled(false);
      setLoaded(!editId);
    }
  }, [open]);

  /* ── Save all ── */
  const handleSave = async () => {
    if (!form.nome) return;
    setSaving(true);
    try {
      let templateId = editId;
      const isGlobal = !selectedEmpresaId || selectedEmpresaId === '__global__';
      const payload: any = {
        nome: form.nome, tipo: form.tipo,
        status: form.status,
        empresa_id: isGlobal ? null : selectedEmpresaId,
        is_global: isGlobal,
      };

      if (editId) {
        const { error } = await supabase.from('form_templates' as any).update(payload).eq('id', editId);
        if (error) throw error;
      } else {
        payload.created_by = user?.id;
        const { data, error } = await supabase.from('form_templates' as any).insert(payload).select('id').single();
        if (error) throw error;
        templateId = (data as any).id;
      }

      if (templateId) {
        // Delete existing sections/questions/options
        const { data: existingQs } = await supabase.from('form_template_questions' as any).select('id').eq('template_id', templateId);
        if (existingQs && existingQs.length > 0) {
          const eqIds = (existingQs as any[]).map(q => q.id);
          await supabase.from('form_template_options' as any).delete().in('question_id', eqIds);
        }
        await supabase.from('form_template_questions' as any).delete().eq('template_id', templateId);
        await supabase.from('form_template_sections' as any).delete().eq('template_id', templateId);

        // Save stages and questions
        for (let si = 0; si < stages.length; si++) {
          const stage = stages[si];
          if (!stage.titulo.trim()) continue;

          const { data: sectionData, error: sErr } = await supabase.from('form_template_sections' as any).insert({
            template_id: templateId, nome: stage.titulo.trim(),
            descricao: stage.descricao.trim() || null, ordem: si,
          } as any).select('id').single();
          if (sErr) throw sErr;

          const validQs = stage.perguntas.filter(q => q.pergunta.trim() && q.opcoes.filter(o => o.texto.trim()).length >= 2);
          for (let qi = 0; qi < validQs.length; qi++) {
            const q = validQs[qi];
            const { data: qData, error: qErr } = await supabase.from('form_template_questions' as any).insert({
              template_id: templateId, section_id: (sectionData as any).id,
              texto: q.pergunta.trim(), tipo_resposta: 'multipla_escolha',
              ordem: qi, obrigatoria: q.obrigatoria, eliminatoria: q.eliminatoria,
            } as any).select('id').single();
            if (qErr) throw qErr;

            const validOpts = q.opcoes.filter(o => o.texto.trim());
            if (validOpts.length > 0 && qData) {
              const { error: oErr } = await supabase.from('form_template_options' as any).insert(
                validOpts.map((o, oi) => ({
                  question_id: (qData as any).id, texto: o.texto.trim(),
                  valor: Number(o.peso) || 0, ordem: oi,
                }))
              );
              if (oErr) throw oErr;
            }
          }
        }

        // Save DISC test
        const realEmpresaId = isGlobal ? null : selectedEmpresaId;
        if (realEmpresaId && behavioralEnabled) {
          // Delete existing DISC for this empresa
          const { data: existingDisc } = await supabase.from('test_templates' as any).select('id')
            .eq('empresa_id', realEmpresaId).eq('tipo', 'disc');
          for (const d of (existingDisc || []) as any[]) {
            const { data: dqs } = await supabase.from('test_questions' as any).select('id').eq('test_id', d.id);
            if (dqs && dqs.length > 0) {
              await supabase.from('test_options' as any).delete().in('question_id', (dqs as any[]).map(q => q.id));
            }
            await supabase.from('test_questions' as any).delete().eq('test_id', d.id);
            await supabase.from('test_templates' as any).delete().eq('id', d.id);
          }

          // Create new DISC
          const validBqs = behavioralQuestions.filter(q => q.pergunta.trim() && q.opcoes.every(o => o.label.trim()));
          if (validBqs.length > 0) {
            const { data: newDisc } = await supabase.from('test_templates' as any).insert({
              nome: 'Teste DISC', tipo: 'disc', empresa_id: realEmpresaId,
              status: 'ativo', descricao: 'Teste comportamental DISC',
              created_by: user?.id,
            } as any).select('id').single();

            if (newDisc) {
              for (let i = 0; i < validBqs.length; i++) {
                const bq = validBqs[i];
                const { data: qd } = await supabase.from('test_questions' as any).insert({
                  test_id: (newDisc as any).id, texto: bq.pergunta.trim(), ordem: i,
                } as any).select('id').single();
                if (qd) {
                  await supabase.from('test_options' as any).insert(
                    bq.opcoes.map((o, j) => ({
                      question_id: (qd as any).id, texto: o.label.trim(),
                      perfil: o.perfil, valor: 1, ordem: j,
                    }))
                  );
                }
              }
            }
          }
        }
      }

      toast({ title: editId ? 'Formulário atualizado!' : 'Formulário criado!' });
      onSaved();
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  /* ── Stage helpers ── */
  const addStage = () => setStages(prev => [...prev, { titulo: '', descricao: '', perguntas: [] }]);
  const removeStage = (i: number) => setStages(prev => prev.filter((_, idx) => idx !== i));
  const updateStage = (i: number, field: string, val: any) => setStages(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: val } : s));

  /* ── Question helpers ── */
  const addPergunta = (si: number) => setStages(prev => prev.map((s, idx) => idx === si ? { ...s, perguntas: [...s.perguntas, { pergunta: '', obrigatoria: true, eliminatoria: false, opcoes: [{ texto: '', peso: 0 }, { texto: '', peso: 0 }] }] } : s));
  const removePergunta = (si: number, qi: number) => setStages(prev => prev.map((s, idx) => idx === si ? { ...s, perguntas: s.perguntas.filter((_, j) => j !== qi) } : s));
  const updatePergunta = (si: number, qi: number, field: string, val: any) => setStages(prev => prev.map((s, idx) => idx === si ? { ...s, perguntas: s.perguntas.map((q, j) => j === qi ? { ...q, [field]: val } : q) } : s));
  const addOpcao = (si: number, qi: number) => setStages(prev => prev.map((s, idx) => idx === si ? { ...s, perguntas: s.perguntas.map((q, j) => j === qi ? { ...q, opcoes: [...q.opcoes, { texto: '', peso: 0 }] } : q) } : s));
  const removeOpcao = (si: number, qi: number, oi: number) => setStages(prev => prev.map((s, idx) => idx === si ? { ...s, perguntas: s.perguntas.map((q, j) => j === qi ? { ...q, opcoes: q.opcoes.filter((_, k) => k !== oi) } : q) } : s));
  const updateOpcao = (si: number, qi: number, oi: number, field: keyof Option, val: string | number) =>
    setStages(prev => prev.map((s, idx) => idx === si ? { ...s, perguntas: s.perguntas.map((q, j) => j === qi ? { ...q, opcoes: q.opcoes.map((o, k) => k === oi ? { ...o, [field]: val } : o) } : q) } : s));

  /* ── Behavioral helpers ── */
  const loadDefaultBehavioral = () => setBehavioralQuestions([...DEFAULT_BEHAVIORAL]);
  const addBehavioralQ = () => setBehavioralQuestions(prev => [...prev, { pergunta: '', opcoes: [{ label: '', perfil: 'D' }, { label: '', perfil: 'I' }, { label: '', perfil: 'S' }, { label: '', perfil: 'C' }] }]);
  const removeBehavioralQ = (i: number) => setBehavioralQuestions(prev => prev.filter((_, idx) => idx !== i));
  const updateBehavioralQ = (i: number, pergunta: string) => setBehavioralQuestions(prev => prev.map((q, idx) => idx === i ? { ...q, pergunta } : q));
  const updateBehavioralOp = (qi: number, oi: number, field: 'label' | 'perfil', val: string) => setBehavioralQuestions(prev => prev.map((q, idx) => idx === qi ? { ...q, opcoes: q.opcoes.map((o, j) => j === oi ? { ...o, [field]: val } : o) } : q));

  if (!loaded) return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-3xl"><p className="text-sm text-muted-foreground py-4">Carregando...</p></DialogContent>
    </Dialog>
  );

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>{editId ? 'Editar Formulário' : 'Novo Formulário'}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="info" className="w-full">
          <div className="px-6">
            <TabsList className="w-full grid grid-cols-4">
              <TabsTrigger value="info" className="text-xs">Informações</TabsTrigger>
              <TabsTrigger value="stages" className="text-xs">Blocos</TabsTrigger>
              <TabsTrigger value="questions" className="text-xs">Perguntas</TabsTrigger>
              <TabsTrigger value="behavioral" className="text-xs">Comportamental</TabsTrigger>
            </TabsList>
          </div>

          {/* ── TAB: Informações ── */}
          <TabsContent value="info" className="px-6 pb-4 mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Nome do Formulário *</Label>
                <Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: AEP Padrão" maxLength={100} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Tipo *</Label>
                <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIPOS_TEMPLATE.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Empresa *</Label>
              <Select value={selectedEmpresaId} onValueChange={setSelectedEmpresaId}>
                <SelectTrigger><SelectValue placeholder="Selecione a empresa" /></SelectTrigger>
                <SelectContent>
                  {isAdmin && <SelectItem value="__global__">Global (Padrão do Sistema)</SelectItem>}
                  {empresasModal?.map(e => <SelectItem key={e.id} value={e.id}>{e.razao_social}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Descrição</Label>
              <Textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} rows={3} placeholder="Descrição do template..." maxLength={2000} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                  <SelectItem value="rascunho">Rascunho</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          {/* ── TAB: Etapas ── */}
          <TabsContent value="stages" className="px-6 pb-4 mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Blocos do Formulário</Label>
              <div className="flex items-center gap-2">
                {stages.length === 0 && ['aep', 'aet', 'psicossocial'].includes(form.tipo) && (
                  <Button type="button" size="sm" variant="outline" className="text-xs h-7"
                    onClick={() => setStages(getDefaultStagesForType(form.tipo))}>
                    Carregar Padrão {form.tipo.toUpperCase()}
                  </Button>
                )}
                <Button type="button" size="sm" variant="ghost" className="text-xs h-7 text-muted-foreground hover:text-foreground" onClick={addStage}>+ Bloco</Button>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">Configure blocos para organizar as perguntas em seções.{stages.length === 0 && ['aep', 'aet', 'psicossocial'].includes(form.tipo) ? ' Use "Carregar Padrão" para importar a estrutura oficial.' : ''}</p>

            {stages.map((stage, si) => (
              <div key={si} className="rounded-lg p-3 space-y-2 border border-border bg-card">
                <div className="flex items-start gap-2">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-muted-foreground shrink-0">BLOCO {si + 1}</span>
                      <Input value={stage.titulo} onChange={e => updateStage(si, 'titulo', e.target.value)} className="h-8 text-xs flex-1" placeholder="Nome do bloco" maxLength={100} />
                    </div>
                    <Input value={stage.descricao} onChange={e => updateStage(si, 'descricao', e.target.value)} className="h-7 text-[11px]" placeholder="Descrição (opcional)" maxLength={300} />
                  </div>
                  <Button type="button" size="sm" variant="ghost" className="h-7 w-7 text-destructive/50 hover:text-destructive text-xs p-0" onClick={() => removeStage(si)}>×</Button>
                </div>
              </div>
            ))}

            {stages.length === 0 && <p className="text-[10px] text-muted-foreground text-center py-2">Nenhum bloco. Clique em "+ Bloco".</p>}
          </TabsContent>

          {/* ── TAB: Perguntas ── */}
          <TabsContent value="questions" className="px-6 pb-4 mt-4 space-y-4">
            {stages.length === 0 ? (
              <p className="text-[10px] text-muted-foreground text-center py-4">Crie blocos na aba "Blocos" primeiro para adicionar perguntas.</p>
            ) : (
              stages.map((stage, si) => (
                <div key={si} className="rounded-lg p-3 space-y-3 border border-border bg-card">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">{stage.titulo || `Bloco ${si + 1}`}</span>
                    <Button type="button" size="sm" variant="ghost" className="text-[10px] h-6 text-muted-foreground hover:text-foreground" onClick={() => addPergunta(si)}>+ Pergunta</Button>
                  </div>

                  {stage.perguntas.map((q, qi) => (
                    <div key={qi} className="rounded p-2 space-y-1.5 border border-border/50 bg-muted/20">
                      <div className="flex items-start gap-1.5">
                        <div className="flex-1 space-y-1.5">
                          <Input value={q.pergunta} onChange={e => updatePergunta(si, qi, 'pergunta', e.target.value)} className="h-7 text-[11px]" placeholder={`Pergunta ${qi + 1}`} maxLength={300} />
                           <div className="flex items-center gap-2">
                              <Switch checked={q.obrigatoria} onCheckedChange={v => updatePergunta(si, qi, 'obrigatoria', v)} />
                              <span className="text-[10px] text-muted-foreground">Obrigatória</span>
                            </div>
                        </div>
                        <Button type="button" size="sm" variant="ghost" className="h-6 w-6 text-destructive/50 hover:text-destructive text-xs p-0 shrink-0" onClick={() => removePergunta(si, qi)}>×</Button>
                      </div>
                      <div className="space-y-1 pl-1">
                        <span className="text-[9px] text-muted-foreground">Opções (texto + peso)</span>
                        {q.opcoes.map((op, oi) => (
                          <div key={oi} className="flex items-center gap-1">
                            <Input value={op.texto} onChange={e => updateOpcao(si, qi, oi, 'texto', e.target.value)} className="flex-1 h-6 text-[10px]" placeholder={`Opção ${oi + 1}`} maxLength={200} />
                            <Input type="number" value={op.peso} onChange={e => updateOpcao(si, qi, oi, 'peso', Number(e.target.value))} className="w-14 h-6 text-[10px] text-center" placeholder="Peso" min={0} max={100} />
                            {q.opcoes.length > 2 && (
                              <Button type="button" size="sm" variant="ghost" className="h-6 w-6 text-destructive/40 hover:text-destructive text-[10px] p-0" onClick={() => removeOpcao(si, qi, oi)}>×</Button>
                            )}
                          </div>
                        ))}
                        {q.opcoes.length < 6 && (
                          <Button type="button" size="sm" variant="ghost" className="text-[9px] h-5 px-1 text-muted-foreground hover:text-foreground" onClick={() => addOpcao(si, qi)}>+ Opção</Button>
                        )}
                      </div>
                    </div>
                  ))}

                  {stage.perguntas.length === 0 && <p className="text-[9px] text-muted-foreground text-center py-1">Nenhuma pergunta neste bloco.</p>}
                </div>
              ))
            )}
          </TabsContent>

          {/* ── TAB: Comportamental (DISC) ── */}
          <TabsContent value="behavioral" className="px-6 pb-4 mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Teste Comportamental (DISC)</Label>
              <div className="flex items-center gap-2">
                <Switch checked={behavioralEnabled} onCheckedChange={v => { setBehavioralEnabled(v); if (v && behavioralQuestions.length === 0) loadDefaultBehavioral(); }} />
                <span className="text-[10px] text-muted-foreground">Ativar teste</span>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">Defina perguntas com 4 opções (uma para cada perfil DISC: D-Dominância, I-Influência, S-Estabilidade, C-Conformidade). As respostas serão registradas no dossiê do colaborador.</p>

            {behavioralEnabled && (
              <>
                <div className="flex items-center gap-2">
                  <Button type="button" size="sm" variant="ghost" className="text-xs h-7 text-muted-foreground hover:text-foreground" onClick={addBehavioralQ}>+ Pergunta</Button>
                  {behavioralQuestions.length === 0 && (
                    <Button type="button" size="sm" variant="ghost" className="text-xs h-7 text-muted-foreground hover:text-foreground" onClick={loadDefaultBehavioral}>Carregar Padrão DISC</Button>
                  )}
                </div>

                {behavioralQuestions.map((q, qi) => (
                  <div key={qi} className="rounded-lg p-3 space-y-2 border border-border bg-card">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-muted-foreground shrink-0">{qi + 1}.</span>
                          <Input value={q.pergunta} onChange={e => updateBehavioralQ(qi, e.target.value)} className="h-8 text-xs flex-1" placeholder="Pergunta comportamental" maxLength={300} />
                        </div>
                        <div className="space-y-1 pl-4">
                          {q.opcoes.map((op, oi) => (
                            <div key={oi} className="flex items-center gap-2">
                              <span className={`text-[10px] font-bold shrink-0 w-4 text-center ${
                                op.perfil === 'D' ? 'text-destructive' :
                                op.perfil === 'I' ? 'text-yellow-600' :
                                op.perfil === 'S' ? 'text-blue-600' :
                                'text-emerald-600'
                              }`}>{op.perfil}</span>
                              <Input value={op.label} onChange={e => updateBehavioralOp(qi, oi, 'label', e.target.value)} className="flex-1 h-7 text-[11px]" placeholder={`Opção ${op.perfil}`} maxLength={200} />
                              <Select value={op.perfil} onValueChange={v => updateBehavioralOp(qi, oi, 'perfil', v)}>
                                <SelectTrigger className="w-16 h-7 text-[10px]"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {DISC_PROFILES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                          ))}
                        </div>
                      </div>
                      <Button type="button" size="sm" variant="ghost" className="h-7 w-7 text-destructive/50 hover:text-destructive text-xs p-0 shrink-0" onClick={() => removeBehavioralQ(qi)}>×</Button>
                    </div>
                  </div>
                ))}

                {behavioralQuestions.length === 0 && <p className="text-[10px] text-muted-foreground text-center py-2">Nenhuma pergunta. Clique em "+ Pergunta" ou "Carregar Padrão DISC".</p>}
              </>
            )}
          </TabsContent>
        </Tabs>

        {/* Save button */}
        <div className="px-6 pb-6">
          <Button onClick={handleSave} disabled={!form.nome || saving} className="w-full">
            {saving ? 'Salvando...' : editId ? 'Atualizar Formulário' : 'Criar Formulário'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/* ═══════════════════════════════════════════
   MAIN TEMPLATES TAB
   ═══════════════════════════════════════════ */
interface TemplatesTabProps {
  selectedEmpresa?: string;
  onSelectedEmpresaChange?: (v: string) => void;
  externalNewTrigger?: number;
}

const FILTER_TIPOS = [
  { value: '__all__', label: 'Todos os Tipos' },
  { value: 'aep', label: 'AEP' },
  { value: 'aet', label: 'AET' },
  { value: 'psicossocial', label: 'Psicossocial' },
  { value: 'checklist', label: 'Checklist' },
  { value: 'plano_acao', label: 'Plano de Ação' },
  { value: 'formulario_custom', label: 'Customizado' },
];

const FILTER_STATUS = [
  { value: '__all__', label: 'Todos os Status' },
  { value: 'ativo', label: 'Ativo' },
  { value: 'arquivado', label: 'Arquivado' },
  { value: 'inativo', label: 'Inativo' },
];

const TemplatesTab = ({ selectedEmpresa: externalEmpresa, onSelectedEmpresaChange, externalNewTrigger }: TemplatesTabProps = {}) => {
  const { user, isAdmin, isConsultor } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [internalEmpresa, setInternalEmpresa] = useState('');
  const selectedEmpresa = externalEmpresa ?? internalEmpresa;
  const setSelectedEmpresa = onSelectedEmpresaChange ?? setInternalEmpresa;
  const [showEditor, setShowEditor] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Filters
  const [filterTipo, setFilterTipo] = useState('__all__');
  const [filterStatus, setFilterStatus] = useState('__all__');
  const [filterPadrao, setFilterPadrao] = useState('__all__');
  const [searchName, setSearchName] = useState('');
  const [showFilters, setShowFilters] = useState<boolean>(false);

  const { data: empresas } = useQuery({
    queryKey: ['empresas-templates', user?.id, isConsultor],
    queryFn: async () => {
      if (isConsultor && !isAdmin && user?.id) {
        const { data: links } = await supabase.from('consultor_empresas').select('empresa_id').eq('user_id', user.id).eq('ativo', true);
        const ids = (links || []).map(l => l.empresa_id);
        if (ids.length === 0) return [];
        const { data } = await supabase.from('empresas').select('id, razao_social, nome_fantasia').in('id', ids).eq('ativa', true).order('razao_social');
        return data ?? [];
      }
      const { data } = await supabase.from('empresas').select('id, razao_social, nome_fantasia').eq('ativa', true).order('razao_social');
      return data ?? [];
    },
  });

  // Fetch ALL templates (no server filter except empresa scope)
  const { data: templates, isLoading } = useQuery({
    queryKey: ['form-templates', selectedEmpresa],
    queryFn: async () => {
      let query = supabase.from('form_templates').select('*').order('created_at', { ascending: false });
      if (selectedEmpresa && selectedEmpresa !== '__global__') {
        query = query.or(`empresa_id.eq.${selectedEmpresa},is_global.eq.true`);
      }
      const { data } = await query;
      return (data || []) as any[];
    },
  });

  // Fetch usage counts from assessments
  const { data: usageCounts } = useQuery({
    queryKey: ['template-usage-counts'],
    queryFn: async () => {
      // Count assessments per type as a proxy for template usage
      const { data: assessments } = await supabase.from('assessments').select('type, created_at');
      const counts: Record<string, { count: number; lastUsed: string | null }> = {};
      if (assessments) {
        for (const a of assessments) {
          const key = a.type?.toLowerCase();
          if (!counts[key]) counts[key] = { count: 0, lastUsed: null };
          counts[key].count++;
          if (!counts[key].lastUsed || a.created_at > counts[key].lastUsed!) {
            counts[key].lastUsed = a.created_at;
          }
        }
      }
      return counts;
    },
  });

  // Client-side filtering
  const filteredTemplates = (templates || []).filter((t: any) => {
    if (filterTipo !== '__all__' && t.tipo !== filterTipo) return false;
    if (filterStatus !== '__all__' && t.status !== filterStatus) return false;
    if (filterPadrao === 'padrao' && !t.is_default) return false;
    if (filterPadrao === 'normal' && t.is_default) return false;
    if (searchName && !t.nome.toLowerCase().includes(searchName.toLowerCase())) return false;
    return true;
  });

  // Set as default
  const setAsDefault = useMutation({
    mutationFn: async (template: any) => {
      // Unset other defaults of same tipo + empresa scope
      const matchQuery = supabase.from('form_templates').update({ is_default: false } as any).eq('tipo', template.tipo).eq('is_default', true);
      if (template.empresa_id) {
        await matchQuery.eq('empresa_id', template.empresa_id);
      } else {
        await matchQuery.is('empresa_id', null);
      }
      // Set this one
      await supabase.from('form_templates').update({ is_default: true } as any).eq('id', template.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['form-templates'] });
      toast({ title: 'Formulário definido como padrão!' });
    },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  // Remove default
  const removeDefault = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('form_templates').update({ is_default: false } as any).eq('id', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['form-templates'] });
      toast({ title: 'Padrão removido' });
    },
  });

  // Archive
  const archiveTemplate = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('form_templates').update({ status: 'arquivado', is_default: false } as any).eq('id', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['form-templates'] });
      toast({ title: 'Formulário arquivado' });
    },
  });

  const duplicateTemplate = useMutation({
    mutationFn: async (templateId: string) => {
      const { data: orig } = await supabase.from('form_templates' as any).select('*').eq('id', templateId).single();
      if (!orig) throw new Error('Template não encontrado');
      const o = orig as any;
      const newVersion = (o.versao || 1) + 1;
      const { data: newT, error } = await supabase.from('form_templates' as any).insert({
        nome: `${o.nome} (v${newVersion})`, tipo: o.tipo, status: 'ativo',
        versao: newVersion, is_default: false,
        empresa_id: selectedEmpresa && selectedEmpresa !== '__global__' ? selectedEmpresa : o.empresa_id,
        is_global: false, created_by: user?.id,
      } as any).select('id').single();
      if (error) throw error;

      // Copy sections
      const { data: sections } = await supabase.from('form_template_sections' as any).select('*').eq('template_id', templateId).order('ordem');
      const sectionMap: Record<string, string> = {};
      if (sections) {
        for (const s of sections as any[]) {
          const { data: ns } = await supabase.from('form_template_sections' as any).insert({
            template_id: (newT as any).id, nome: s.nome, descricao: s.descricao, ordem: s.ordem,
          } as any).select('id').single();
          if (ns) sectionMap[s.id] = (ns as any).id;
        }
      }

      // Copy questions + options
      const { data: qs } = await supabase.from('form_template_questions' as any).select('*').eq('template_id', templateId);
      if (qs && qs.length > 0) {
        for (const q of qs as any[]) {
          const { data: newQ } = await supabase.from('form_template_questions' as any).insert({
            template_id: (newT as any).id, texto: q.texto, tipo_resposta: q.tipo_resposta,
            ordem: q.ordem, peso: q.peso, obrigatoria: q.obrigatoria, eliminatoria: q.eliminatoria,
            ativa: q.ativa, observacao: q.observacao, permite_comentario: q.permite_comentario,
            section_id: q.section_id ? sectionMap[q.section_id] || null : null,
          } as any).select('id').single();
          const { data: opts } = await supabase.from('form_template_options' as any).select('*').eq('question_id', q.id);
          if (opts && opts.length > 0 && newQ) {
            await supabase.from('form_template_options' as any).insert(
              (opts as any[]).map(o => ({ question_id: (newQ as any).id, texto: o.texto, valor: o.valor, peso: o.peso, ordem: o.ordem, perfil: o.perfil }))
            );
          }
        }
      }

      // Mark original as replaced
      await supabase.from('form_templates').update({ replaced_by: (newT as any).id } as any).eq('id', templateId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['form-templates'] });
      toast({ title: 'Formulário duplicado com nova versão' });
    },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const deleteTemplate = useMutation({
    mutationFn: async (template: any) => {
      // Check if in use
      const usage = usageCounts?.[template.tipo?.toLowerCase()] || { count: 0 };
      if (template.is_default) {
        throw new Error('Não é possível excluir um formulário padrão. Remova o padrão primeiro.');
      }
      if (usage.count > 0) {
        throw new Error('Este formulário está em uso. Arquive-o em vez de excluir.');
      }
      const { data: qs } = await supabase.from('form_template_questions' as any).select('id').eq('template_id', template.id);
      if (qs && qs.length > 0) {
        await supabase.from('form_template_options' as any).delete().in('question_id', (qs as any[]).map(q => q.id));
      }
      await supabase.from('form_template_questions' as any).delete().eq('template_id', template.id);
      await supabase.from('form_template_sections' as any).delete().eq('template_id', template.id);
      await supabase.from('form_templates' as any).delete().eq('id', template.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['form-templates'] });
      toast({ title: 'Formulário removido' });
    },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const openNew = () => { setEditingId(null); setShowEditor(true); };
  const openEdit = (id: string) => { setEditingId(id); setShowEditor(true); };
  const handleClose = () => { setShowEditor(false); setEditingId(null); };
  const handleSaved = () => {
    queryClient.invalidateQueries({ queryKey: ['form-templates'] });
    handleClose();
  };

  // Handle external new trigger
  const [lastTrigger, setLastTrigger] = useState(0);
  useEffect(() => {
    if (externalNewTrigger && externalNewTrigger !== lastTrigger) {
      setLastTrigger(externalNewTrigger);
      openNew();
    }
  }, [externalNewTrigger]);

  const showInternalToolbar = !externalEmpresa && !onSelectedEmpresaChange;

  const getEmpresaName = (empresaId: string | null) => {
    if (!empresaId) return 'Global';
    const emp = empresas?.find(e => e.id === empresaId);
    return emp?.nome_fantasia || emp?.razao_social || '—';
  };

  const getUsageForTemplate = (t: any) => {
    return usageCounts?.[t.tipo?.toLowerCase()] || { count: 0, lastUsed: null };
  };

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      {showInternalToolbar && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px] max-w-sm space-y-1">
            <Label className="text-xs text-muted-foreground">Empresa</Label>
            <Select value={selectedEmpresa} onValueChange={setSelectedEmpresa}>
              <SelectTrigger><SelectValue placeholder="Todas / Global" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__global__">Global (Padrão do Sistema)</SelectItem>
                {empresas?.map(e => <SelectItem key={e.id} value={e.id}>{e.razao_social}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 self-end">
            <Button variant="outline" size="sm" onClick={() => setShowFilters(prev => !prev)} className="gap-1.5">
              <span className="text-xs">Filtros</span>
              {(filterTipo !== '__all__' || filterStatus !== '__all__' || filterPadrao !== '__all__' || searchName) && (
                <Badge className="h-5 w-5 p-0 flex items-center justify-center text-[10px]">!</Badge>
              )}
            </Button>
            {(filterTipo !== '__all__' || filterStatus !== '__all__' || filterPadrao !== '__all__' || searchName) && (
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => { setFilterTipo('__all__'); setFilterStatus('__all__'); setFilterPadrao('__all__'); setSearchName(''); }}>
                Limpar
              </Button>
            )}
          </div>
          <Button onClick={openNew} className="self-end ml-auto">Novo Formulário</Button>
        </div>
      )}

      {showFilters && (
        <div className="flex flex-wrap items-end gap-3 p-3 rounded-xl bg-muted/30 border border-border animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="min-w-[160px] space-y-1">
            <Label className="text-xs text-muted-foreground">Buscar</Label>
            <Input placeholder="Nome..." value={searchName} onChange={e => setSearchName(e.target.value)} className="h-8 text-sm" />
          </div>
          <div className="min-w-[120px] space-y-1">
            <Label className="text-xs text-muted-foreground">Tipo</Label>
            <Select value={filterTipo} onValueChange={setFilterTipo}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>{FILTER_TIPOS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="min-w-[120px] space-y-1">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>{FILTER_STATUS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="min-w-[120px] space-y-1">
            <Label className="text-xs text-muted-foreground">Padrão</Label>
            <Select value={filterPadrao} onValueChange={setFilterPadrao}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos</SelectItem>
                <SelectItem value="padrao">Somente Padrão</SelectItem>
                <SelectItem value="normal">Não-Padrão</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : filteredTemplates.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>Versão</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Padrão</TableHead>
              <TableHead>Uso</TableHead>
              <TableHead>Último Uso</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTemplates.map((t: any) => {
              const usage = getUsageForTemplate(t);
              return (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.nome}</TableCell>
                  <TableCell><Badge variant="secondary">{t.tipo?.toUpperCase()}</Badge></TableCell>
                  <TableCell>
                    {t.is_global 
                      ? <Badge variant="secondary">Global</Badge>
                      : <span className="text-sm">{getEmpresaName(t.empresa_id)}</span>
                    }
                  </TableCell>
                  <TableCell>v{t.versao || 1}</TableCell>
                  <TableCell>
                    {t.status === 'ativo' && <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50">Ativo</Badge>}
                    {t.status === 'arquivado' && <Badge variant="outline" className="text-muted-foreground">Arquivado</Badge>}
                    {t.status === 'inativo' && <Badge variant="secondary">Inativo</Badge>}
                    {!['ativo', 'arquivado', 'inativo'].includes(t.status) && <Badge variant="secondary">{t.status}</Badge>}
                  </TableCell>
                  <TableCell>
                    {t.is_default 
                      ? <Badge className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50">Padrão</Badge>
                      : <span className="text-xs text-muted-foreground">—</span>
                    }
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-medium">{usage.count}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">
                      {usage.lastUsed ? new Date(usage.lastUsed).toLocaleDateString('pt-BR') : '—'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-7 w-7 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onClick={() => openEdit(t.id)}>Editar</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => duplicateTemplate.mutate(t.id)}>Duplicar</DropdownMenuItem>
                        {t.status === 'ativo' && !t.is_default && (
                          <DropdownMenuItem onClick={() => setAsDefault.mutate(t)}>Definir Padrão</DropdownMenuItem>
                        )}
                        {t.is_default && (
                          <DropdownMenuItem onClick={() => removeDefault.mutate(t.id)} className="text-warning">Remover Padrão</DropdownMenuItem>
                        )}
                        {t.status === 'ativo' && (
                          <DropdownMenuItem onClick={() => archiveTemplate.mutate(t.id)} className="text-warning">Arquivar</DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => deleteTemplate.mutate(t)} className="text-destructive">Excluir</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-8">Nenhum formulário encontrado.</p>
      )}

      {/* Editor Modal */}
      <TemplateEditorModal
        editId={editingId}
        empresaId={selectedEmpresa}
        open={showEditor}
        onClose={handleClose}
        onSaved={handleSaved}
      />
    </div>
  );
};

export default TemplatesTab;
