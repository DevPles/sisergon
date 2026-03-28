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
import { generateAetPdf } from '@/utils/aetPdfReport';
import { fetchCompanyLogoUrl, fetchEvaluatorLabel } from '@/utils/reportBranding';

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

const AETList = () => {
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: assessments, isLoading } = useQuery({
    queryKey: ['aet-list', search],
    queryFn: async () => {
      let query = supabase.from('assessments').select('*, empresas(razao_social)').eq('type', 'aet').order('created_at', { ascending: false });
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
      queryClient.invalidateQueries({ queryKey: ['aet-list'] });
      toast({ title: 'Análise removida' });
    },
  });

  const generatePdf = async (assessment: any) => {
    try {
      const [itemsRes, empRes, unidadeRes, setorRes, cargoRes, colaboradorRes, companyLogoUrl, evaluatorLabel] = await Promise.all([
        supabase.from('assessment_items').select('*').eq('assessment_id', assessment.id),
        supabase.from('empresas').select('*').eq('id', assessment.empresa_id).single(),
        assessment.unidade_id ? supabase.from('unidades').select('nome').eq('id', assessment.unidade_id).single() : Promise.resolve({ data: null, error: null } as any),
        assessment.setor_id ? supabase.from('setores').select('nome').eq('id', assessment.setor_id).single() : Promise.resolve({ data: null, error: null } as any),
        assessment.cargo_id ? supabase.from('cargos').select('nome, cbo').eq('id', assessment.cargo_id).single() : Promise.resolve({ data: null, error: null } as any),
        assessment.colaborador_id ? supabase.from('colaboradores').select('nome_completo').eq('id', assessment.colaborador_id).single() : Promise.resolve({ data: null, error: null } as any),
        fetchCompanyLogoUrl(assessment.empresa_id),
        fetchEvaluatorLabel(assessment.evaluator_id, 'Equipe Técnica ERGON'),
      ]);

      if (itemsRes.error) throw itemsRes.error;
      if (empRes.error) throw empRes.error;

      const items = itemsRes.data || [];
      const checklist = items
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

      const sectionEntriesFromDescription = extractAetDescriptionEntries(assessment.description);

      const sectionEntries = sectionEntriesFromItems.length > 0
        ? sectionEntriesFromItems
        : sectionEntriesFromDescription.length > 0
          ? sectionEntriesFromDescription
          : [{ title: 'Descrição técnica da AET', content: 'Sem conteúdo detalhado salvo para esta AET.' }];

      const normalizedChecklist = checklist.length > 0
        ? checklist
        : [{ label: 'Checklist NR-17 não registrado nesta avaliação', checked: false }];

      const conformidade = normalizedChecklist.length
        ? Math.round((normalizedChecklist.filter((item) => item.checked).length / normalizedChecklist.length) * 100)
        : undefined;

      await generateAetPdf({
        title: assessment.title || 'Sem título',
        empresa: empRes.data?.razao_social || (assessment.empresas as any)?.razao_social || '',
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
        date: format(new Date(assessment.created_at), 'dd/MM/yyyy'),
        finalizedAt: assessment.finalized_at ? format(new Date(assessment.finalized_at), 'dd/MM/yyyy') : undefined,
        completionPercent: conformidade,
        sectionEntries,
        checklist: normalizedChecklist,
      }, {
        autoDownload: true,
      });

      toast({ title: 'Laudo PDF da AET gerado com sucesso' });
    } catch (err: any) {
      toast({ title: 'Erro ao gerar PDF da AET', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Análises AET</h1>
          <p className="text-muted-foreground">Análise Ergonômica do Trabalho — NR-17 item 17.3.3</p>
        </div>
        <div className="flex items-center gap-3">
          <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-[220px]" />
          <span className="text-sm text-muted-foreground whitespace-nowrap">{assessments?.length ?? 0} registros</span>
          <Button onClick={() => navigate('/aet/nova')}>Nova AET</Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : assessments?.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhuma análise AET cadastrada</TableCell></TableRow>
              ) : (
                assessments?.map((a) => (
                  <TableRow key={a.id} className="cursor-pointer" onClick={() => navigate(`/aet/${a.id}`)}>
                    <TableCell className="font-medium">{a.title || 'Sem título'}</TableCell>
                    <TableCell>{(a.empresas as any)?.razao_social || '—'}</TableCell>
                    <TableCell><Badge variant={a.status === 'finalizado' ? 'default' : 'secondary'}>{a.status}</Badge></TableCell>
                    <TableCell>{format(new Date(a.created_at), 'dd/MM/yyyy')}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/aet/${a.id}`)}>Editar</Button>
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

export default AETList;
