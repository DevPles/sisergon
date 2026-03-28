import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';

const ConsultorDashboard = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  // Empresas vinculadas
  const { data: empresasVinculadas } = useQuery({
    queryKey: ['consultor-empresas', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('consultor_empresas')
        .select('*, empresas(id, razao_social, cnpj, ativa)')
        .eq('user_id', user!.id)
        .eq('ativo', true);
      return data ?? [];
    },
    enabled: !!user?.id,
  });

  // Avaliações em andamento
  const { data: avaliacoesAndamento } = useQuery({
    queryKey: ['consultor-avaliacoes-andamento', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('assessments')
        .select('*, empresas(razao_social)')
        .in('status', ['rascunho', 'em_andamento'])
        .eq('evaluator_id', user!.id)
        .order('updated_at', { ascending: false })
        .limit(10);
      return data ?? [];
    },
    enabled: !!user?.id,
  });

  // Laudos recentes (finalizados)
  const { data: laudosRecentes } = useQuery({
    queryKey: ['consultor-laudos-recentes', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('assessments')
        .select('*, empresas(razao_social)')
        .eq('status', 'finalizado')
        .eq('evaluator_id', user!.id)
        .order('finalized_at', { ascending: false })
        .limit(5);
      return data ?? [];
    },
    enabled: !!user?.id,
  });

  // Planos de ação pendentes
  const { data: planosPendentes } = useQuery({
    queryKey: ['consultor-planos-pendentes'],
    queryFn: async () => {
      const { data } = await supabase
        .from('action_plans')
        .select('*, empresas(razao_social)')
        .in('status', ['pendente', 'em_andamento'])
        .order('due_date', { ascending: true })
        .limit(5);
      return data ?? [];
    },
  });

  // Contagens
  const { data: counts } = useQuery({
    queryKey: ['consultor-counts', user?.id],
    queryFn: async () => {
      const [aval, laudos, planos] = await Promise.all([
        supabase.from('assessments').select('id', { count: 'exact', head: true }).eq('evaluator_id', user!.id),
        supabase.from('assessments').select('id', { count: 'exact', head: true }).eq('evaluator_id', user!.id).eq('status', 'finalizado'),
        supabase.from('action_plans').select('id', { count: 'exact', head: true }).in('status', ['pendente', 'em_andamento']),
      ]);
      return {
        avaliacoes: aval.count ?? 0,
        laudos: laudos.count ?? 0,
        planos: planos.count ?? 0,
        empresas: empresasVinculadas?.length ?? 0,
      };
    },
    enabled: !!user?.id,
  });

  const STATUS_COLORS: Record<string, string> = {
    rascunho: 'bg-muted text-muted-foreground',
    em_andamento: 'bg-blue-500/10 text-blue-700 border-blue-500/30',
    finalizado: 'bg-green-500/10 text-green-700 border-green-500/30',
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Painel do Consultor</h1>
        <p className="text-muted-foreground mt-1">Bem-vindo, {profile?.full_name || user?.email}</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Empresas Vinculadas</p><p className="text-3xl font-bold">{counts?.empresas ?? 0}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Avaliações Realizadas</p><p className="text-3xl font-bold">{counts?.avaliacoes ?? 0}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Laudos Emitidos</p><p className="text-3xl font-bold">{counts?.laudos ?? 0}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Planos Pendentes</p><p className="text-3xl font-bold text-amber-600">{counts?.planos ?? 0}</p></CardContent></Card>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3 mb-6">
        <Button onClick={() => navigate('/aep')} className="rounded-full">Nova AEP</Button>
        <Button onClick={() => navigate('/aet')} variant="outline" className="rounded-full">Nova AET</Button>
        <Button onClick={() => navigate('/riscos-psicossociais')} variant="outline" className="rounded-full">Nova ARP</Button>
        <Button onClick={() => navigate('/cadastros')} variant="outline" className="rounded-full">Cadastros</Button>
        <Button onClick={() => navigate('/laudos')} variant="outline" className="rounded-full">Laudos</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Empresas vinculadas */}
        <Card>
          <CardHeader><CardTitle className="text-base">Empresas sob Gestão</CardTitle></CardHeader>
          <CardContent>
            {empresasVinculadas && empresasVinculadas.length > 0 ? (
              <div className="space-y-2">
                {empresasVinculadas.map((ev: any) => (
                  <div key={ev.id} className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/empresas/${ev.empresas?.id}`)}>
                    <div>
                      <p className="font-medium">{ev.empresas?.razao_social}</p>
                      <p className="text-xs text-muted-foreground">{ev.empresas?.cnpj || 'Sem CNPJ'}</p>
                    </div>
                    <Badge variant={ev.empresas?.ativa ? 'default' : 'destructive'}>{ev.empresas?.ativa ? 'Ativa' : 'Inativa'}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma empresa vinculada</p>
            )}
          </CardContent>
        </Card>

        {/* Avaliações em andamento */}
        <Card>
          <CardHeader><CardTitle className="text-base">Avaliações em Andamento</CardTitle></CardHeader>
          <CardContent>
            {avaliacoesAndamento && avaliacoesAndamento.length > 0 ? (
              <div className="space-y-2">
                {avaliacoesAndamento.map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/${a.type}/${a.id}`)}>
                    <div>
                      <p className="font-medium text-sm">{a.title || 'Sem título'}</p>
                      <p className="text-xs text-muted-foreground">{a.empresas?.razao_social} • {a.type.toUpperCase()}</p>
                    </div>
                    <Badge variant="outline" className={STATUS_COLORS[a.status] || ''}>{a.status}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma avaliação em andamento</p>
            )}
          </CardContent>
        </Card>

        {/* Laudos recentes */}
        <Card>
          <CardHeader><CardTitle className="text-base">Últimos Laudos</CardTitle></CardHeader>
          <CardContent>
            {laudosRecentes && laudosRecentes.length > 0 ? (
              <div className="space-y-2">
                {laudosRecentes.map((l: any) => (
                  <div key={l.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{l.title}</p>
                      <p className="text-xs text-muted-foreground">{l.empresas?.razao_social} • {l.finalized_at ? format(new Date(l.finalized_at), 'dd/MM/yyyy') : '—'}</p>
                    </div>
                    {l.risk_classification && (
                      <Badge variant={l.risk_classification === 'alto' || l.risk_classification === 'critico' ? 'destructive' : 'default'}>{l.risk_classification}</Badge>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum laudo emitido</p>
            )}
          </CardContent>
        </Card>

        {/* Planos de ação pendentes */}
        <Card>
          <CardHeader><CardTitle className="text-base">Planos de Ação Pendentes</CardTitle></CardHeader>
          <CardContent>
            {planosPendentes && planosPendentes.length > 0 ? (
              <div className="space-y-2">
                {planosPendentes.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/planos-acao/${p.id}`)}>
                    <div>
                      <p className="font-medium text-sm truncate max-w-[250px]">{p.action}</p>
                      <p className="text-xs text-muted-foreground">{p.empresas?.razao_social} • {p.due_date ? format(new Date(p.due_date), 'dd/MM/yyyy') : 'Sem prazo'}</p>
                    </div>
                    <Badge variant={p.status === 'pendente' ? 'destructive' : 'default'}>{p.status}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum plano pendente</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ConsultorDashboard;
