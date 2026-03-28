import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

const CHECKLIST_QUESTIONS = [
  { key: 'dor', label: 'Sentiu dor durante o trabalho?' },
  { key: 'regiao_dor', label: 'Em qual região do corpo sentiu dor?' },
  { key: 'pausas', label: 'Realizou pausas adequadas durante a jornada?' },
  { key: 'postura', label: 'Sua postura foi adequada durante o trabalho?' },
  { key: 'equipamento', label: 'O equipamento de trabalho estava adequado?' },
  { key: 'ambiente', label: 'O ambiente de trabalho estava confortável?' },
  { key: 'pressao', label: 'Houve excesso de pressão ou demanda?' },
  { key: 'emocional', label: 'Houve dificuldade emocional relacionada ao trabalho?' },
  { key: 'mudanca_rotina', label: 'Houve mudança na rotina que aumentou o esforço?' },
];

const ANSWERS = ['Sim', 'Não', 'Parcialmente'];

const ChecklistForm = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [empresaId, setEmpresaId] = useState('');
  const [colaboradorId, setColaboradorId] = useState('');
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [observations, setObservations] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: empresas } = useQuery({
    queryKey: ['empresas-select'],
    queryFn: async () => { const { data } = await supabase.from('empresas').select('id, razao_social').order('razao_social'); return data || []; },
  });

  const { data: colaboradores } = useQuery({
    queryKey: ['colaboradores-select', empresaId],
    queryFn: async () => {
      if (!empresaId) return [];
      const { data } = await supabase.from('colaboradores').select('id, nome_completo').eq('empresa_id', empresaId).eq('status', 'ativo');
      return data || [];
    },
    enabled: !!empresaId,
  });

  const score = (() => {
    let total = 0;
    let count = 0;
    CHECKLIST_QUESTIONS.forEach((q) => {
      const r = responses[q.key];
      if (r === 'Sim' && (q.key === 'pausas' || q.key === 'postura' || q.key === 'equipamento' || q.key === 'ambiente')) total += 0;
      else if (r === 'Sim') total += 3;
      else if (r === 'Parcialmente') total += 1.5;
      else total += 0;
      count++;
    });
    return count > 0 ? Math.round((total / (count * 3)) * 100 * 10) / 10 : 0;
  })();

  const handleSave = async () => {
    if (!empresaId || !colaboradorId) { toast({ title: 'Preencha empresa e colaborador', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');
      const { error } = await supabase.from('checklists').insert({
        colaborador_id: colaboradorId,
        empresa_id: empresaId,
        month: Number(month),
        year: Number(year),
        responses: responses as any,
        score,
        observations,
        filled_by: user.id,
        confirmed_at: new Date().toISOString(),
      });
      if (error) throw error;
      toast({ title: 'Checklist registrado com sucesso' });
      navigate('/checklists');
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
    setSaving(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Novo Checklist Mensal</h1>
          <p className="text-muted-foreground">Monitoramento contínuo do colaborador</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/checklists')}>Voltar</Button>
      </div>

      <Card className="mb-6">
        <CardHeader><CardTitle>Identificação</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Empresa *</Label>
              <Select value={empresaId} onValueChange={setEmpresaId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{empresas?.map((e) => <SelectItem key={e.id} value={e.id}>{e.razao_social}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Colaborador *</Label>
              <Select value={colaboradorId} onValueChange={setColaboradorId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{colaboradores?.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome_completo}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Mês</Label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Array.from({ length: 12 }, (_, i) => <SelectItem key={i + 1} value={String(i + 1)}>{String(i + 1).padStart(2, '0')}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Ano</Label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{[2025, 2026, 2027].map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader><CardTitle>Perguntas (Score: {score.toFixed(1)})</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-6">
            {CHECKLIST_QUESTIONS.map((q) => (
              <div key={q.key} className="border-b pb-4 last:border-b-0">
                <p className="text-sm font-medium mb-3">{q.label}</p>
                <div className="flex gap-2">
                  {ANSWERS.map((a) => (
                    <Button key={a} type="button" variant={responses[q.key] === a ? 'default' : 'outline'} size="sm"
                      onClick={() => setResponses((prev) => ({ ...prev, [q.key]: a }))}>{a}</Button>
                  ))}
                </div>
              </div>
            ))}
            <div className="space-y-2 pt-4">
              <Label>Observações adicionais</Label>
              <Textarea value={observations} onChange={(e) => setObservations(e.target.value)} rows={3} placeholder="Deseja registrar alguma observação?" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4 mb-8">
        <Button variant="outline" onClick={() => navigate('/checklists')}>Cancelar</Button>
        <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Registrar Checklist'}</Button>
      </div>
    </div>
  );
};

export default ChecklistForm;
