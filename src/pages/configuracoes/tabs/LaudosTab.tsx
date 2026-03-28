import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

const TYPE_LABELS: Record<string, string> = { aep: 'AEP', aet: 'AET', arp: 'ARP' };

const LaudosTab = () => {
  const [empresaFilter, setEmpresaFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');

  const { data: empresas } = useQuery({
    queryKey: ['empresas-select'],
    queryFn: async () => {
      const { data } = await supabase.from('empresas').select('id, razao_social').order('razao_social');
      return data ?? [];
    },
  });

  const { data: laudos, isLoading } = useQuery({
    queryKey: ['config-laudos', empresaFilter, typeFilter, search],
    queryFn: async () => {
      let query = supabase.from('assessments').select('*, empresas(razao_social), profiles:evaluator_id(full_name)').eq('status', 'finalizado').order('finalized_at', { ascending: false });
      if (empresaFilter !== 'all') query = query.eq('empresa_id', empresaFilter);
      if (typeFilter !== 'all') query = query.eq('type', typeFilter as 'aep' | 'aet' | 'arp');
      if (search) query = query.ilike('title', `%${search}%`);
      const { data } = await query;
      return data ?? [];
    },
  });

  const totalLaudos = laudos?.length ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-4 py-2">
          <span className="text-sm text-muted-foreground whitespace-nowrap">Total de Laudos</span>
          <span className="text-2xl font-bold">{totalLaudos}</span>
        </div>
        <Input placeholder="Buscar laudo..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-[220px]" />
        <Select value={empresaFilter} onValueChange={setEmpresaFilter}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Empresa" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Empresas</SelectItem>
            {empresas?.map((e) => <SelectItem key={e.id} value={e.id}>{e.razao_social}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="aep">AEP</SelectItem>
            <SelectItem value="aet">AET</SelectItem>
            <SelectItem value="arp">ARP</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Título</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Empresa</TableHead>
            <TableHead>Consultor</TableHead>
            <TableHead>Data</TableHead>
            <TableHead>Risco</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
          ) : laudos?.length === 0 ? (
            <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum laudo</TableCell></TableRow>
          ) : laudos?.map((l: any) => (
            <TableRow key={l.id}>
              <TableCell className="font-medium">{l.title || '—'}</TableCell>
              <TableCell><Badge variant="outline">{TYPE_LABELS[l.type] || l.type}</Badge></TableCell>
              <TableCell>{l.empresas?.razao_social || '—'}</TableCell>
              <TableCell>{l.profiles?.full_name || '—'}</TableCell>
              <TableCell>{l.finalized_at ? new Date(l.finalized_at).toLocaleDateString('pt-BR') : '—'}</TableCell>
              <TableCell>
                {l.risk_classification && (
                  <Badge variant={l.risk_classification === 'critico' || l.risk_classification === 'alto' ? 'destructive' : 'default'}>
                    {l.risk_classification}
                  </Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default LaudosTab;
