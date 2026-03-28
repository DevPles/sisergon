import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { generateAepPdf } from '@/utils/aepPdfReport';
import { fetchCompanyLogoUrl, fetchEvaluatorLabel } from '@/utils/reportBranding';

const AEP_BLOCKS_DEF = [
  {
    domain: 'posturas',
    label: 'Bloco A — Posturas e alcances',
    weight: 25,
    questions: [
      'Tronco inclinado/rotacionado por períodos significativos',
      'Pescoço em flexão/extensão sustentada',
      'Ombros elevados/braços acima do ombro frequentes',
      'Alcances longos ou trabalho fora da zona confortável',
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
      'Preensão forte/pinça fina prolongada',
      'Contato mecânico em mãos/antebraço',
      'Vibração significativa',
    ],
  },
  {
    domain: 'repetitividade',
    label: 'Bloco C — Repetitividade e ritmo',
    weight: 15,
    questions: [
      'Ciclos curtos com repetição do mesmo gesto',
      'Metas/ritmo rígido com baixa autonomia',
      'Pausas insuficientes para recuperação',
      'Picos de demanda sem ajuste de recursos',
      'Pressão temporal constante',
    ],
  },
  {
    domain: 'posto',
    label: 'Bloco D — Posto, mobiliário e ferramentas',
    weight: 10,
    questions: [
      'Altura do plano de trabalho inadequada',
      'Cadeira/mesa sem ajustes mínimos',
      'Layout obriga torções/alcances evitáveis',
      'Ferramentas inadequadas ou sem manutenção',
      'Tela/teclado/mouse mal posicionados',
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
      'Rodízio inadequado quando necessário',
      'Jornada/turnos aumentam fadiga sem mitigação',
      'Comunicação operacional falha',
    ],
  },
  {
    domain: 'psicossociais',
    label: 'Bloco G — Psicossociais (ARP)',
    weight: 10,
    questions: [
      'Baixa clareza de papel/função',
      'Falta de suporte da liderança/equipe',
      'Baixo reconhecimento/recompensas desproporcionais',
      'Má gestão de mudanças organizacionais',
      'Comunicação difícil/isolamento',
      'Indícios de assédio/violência/ameaça',
    ],
  },
];

const statusColor = (s: string) => {
  switch (s) {
    case 'finalizado': return 'default';
    case 'em_andamento': return 'secondary';
    case 'rascunho': return 'outline';
    default: return 'destructive';
  }
};

const riskColor = (r: string | null) => {
  switch (r) {
    case 'baixo': return 'secondary';
    case 'moderado': return 'default';
    case 'alto': return 'destructive';
    case 'critico': return 'destructive';
    default: return 'outline';
  }
};

const AEPList = () => {
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: assessments, isLoading } = useQuery({
    queryKey: ['aep-list', search],
    queryFn: async () => {
      let query = supabase
        .from('assessments')
        .select('*, empresas(razao_social)')
        .eq('type', 'aep')
        .order('created_at', { ascending: false });
      if (search) query = query.ilike('title', `%${search}%`);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('assessments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aep-list'] });
      toast({ title: 'Avaliação removida' });
    },
  });

  const generatePdf = async (assessment: any) => {
    try {
      const [{ data: items, error: itemsError }, { data: empData, error: empError }, cargoRes, unidadeRes, setorRes, companyLogoUrl, evaluatorLabel] = await Promise.all([
        supabase.from('assessment_items').select('*').eq('assessment_id', assessment.id),
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
        fetchEvaluatorLabel(assessment.evaluator_id, 'Equipe Técnica ERGON'),
      ]);

      if (itemsError) throw itemsError;
      if (empError) throw empError;

      const cargoData = cargoRes?.data ?? null;
      const unidadeData = unidadeRes?.data ?? null;
      const setorData = setorRes?.data ?? null;

      const blocks = AEP_BLOCKS_DEF.map((block) => {
        const blockItems = (items || [])
          .filter((it) => it.domain === block.domain)
          .sort((x, y) => x.question_number - y.question_number);
        const vals = blockItems.map((it) => it.value ?? 0);
        const avg = vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;

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
        empresa: empData?.razao_social || (assessment.empresas as any)?.razao_social || '',
        companyLogoUrl,
        cnpj: empData?.cnpj || undefined,
        cnae: empData?.cnae || undefined,
        grauRisco: empData?.grau_risco || undefined,
        unidade: unidadeData?.nome || undefined,
        setor: setorData?.nome || undefined,
        cargo: cargoData?.nome || undefined,
        cbo: cargoData?.cbo || undefined,
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Avaliações AEP</h1>
          <p className="text-muted-foreground">Avaliação Ergonômica Preliminar — checklist com score automático</p>
        </div>
        <div className="flex items-center gap-3">
          <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-[220px]" />
          <span className="text-sm text-muted-foreground whitespace-nowrap">{assessments?.length ?? 0} registros</span>
          <Button onClick={() => navigate('/aep/nova')}>Nova AEP</Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Risco</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : assessments?.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhuma avaliação AEP cadastrada</TableCell></TableRow>
              ) : (
                assessments?.map((a) => (
                  <TableRow key={a.id} className="cursor-pointer" onClick={() => navigate(`/aep/${a.id}`)}>
                    <TableCell className="font-medium">{a.title || 'Sem título'}</TableCell>
                    <TableCell>{(a.empresas as any)?.razao_social || '—'}</TableCell>
                    <TableCell className="font-mono">{Number(a.score_total).toFixed(1)}</TableCell>
                    <TableCell><Badge variant={riskColor(a.risk_classification)}>{a.risk_classification || '—'}</Badge></TableCell>
                    <TableCell><Badge variant={statusColor(a.status)}>{a.status}</Badge></TableCell>
                    <TableCell>{format(new Date(a.created_at), 'dd/MM/yyyy')}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/aep/${a.id}`)}>Editar</Button>
                        {a.status === 'finalizado' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              void generatePdf(a);
                            }}
                          >
                            Laudo PDF
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteMutation.mutate(a.id)}>Excluir</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AEPList;
