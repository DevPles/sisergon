import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

const IndicadoresTab = () => {
  const { data: stats } = useQuery({
    queryKey: ['indicadores-globais'],
    queryFn: async () => {
      const [empresas, colaboradores, assessments, laudos, plansAll, checklists, riskEvents] = await Promise.all([
        supabase.from('empresas').select('id, ativa', { count: 'exact' }),
        supabase.from('colaboradores').select('id', { count: 'exact' }),
        supabase.from('assessments').select('id, type, status, risk_classification'),
        supabase.from('assessments').select('id', { count: 'exact', head: true }).eq('status', 'finalizado'),
        supabase.from('action_plans').select('id, status'),
        supabase.from('checklists').select('id', { count: 'exact' }),
        supabase.from('risk_events').select('id, classification'),
      ]);

      const ativas = empresas.data?.filter((e: any) => e.ativa).length ?? 0;
      const totalAssessments = assessments.data?.length ?? 0;
      const criticos = riskEvents.data?.filter((r: any) => r.classification === 'critico').length ?? 0;
      const altos = riskEvents.data?.filter((r: any) => r.classification === 'alto').length ?? 0;
      const plansConcluidos = plansAll.data?.filter((p: any) => p.status === 'concluido').length ?? 0;
      const plansTotal = plansAll.data?.length ?? 0;
      const taxaResolucao = plansTotal > 0 ? Math.round((plansConcluidos / plansTotal) * 100) : 0;

      return {
        empresasAtivas: ativas,
        totalEmpresas: empresas.count ?? 0,
        colaboradores: colaboradores.count ?? 0,
        avaliacoes: totalAssessments,
        laudos: laudos.count ?? 0,
        riscosCriticos: criticos,
        riscosAltos: altos,
        checklists: checklists.count ?? 0,
        taxaResolucao,
        plansTotal,
        plansConcluidos,
      };
    },
  });

  const cards = [
    { label: 'Empresas Ativas', value: stats?.empresasAtivas ?? 0 },
    { label: 'Colaboradores Monitorados', value: stats?.colaboradores ?? 0 },
    { label: 'Avaliações Realizadas', value: stats?.avaliacoes ?? 0 },
    { label: 'Laudos Emitidos', value: stats?.laudos ?? 0 },
    { label: 'Riscos Críticos', value: stats?.riscosCriticos ?? 0, danger: true },
    { label: 'Riscos Altos', value: stats?.riscosAltos ?? 0, danger: true },
    { label: 'Checklists Respondidos', value: stats?.checklists ?? 0 },
    { label: 'Taxa de Resolução de Planos', value: `${stats?.taxaResolucao ?? 0}%` },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground mb-1">{c.label}</p>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-bold">{c.value}</span>
                {c.danger && Number(c.value) > 0 && <Badge variant="destructive">Atenção</Badge>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">Resumo de Planos de Ação</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-3xl font-bold">{stats?.plansTotal ?? 0}</p>
              <p className="text-sm text-muted-foreground">Total</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-green-600">{stats?.plansConcluidos ?? 0}</p>
              <p className="text-sm text-muted-foreground">Concluídos</p>
            </div>
            <div>
              <p className="text-3xl font-bold">{stats?.taxaResolucao ?? 0}%</p>
              <p className="text-sm text-muted-foreground">Taxa de Resolução</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default IndicadoresTab;
