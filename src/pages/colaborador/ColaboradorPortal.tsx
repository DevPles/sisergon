import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

const ColaboradorPortal = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: colaborador } = useQuery({
    queryKey: ['meu-perfil-colaborador', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('colaboradores')
        .select('*, cargos(nome), setores(nome), unidades(nome), empresas(razao_social)')
        .eq('user_id', user.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: checklists } = useQuery({
    queryKey: ['meus-checklists', colaborador?.id],
    queryFn: async () => {
      if (!colaborador?.id) return [];
      const { data } = await supabase
        .from('checklists')
        .select('*')
        .eq('colaborador_id', colaborador.id)
        .order('year', { ascending: false })
        .order('month', { ascending: false })
        .limit(12);
      return data || [];
    },
    enabled: !!colaborador?.id,
  });

  const { data: assessments } = useQuery({
    queryKey: ['minhas-avaliacoes', colaborador?.id],
    queryFn: async () => {
      if (!colaborador?.id) return [];
      const { data } = await supabase
        .from('assessments')
        .select('id, title, type, status, score_total, risk_classification, created_at')
        .eq('colaborador_id', colaborador.id)
        .order('created_at', { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!colaborador?.id,
  });

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const hasCurrentChecklist = checklists?.some(c => c.month === currentMonth && c.year === currentYear);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Meu Painel</h1>
        <p className="text-muted-foreground mt-1">Bem-vindo, {colaborador?.nome_completo || user?.email}</p>
      </div>

      {/* Info card */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Empresa</p>
            <p className="font-semibold">{(colaborador?.empresas as any)?.razao_social || '—'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Cargo</p>
            <p className="font-semibold">{(colaborador?.cargos as any)?.nome || '—'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Setor</p>
            <p className="font-semibold">{(colaborador?.setores as any)?.nome || '—'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Checklist do mês</p>
            <Badge variant={hasCurrentChecklist ? 'default' : 'destructive'}>
              {hasCurrentChecklist ? 'Respondido' : 'Pendente'}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Checklist mensal */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Checklist Mensal</CardTitle>
            {!hasCurrentChecklist && colaborador && (
              <Button size="sm" onClick={() => navigate('/checklists/novo')}>
                Responder Checklist
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {checklists && checklists.length > 0 ? (
            <div className="space-y-2">
              {checklists.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{String(c.month).padStart(2, '0')}/{c.year}</p>
                    <p className="text-sm text-muted-foreground">Score: {c.score ?? '—'}</p>
                  </div>
                  <Badge variant={c.confirmed_at ? 'default' : 'outline'}>
                    {c.confirmed_at ? 'Confirmado' : 'Em aberto'}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">Nenhum checklist encontrado</p>
          )}
        </CardContent>
      </Card>

      {/* Histórico de avaliações */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Minhas Avaliações</CardTitle>
        </CardHeader>
        <CardContent>
          {assessments && assessments.length > 0 ? (
            <div className="space-y-2">
              {assessments.map((a) => (
                <div key={a.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{a.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {a.type.toUpperCase()} — {format(new Date(a.created_at), 'dd/MM/yyyy')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {a.risk_classification && (
                      <Badge variant={a.risk_classification === 'baixo' ? 'secondary' : a.risk_classification === 'moderado' ? 'default' : 'destructive'}>
                        {a.risk_classification}
                      </Badge>
                    )}
                    <Badge variant="outline">{a.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">Nenhuma avaliação registrada</p>
          )}
        </CardContent>
      </Card>

      {/* Orientações */}
      <Card>
        <CardHeader>
          <CardTitle>Orientações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium">Ergonomia no posto de trabalho</p>
              <p className="text-xs text-muted-foreground mt-1">
                Mantenha a tela na altura dos olhos, pés apoiados no chão e pausas a cada 50 minutos de trabalho contínuo.
              </p>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium">Saúde psicossocial</p>
              <p className="text-xs text-muted-foreground mt-1">
                Em caso de sintomas de estresse, ansiedade ou conflitos no trabalho, comunique seu gestor ou o SESMT.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ColaboradorPortal;
