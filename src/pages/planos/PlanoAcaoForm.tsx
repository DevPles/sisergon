import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

const PlanoAcaoForm = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [empresaId, setEmpresaId] = useState('');
  const [action, setAction] = useState('');
  const [priority, setPriority] = useState('media');
  const [responsible, setResponsible] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [origin, setOrigin] = useState('manual');
  const [saving, setSaving] = useState(false);

  const { data: empresas } = useQuery({
    queryKey: ['empresas-select'],
    queryFn: async () => { const { data } = await supabase.from('empresas').select('id, razao_social').order('razao_social'); return data || []; },
  });

  const handleSave = async () => {
    if (!empresaId || !action) { toast({ title: 'Preencha empresa e ação', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from('action_plans').insert({
        empresa_id: empresaId,
        action,
        priority,
        responsible: responsible || null,
        due_date: dueDate || null,
        origin,
        status: 'pendente' as any,
      });
      if (error) throw error;
      toast({ title: 'Plano de ação criado' });
      navigate('/planos-acao');
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
    setSaving(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Novo Plano de Ação</h1>
          <p className="text-muted-foreground">Ação corretiva ou preventiva</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/planos-acao')}>Voltar</Button>
      </div>

      <Card className="mb-6">
        <CardHeader><CardTitle>Dados do Plano</CardTitle></CardHeader>
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
              <Label>Origem</Label>
              <Select value={origin} onValueChange={setOrigin}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="aep_automatico">AEP (automático)</SelectItem>
                  <SelectItem value="aet">AET</SelectItem>
                  <SelectItem value="arp">ARP</SelectItem>
                  <SelectItem value="checklist">Checklist</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Ação proposta *</Label>
              <Textarea value={action} onChange={(e) => setAction(e.target.value)} rows={3} placeholder="Descreva a ação corretiva ou preventiva..." />
            </div>
            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="critica">Crítica</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Responsável</Label>
              <Input value={responsible} onChange={(e) => setResponsible(e.target.value)} placeholder="Nome do responsável" />
            </div>
            <div className="space-y-2">
              <Label>Prazo</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4 mb-8">
        <Button variant="outline" onClick={() => navigate('/planos-acao')}>Cancelar</Button>
        <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Criar Plano de Ação'}</Button>
      </div>
    </div>
  );
};

export default PlanoAcaoForm;
