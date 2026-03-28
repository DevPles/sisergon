import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const ConfigGeraisTab = () => {
  const { toast } = useToast();
  const [systemName, setSystemName] = useState('ERGON - SISPRS');
  const [checklistFreq, setChecklistFreq] = useState('mensal');
  const [reavaliacao, setReavaliacao] = useState('12');

  // Audit logs
  const { data: logs } = useQuery({
    queryKey: ['audit-logs-recent'],
    queryFn: async () => {
      const { data } = await supabase.from('audit_logs').select('*, profiles:user_id(full_name)').order('created_at', { ascending: false }).limit(20);
      return data ?? [];
    },
  });

  const handleSave = () => {
    toast({ title: 'Configurações salvas', description: 'As alterações foram aplicadas ao sistema.' });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6 space-y-6">
          <h3 className="text-lg font-semibold">Personalização</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome do Sistema</Label>
              <Input value={systemName} onChange={(e) => setSystemName(e.target.value)} />
            </div>
          </div>

          <Separator />
          <h3 className="text-lg font-semibold">Regras de Negócio</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Frequência de Checklist</Label>
              <Select value={checklistFreq} onValueChange={setChecklistFreq}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="semanal">Semanal</SelectItem>
                  <SelectItem value="quinzenal">Quinzenal</SelectItem>
                  <SelectItem value="mensal">Mensal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Reavaliação (meses)</Label>
              <Input type="number" value={reavaliacao} onChange={(e) => setReavaliacao(e.target.value)} />
            </div>
          </div>

          <Separator />
          <h3 className="text-lg font-semibold">Critérios de Classificação de Risco</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="p-3 border rounded-md">
              <p className="font-medium">Baixo</p>
              <p className="text-muted-foreground">Score 0-25%</p>
            </div>
            <div className="p-3 border rounded-md">
              <p className="font-medium">Moderado</p>
              <p className="text-muted-foreground">Score 26-50%</p>
            </div>
            <div className="p-3 border rounded-md">
              <p className="font-medium">Alto</p>
              <p className="text-muted-foreground">Score 51-75%</p>
            </div>
            <div className="p-3 border rounded-md">
              <p className="font-medium">Crítico</p>
              <p className="text-muted-foreground">Score 76-100%</p>
            </div>
          </div>

          <Separator />
          <div className="flex justify-end">
            <Button onClick={handleSave} className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground">
              Salvar Configurações
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">Logs de Atividade (últimos 20)</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Entidade</TableHead>
                <TableHead>Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs?.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-4 text-muted-foreground">Nenhum log</TableCell></TableRow>
              ) : logs?.map((log: any) => (
                <TableRow key={log.id}>
                  <TableCell className="text-sm">{new Date(log.created_at).toLocaleString('pt-BR')}</TableCell>
                  <TableCell>{log.profiles?.full_name || '—'}</TableCell>
                  <TableCell>{log.entity_type}</TableCell>
                  <TableCell>{log.action}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConfigGeraisTab;
