import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface Props { eventos: any[]; programas: any[]; }

const PCMSODashboard = ({ eventos, programas }: Props) => {
  const today = new Date();
  const in30 = new Date(); in30.setDate(today.getDate() + 30);

  const vencidos = eventos.filter(e => !e.data_realizada && e.data_prevista && new Date(e.data_prevista) < today);
  const pendentes = eventos.filter(e => !e.data_realizada);
  const proximosVencer = eventos.filter(e => !e.data_realizada && e.data_prevista && new Date(e.data_prevista) >= today && new Date(e.data_prevista) <= in30);
  const realizados = eventos.filter(e => !!e.data_realizada);
  const aptos = eventos.filter(e => e.resultado === 'apto');
  const inaptos = eventos.filter(e => e.resultado === 'inapto' || e.resultado === 'apto_restricao');
  const programasAtivos = programas.filter(p => p.status === 'ativo');

  const conformidade = eventos.length > 0 ? Math.round((realizados.length / eventos.length) * 100) : 100;

  const stats = [
    { label: 'Exames Vencidos', value: vencidos.length, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950/30', border: 'border-red-200 dark:border-red-900', urgent: vencidos.length > 0 },
    { label: 'Próximos 30 dias', value: proximosVencer.length, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200 dark:border-amber-900', urgent: proximosVencer.length > 0 },
    { label: 'Pendentes', value: pendentes.length, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-blue-200 dark:border-blue-900', urgent: false },
    { label: 'Realizados', value: realizados.length, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-950/30', border: 'border-green-200 dark:border-green-900', urgent: false },
    { label: 'Aptos', value: aptos.length, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-950/30', border: 'border-green-200 dark:border-green-900', urgent: false },
    { label: 'Inaptos / Restrição', value: inaptos.length, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950/30', border: 'border-red-200 dark:border-red-900', urgent: inaptos.length > 0 },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {stats.map(s => (
          <Card key={s.label} className={`${s.bg} ${s.border} border`}>
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              {s.urgent && <Badge variant="destructive" className="mt-2 text-[10px]">Ação necessária</Badge>}
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium">Conformidade PCMSO</p>
            <p className="text-sm font-bold">{conformidade}%</p>
          </div>
          <Progress value={conformidade} className="h-3" />
          <p className="text-xs text-muted-foreground mt-2">{programasAtivos.length} programa(s) ativo(s) · {eventos.length} evento(s) total</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PCMSODashboard;
