import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend } from 'recharts';

const COLORS = ['hsl(215, 60%, 22%)', 'hsl(200, 70%, 42%)', 'hsl(38, 92%, 50%)', 'hsl(0, 72%, 51%)', 'hsl(142, 60%, 40%)'];

const DashboardExecutivoTab = () => {
  const { data } = useQuery({
    queryKey: ['dashboard-executivo'],
    queryFn: async () => {
      const [empresas, assessments, riskEvents, actionPlans, colaboradores] = await Promise.all([
        supabase.from('empresas').select('id, razao_social, ativa'),
        supabase.from('assessments').select('id, empresa_id, type, status, risk_classification, created_at, score_total'),
        supabase.from('risk_events').select('id, assessment_id, classification, risk_score, hazard'),
        supabase.from('action_plans').select('id, empresa_id, status, priority'),
        supabase.from('colaboradores').select('id, empresa_id'),
      ]);
      return {
        empresas: empresas.data ?? [],
        assessments: assessments.data ?? [],
        riskEvents: riskEvents.data ?? [],
        actionPlans: actionPlans.data ?? [],
        colaboradores: colaboradores.data ?? [],
      };
    },
  });

  if (!data) return <p className="text-muted-foreground py-8 text-center">Carregando...</p>;

  // Ranking de risco por empresa
  const empresaRiskMap: Record<string, { name: string; critico: number; alto: number; moderado: number; baixo: number; total: number }> = {};
  data.empresas.forEach((e: any) => {
    empresaRiskMap[e.id] = { name: e.razao_social, critico: 0, alto: 0, moderado: 0, baixo: 0, total: 0 };
  });
  data.assessments.forEach((a: any) => {
    if (empresaRiskMap[a.empresa_id] && a.risk_classification) {
      empresaRiskMap[a.empresa_id][a.risk_classification as 'critico' | 'alto' | 'moderado' | 'baixo']++;
      empresaRiskMap[a.empresa_id].total++;
    }
  });
  const rankingRisco = Object.values(empresaRiskMap).sort((a, b) => (b.critico + b.alto) - (a.critico + a.alto));

  // Distribuição de risco (pie)
  const riskDist = [
    { name: 'Crítico', value: data.riskEvents.filter((r: any) => r.classification === 'critico').length },
    { name: 'Alto', value: data.riskEvents.filter((r: any) => r.classification === 'alto').length },
    { name: 'Moderado', value: data.riskEvents.filter((r: any) => r.classification === 'moderado').length },
    { name: 'Baixo', value: data.riskEvents.filter((r: any) => r.classification === 'baixo').length },
  ].filter(d => d.value > 0);

  // Evolução temporal (por mês)
  const monthMap: Record<string, number> = {};
  data.assessments.forEach((a: any) => {
    const month = a.created_at?.substring(0, 7);
    if (month) monthMap[month] = (monthMap[month] || 0) + 1;
  });
  const evolutionData = Object.entries(monthMap).sort().map(([month, count]) => ({ month, avaliacoes: count }));

  // Comparativo empresas (bar)
  const empresaCompare = data.empresas.map((e: any) => ({
    name: e.razao_social?.substring(0, 15),
    avaliacoes: data.assessments.filter((a: any) => a.empresa_id === e.id).length,
    colaboradores: data.colaboradores.filter((c: any) => c.empresa_id === e.id).length,
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribuição de Risco */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Distribuição de Risco</h3>
            {riskDist.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={riskDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name}: ${value}`}>
                    {riskDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-center py-8">Sem dados</p>
            )}
          </CardContent>
        </Card>

        {/* Evolução Temporal */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Evolução de Avaliações</h3>
            {evolutionData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={evolutionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="avaliacoes" stroke="hsl(215, 60%, 22%)" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-center py-8">Sem dados</p>
            )}
          </CardContent>
        </Card>

        {/* Comparativo entre Empresas */}
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Comparativo entre Empresas</h3>
            {empresaCompare.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={empresaCompare}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="avaliacoes" name="Avaliações" fill="hsl(215, 60%, 22%)" />
                  <Bar dataKey="colaboradores" name="Colaboradores" fill="hsl(200, 70%, 42%)" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-center py-8">Sem dados</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Ranking de Risco */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">Ranking de Risco por Empresa</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead>Crítico</TableHead>
                <TableHead>Alto</TableHead>
                <TableHead>Moderado</TableHead>
                <TableHead>Baixo</TableHead>
                <TableHead>Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rankingRisco.map((r) => (
                <TableRow key={r.name}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell>{r.critico > 0 ? <Badge variant="destructive">{r.critico}</Badge> : '0'}</TableCell>
                  <TableCell>{r.alto > 0 ? <Badge variant="destructive">{r.alto}</Badge> : '0'}</TableCell>
                  <TableCell>{r.moderado}</TableCell>
                  <TableCell>{r.baixo}</TableCell>
                  <TableCell className="font-semibold">{r.total}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardExecutivoTab;
