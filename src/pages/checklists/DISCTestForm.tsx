import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';

const PERFIL_LABELS: Record<string, string> = {
  D: 'Dominância',
  I: 'Influência',
  S: 'Estabilidade',
  C: 'Conformidade',
};

const PERFIL_COLORS: Record<string, string> = {
  D: 'bg-red-500',
  I: 'bg-yellow-500',
  S: 'bg-green-500',
  C: 'bg-blue-500',
};

const DISCTestForm = () => {
  const { instanceId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, 'mais' | 'menos'>>({});

  const { data: colaborador } = useQuery({
    queryKey: ['my-colaborador', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase.from('colaboradores').select('id, empresa_id').eq('user_id', user.id).maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: questions } = useQuery({
    queryKey: ['disc-questions'],
    queryFn: async () => {
      const { data } = await supabase.from('disc_questions').select('*').order('grupo');
      return data || [];
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!colaborador || !questions) throw new Error('Dados não carregados');
      
      const scores: Record<string, number> = { D: 0, I: 0, S: 0, C: 0 };
      questions.forEach((q: any, idx: number) => {
        const ans = answers[idx];
        if (ans === 'mais') scores[q.perfil_mais] += 1;
        else if (ans === 'menos') scores[q.perfil_menos] += 1;
      });

      const maxKey = Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];

      const { error } = await supabase.from('disc_responses').insert({
        instance_id: instanceId || null,
        colaborador_id: colaborador.id,
        empresa_id: colaborador.empresa_id,
        respostas: answers as any,
        scores: scores as any,
        perfil_dominante: maxKey,
        status: 'finalizado',
        finalizado_em: new Date().toISOString(),
      });
      if (error) throw error;

      // Update instance if exists
      if (instanceId) {
        await supabase.from('test_assignment_instances').update({
          status: 'concluido',
          concluido_em: new Date().toISOString(),
        }).eq('id', instanceId);
      }

      return { scores, perfil_dominante: maxKey };
    },
    onSuccess: (data) => {
      toast({ title: `Teste DISC concluído! Perfil: ${PERFIL_LABELS[data.perfil_dominante]}` });
    },
    onError: (err: any) => {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    },
  });

  if (!questions?.length) return <div className="p-8 text-center text-muted-foreground">Carregando perguntas...</div>;

  const total = questions.length;
  const progress = (Object.keys(answers).length / total) * 100;
  const allAnswered = Object.keys(answers).length === total;
  const q = questions[currentQ] as any;

  if (submitMutation.isSuccess) {
    const result = submitMutation.data;
    const maxScore = Math.max(...Object.values(result.scores));
    return (
      <div className="max-w-lg mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-center">Resultado DISC</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center mb-6">
              <Badge className={`text-lg px-4 py-2 ${PERFIL_COLORS[result.perfil_dominante]} text-white`}>
                {PERFIL_LABELS[result.perfil_dominante]} ({result.perfil_dominante})
              </Badge>
            </div>
            <div className="space-y-3">
              {Object.entries(result.scores).map(([key, val]) => (
                <div key={key} className="flex items-center gap-3">
                  <span className="w-24 text-sm font-medium">{PERFIL_LABELS[key]}</span>
                  <div className="flex-1 bg-muted rounded-full h-4 overflow-hidden">
                    <div
                      className={`h-full ${PERFIL_COLORS[key]} transition-all`}
                      style={{ width: `${maxScore > 0 ? ((val as number) / maxScore) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-sm font-mono w-8 text-right">{val as number}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-center mt-6">
              <Button onClick={() => navigate('/meu-painel')}>Voltar ao Painel</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Teste DISC</h1>
          <p className="text-muted-foreground">Selecione a opção que mais se parece com você</p>
        </div>
        <Button variant="outline" onClick={() => navigate(-1)}>Voltar</Button>
      </div>

      <div className="mb-4">
        <div className="flex justify-between text-sm text-muted-foreground mb-1">
          <span>Pergunta {currentQ + 1} de {total}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <Card className="mb-4">
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground mb-4">Grupo {q.grupo}</p>
          <div className="space-y-3">
            <Button
              variant={answers[currentQ] === 'mais' ? 'default' : 'outline'}
              className="w-full justify-start text-left h-auto py-3 px-4"
              onClick={() => setAnswers(prev => ({ ...prev, [currentQ]: 'mais' }))}
            >
              <span className="mr-2 font-bold text-xs">MAIS</span> {q.texto_mais}
            </Button>
            <Button
              variant={answers[currentQ] === 'menos' ? 'default' : 'outline'}
              className="w-full justify-start text-left h-auto py-3 px-4"
              onClick={() => setAnswers(prev => ({ ...prev, [currentQ]: 'menos' }))}
            >
              <span className="mr-2 font-bold text-xs">MENOS</span> {q.texto_menos}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setCurrentQ(p => Math.max(0, p - 1))} disabled={currentQ === 0}>
          Anterior
        </Button>
        {currentQ < total - 1 ? (
          <Button onClick={() => setCurrentQ(p => Math.min(total - 1, p + 1))} disabled={!answers[currentQ]}>
            Próxima
          </Button>
        ) : (
          <Button onClick={() => submitMutation.mutate()} disabled={!allAnswered || submitMutation.isPending}>
            {submitMutation.isPending ? 'Enviando...' : 'Finalizar Teste'}
          </Button>
        )}
      </div>
    </div>
  );
};

export default DISCTestForm;