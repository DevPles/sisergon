import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

const EmpresaGestorDashboard = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const empresaId = profile?.empresa_id;

  const { data: empresa } = useQuery({
    queryKey: ['minha-empresa-gestor', empresaId],
    queryFn: async () => {
      const { data } = await supabase.from('empresas').select('*').eq('id', empresaId!).single();
      return data;
    },
    enabled: !!empresaId,
  });

  const { data: counts } = useQuery({
    queryKey: ['gestor-counts', empresaId],
    queryFn: async () => {
      const [colab, laudos, planos] = await Promise.all([
        supabase.from('colaboradores').select('id', { count: 'exact', head: true }).eq('empresa_id', empresaId!),
        supabase.from('assessments').select('id', { count: 'exact', head: true }).eq('empresa_id', empresaId!).eq('status', 'finalizado'),
        supabase.from('action_plans').select('id', { count: 'exact', head: true }).eq('empresa_id', empresaId!).in('status', ['pendente', 'em_andamento']),
      ]);
      return {
        colaboradores: colab.count ?? 0,
        laudos: laudos.count ?? 0,
        planosPendentes: planos.count ?? 0,
      };
    },
    enabled: !!empresaId,
  });

  // Laudos da empresa
  const { data: laudos } = useQuery({
    queryKey: ['gestor-laudos', empresaId],
    queryFn: async () => {
      const { data } = await supabase
        .from('assessments')
        .select('id, title, type, risk_classification, finalized_at')
        .eq('empresa_id', empresaId!)
        .eq('status', 'finalizado')
        .order('finalized_at', { ascending: false })
        .limit(8);
      return data ?? [];
    },
    enabled: !!empresaId,
  });

  // Planos de ação
  const { data: planos } = useQuery({
    queryKey: ['gestor-planos', empresaId],
    queryFn: async () => {
      const { data } = await supabase
        .from('action_plans')
        .select('*')
        .eq('empresa_id', empresaId!)
        .order('created_at', { ascending: false })
        .limit(5);
      return data ?? [];
    },
    enabled: !!empresaId,
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Acompanhamento da Empresa</h1>
        <p className="text-muted-foreground mt-1">{empresa?.razao_social || 'Carregando...'}</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Colaboradores</p><p className="text-3xl font-bold">{counts?.colaboradores ?? 0}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Laudos Emitidos</p><p className="text-3xl font-bold">{counts?.laudos ?? 0}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Planos Pendentes</p><p className="text-3xl font-bold text-amber-600">{counts?.planosPendentes ?? 0}</p></CardContent></Card>
      </div>

      {/* Navegação */}
      <div className="flex flex-wrap gap-3 mb-6">
        <Button onClick={() => navigate('/cadastros')} variant="outline" className="rounded-full">Colaboradores</Button>
        <Button onClick={() => navigate('/checklists')} variant="outline" className="rounded-full">Checklists</Button>
        <Button onClick={() => navigate('/laudos')} variant="outline" className="rounded-full">Laudos</Button>
        <Button onClick={() => navigate('/planos-acao')} variant="outline" className="rounded-full">Planos de Ação</Button>
        <Button onClick={() => navigate('/dashboard')} variant="outline" className="rounded-full">Dashboard</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Laudos */}
        <Card>
          <CardHeader><CardTitle className="text-base">Laudos da Empresa</CardTitle></CardHeader>
          <CardContent>
            {laudos && laudos.length > 0 ? (
              <div className="space-y-2">
                {laudos.map((l: any) => (
                  <div key={l.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{l.title}</p>
                      <p className="text-xs text-muted-foreground">{l.type.toUpperCase()} • {l.finalized_at ? format(new Date(l.finalized_at), 'dd/MM/yyyy') : '—'}</p>
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

        {/* Planos de ação */}
        <Card>
          <CardHeader><CardTitle className="text-base">Planos de Ação</CardTitle></CardHeader>
          <CardContent>
            {planos && planos.length > 0 ? (
              <div className="space-y-2">
                {planos.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium text-sm truncate max-w-[250px]">{p.action}</p>
                      <p className="text-xs text-muted-foreground">
                        Prazo: {p.due_date ? format(new Date(p.due_date), 'dd/MM/yyyy') : 'Sem prazo'}
                      </p>
                    </div>
                    <Badge variant={p.status === 'concluido' ? 'default' : p.status === 'pendente' ? 'destructive' : 'secondary'}>{p.status}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum plano de ação</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EmpresaGestorDashboard;
