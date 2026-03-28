import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

const LaudosList = () => {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<any>(null);

  const { data: assessments, isLoading } = useQuery({
    queryKey: ['laudos-finalizados'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assessments')
        .select('*, empresas(razao_social)')
        .eq('status', 'finalizado')
        .order('finalized_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const typeLabel: Record<string, string> = { aep: 'AEP', aet: 'AET', arp: 'ARP' };

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Laudos e Relatórios</h1>
          <p className="text-muted-foreground">Avaliações finalizadas disponíveis para geração de PDF</p>
        </div>
        <span className="text-sm text-muted-foreground whitespace-nowrap">{assessments?.length ?? 0} laudos finalizados</span>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Risco</TableHead>
                <TableHead>Data Finalização</TableHead>
                <TableHead>Versão</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : assessments?.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum laudo finalizado</TableCell></TableRow>
              ) : (
                assessments?.map((a) => (
                  <TableRow key={a.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelected(a)}>
                    <TableCell className="font-medium">{a.title || 'Sem título'}</TableCell>
                    <TableCell><Badge variant="outline">{typeLabel[a.type] || a.type}</Badge></TableCell>
                    <TableCell>{(a.empresas as any)?.razao_social || '—'}</TableCell>
                    <TableCell className="font-mono">{Number(a.score_total).toFixed(1)}</TableCell>
                    <TableCell><Badge variant={a.risk_classification === 'baixo' ? 'secondary' : a.risk_classification === 'moderado' ? 'default' : 'destructive'}>{a.risk_classification || '—'}</Badge></TableCell>
                    <TableCell>{a.finalized_at ? format(new Date(a.finalized_at), 'dd/MM/yyyy') : '—'}</TableCell>
                    <TableCell>v{a.version}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Detalhes do Laudo</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">Título:</span><p className="font-medium">{selected.title || 'Sem título'}</p></div>
                <div><span className="text-muted-foreground">Tipo:</span><p><Badge variant="outline">{typeLabel[selected.type] || selected.type}</Badge></p></div>
                <div><span className="text-muted-foreground">Empresa:</span><p className="font-medium">{(selected.empresas as any)?.razao_social || '—'}</p></div>
                <div><span className="text-muted-foreground">Score Total:</span><p className="font-mono text-lg">{Number(selected.score_total).toFixed(1)}</p></div>
                <div><span className="text-muted-foreground">Classificação de Risco:</span><p><Badge variant={selected.risk_classification === 'baixo' ? 'secondary' : selected.risk_classification === 'moderado' ? 'default' : 'destructive'}>{selected.risk_classification || '—'}</Badge></p></div>
                <div><span className="text-muted-foreground">Versão:</span><p>v{selected.version}</p></div>
                <div><span className="text-muted-foreground">Data Criação:</span><p>{format(new Date(selected.created_at), 'dd/MM/yyyy')}</p></div>
                <div><span className="text-muted-foreground">Data Finalização:</span><p>{selected.finalized_at ? format(new Date(selected.finalized_at), 'dd/MM/yyyy') : '—'}</p></div>
              </div>
              {selected.description && <div><span className="text-muted-foreground">Descrição:</span><p className="mt-1">{selected.description}</p></div>}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => { setSelected(null); navigate(`/${selected.type}/${selected.id}`); }}>Abrir Avaliação</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LaudosList;
