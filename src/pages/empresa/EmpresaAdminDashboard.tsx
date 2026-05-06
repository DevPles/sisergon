import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

const EmpresaAdminDashboard = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const empresaId = profile?.empresa_id;

  const { data: empresa } = useQuery({
    queryKey: ['minha-empresa', empresaId],
    queryFn: async () => {
      const { data } = await supabase.from('empresas').select('*').eq('id', empresaId!).single();
      return data;
    },
    enabled: !!empresaId,
  });

  const { data: counts } = useQuery({
    queryKey: ['empresa-admin-counts', empresaId],
    queryFn: async () => {
      const [colab, aval, laudos, planos, checklists] = await Promise.all([
        supabase.from('colaboradores').select('id', { count: 'exact', head: true }).eq('empresa_id', empresaId!),
        supabase.from('assessments').select('id', { count: 'exact', head: true }).eq('empresa_id', empresaId!),
        supabase.from('assessments').select('id', { count: 'exact', head: true }).eq('empresa_id', empresaId!).eq('status', 'finalizado'),
        supabase.from('action_plans').select('id', { count: 'exact', head: true }).eq('empresa_id', empresaId!).in('status', ['pendente', 'em_andamento']),
        supabase.from('checklists').select('id', { count: 'exact', head: true }).eq('empresa_id', empresaId!),
      ]);
      return {
        colaboradores: colab.count ?? 0,
        avaliacoes: aval.count ?? 0,
        laudos: laudos.count ?? 0,
        planosPendentes: planos.count ?? 0,
        checklists: checklists.count ?? 0,
      };
    },
    enabled: !!empresaId,
  });

  // Avaliações recentes
  const { data: avaliacoesRecentes } = useQuery({
    queryKey: ['empresa-admin-avaliacoes', empresaId],
    queryFn: async () => {
      const { data } = await supabase
        .from('assessments')
        .select('id, title, type, status, risk_classification, created_at')
        .eq('empresa_id', empresaId!)
        .order('created_at', { ascending: false })
        .limit(8);
      return data ?? [];
    },
    enabled: !!empresaId,
  });

  // Planos de ação pendentes
  const { data: planosPendentes } = useQuery({
    queryKey: ['empresa-admin-planos', empresaId],
    queryFn: async () => {
      const { data } = await supabase
        .from('action_plans')
        .select('*')
        .eq('empresa_id', empresaId!)
        .in('status', ['pendente', 'em_andamento'])
        .order('due_date', { ascending: true })
        .limit(5);
      return data ?? [];
    },
    enabled: !!empresaId,
  });

  // Riscos críticos
  const { data: riscosCriticos } = useQuery({
    queryKey: ['empresa-admin-riscos', empresaId],
    queryFn: async () => {
      const { data } = await supabase
        .from('assessments')
        .select('id, title, type, risk_classification')
        .eq('empresa_id', empresaId!)
        .in('risk_classification', ['alto', 'critico'])
        .eq('status', 'finalizado')
        .limit(5);
      return data ?? [];
    },
    enabled: !!empresaId,
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Painel da Empresa</h1>
        <p className="text-muted-foreground mt-1">{empresa?.razao_social || 'Carregando...'} — Gestão Interna</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Colaboradores</p><p className="text-3xl font-bold">{counts?.colaboradores ?? 0}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Avaliações</p><p className="text-3xl font-bold">{counts?.avaliacoes ?? 0}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Laudos</p><p className="text-3xl font-bold">{counts?.laudos ?? 0}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Checklists</p><p className="text-3xl font-bold">{counts?.checklists ?? 0}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Planos Pendentes</p><p className="text-3xl font-bold text-amber-600">{counts?.planosPendentes ?? 0}</p></CardContent></Card>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3 mb-6">
        <Button onClick={() => navigate('/cadastros')} className="rounded-full">Colaboradores</Button>
        <Button onClick={() => navigate('/checklists')} variant="outline" className="rounded-full">Checklists</Button>
        <Button onClick={() => navigate('/planos-acao')} variant="outline" className="rounded-full">Planos de Ação</Button>
        <Button onClick={() => navigate('/laudos')} variant="outline" className="rounded-full">Laudos</Button>
        <Button onClick={() => navigate('/dashboard')} variant="outline" className="rounded-full">Dashboard</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Avaliações recentes */}
        <Card>
          <CardHeader><CardTitle className="text-base">Avaliações Recentes</CardTitle></CardHeader>
          <CardContent>
            {avaliacoesRecentes && avaliacoesRecentes.length > 0 ? (
              <div className="space-y-2">
                {avaliacoesRecentes.map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{a.title || 'Sem título'}</p>
                      <p className="text-xs text-muted-foreground">{a.type.toUpperCase()} • {format(new Date(a.created_at), 'dd/MM/yyyy')}</p>
                    </div>
                    <div className="flex gap-1">
                      {a.risk_classification && (
                        <Badge variant={a.risk_classification === 'alto' || a.risk_classification === 'critico' ? 'destructive' : 'default'}>{a.risk_classification}</Badge>
                      )}
                      <Badge variant="outline">{a.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma avaliação</p>
            )}
          </CardContent>
        </Card>

        {/* Riscos críticos */}
        <Card>
          <CardHeader><CardTitle className="text-base">Alertas de Risco</CardTitle></CardHeader>
          <CardContent>
            {riscosCriticos && riscosCriticos.length > 0 ? (
              <div className="space-y-2">
                {riscosCriticos.map((r: any) => (
                  <div key={r.id} className="flex items-center justify-between p-3 border rounded-lg border-destructive/30 bg-destructive/5">
                    <div>
                      <p className="font-medium text-sm">{r.title}</p>
                      <p className="text-xs text-muted-foreground">{r.type.toUpperCase()}</p>
                    </div>
                    <Badge variant="destructive">{r.risk_classification}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-green-600">Nenhum risco alto ou crítico</p>
            )}
          </CardContent>
        </Card>

        {/* Planos de ação */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Planos de Ação Pendentes</CardTitle></CardHeader>
          <CardContent>
            {planosPendentes && planosPendentes.length > 0 ? (
              <div className="space-y-2">
                {planosPendentes.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/planos-acao/${p.id}`)}>
                    <div>
                      <p className="font-medium text-sm truncate max-w-[400px]">{p.action}</p>
                      <p className="text-xs text-muted-foreground">
                        Responsável: {p.responsible || '—'} • Prazo: {p.due_date ? format(new Date(p.due_date), 'dd/MM/yyyy') : 'Sem prazo'}
                      </p>
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

export default EmpresaAdminDashboard;
