import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';

const ChecklistsList = () => {
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const { data: checklists, isLoading } = useQuery({
    queryKey: ['checklists-list', search],
    queryFn: async () => {
      let query = supabase.from('checklists').select('*, colaboradores(nome_completo), empresas(razao_social)').order('created_at', { ascending: false });
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Checklists Mensais</h1>
          <p className="text-muted-foreground">Monitoramento contínuo mensal dos colaboradores</p>
        </div>
        <div className="flex items-center gap-3">
          <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-[220px]" />
          <span className="text-sm text-muted-foreground whitespace-nowrap">{checklists?.length ?? 0} registros</span>
          <Button onClick={() => navigate('/checklists/novo')}>Novo Checklist</Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Colaborador</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Mês/Ano</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Confirmado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : checklists?.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum checklist cadastrado</TableCell></TableRow>
              ) : (
                checklists?.map((c) => (
                  <TableRow key={c.id} className="cursor-pointer" onClick={() => navigate(`/checklists/${c.id}`)}>
                    <TableCell className="font-medium">{(c.colaboradores as any)?.nome_completo || '—'}</TableCell>
                    <TableCell>{(c.empresas as any)?.razao_social || '—'}</TableCell>
                    <TableCell>{String(c.month).padStart(2, '0')}/{c.year}</TableCell>
                    <TableCell className="font-mono">{Number(c.score).toFixed(1)}</TableCell>
                    <TableCell><Badge variant={c.confirmed_at ? 'default' : 'secondary'}>{c.confirmed_at ? 'Sim' : 'Não'}</Badge></TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChecklistsList;
