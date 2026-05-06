import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import EmpresaForm from './EmpresaForm';

const EmpresasList = () => {
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: empresas, isLoading } = useQuery({
    queryKey: ['empresas', search],
    queryFn: async () => {
      let query = supabase.from('empresas').select('*').order('razao_social');
      if (search) query = query.or(`razao_social.ilike.%${search}%,nome_fantasia.ilike.%${search}%,cnpj.ilike.%${search}%`);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('empresas').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empresas'] });
      toast({ title: 'Empresa removida com sucesso' });
    },
    onError: (err: Error) => toast({ title: 'Erro ao remover', description: err.message, variant: 'destructive' }),
  });

  const grauRiscoColor = (grau: number | null) => {
    if (!grau) return 'secondary';
    if (grau <= 1) return 'secondary';
    if (grau === 2) return 'default';
    if (grau === 3) return 'destructive';
    return 'destructive';
  };

  if (showForm || editingId) {
    return (
      <EmpresaForm
        empresaId={editingId}
        onClose={() => { setShowForm(false); setEditingId(null); }}
        onSaved={() => {
          setShowForm(false);
          setEditingId(null);
          queryClient.invalidateQueries({ queryKey: ['empresas'] });
        }}
      />
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Empresas</h1>
        <p className="text-muted-foreground">Cadastro e gestão de empresas clientes</p>
      </div>

      <Card className="overflow-hidden">
        <div className="p-4 sm:p-6 bg-muted/30 border-b border-border/50">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex flex-1 items-center gap-3 min-w-0">
              <div className="relative flex-1 max-w-md">
                <Input
                  placeholder="Buscar por razão social, nome fantasia ou CNPJ..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-11 bg-background"
                />
              </div>
              <span className="hidden md:inline-block text-sm text-muted-foreground whitespace-nowrap bg-background px-3 py-1 rounded-full border border-border/50">
                {empresas?.length ?? 0} registros
              </span>
            </div>
            
            <Button 
              onClick={() => setShowForm(true)}
              className="h-11 px-6 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_4px_14px_0_hsl(var(--primary)/0.4)] hover:shadow-[0_6px_20px_0_hsl(var(--primary)/0.5)] hover:scale-105 hover:-translate-y-0.5 transition-all duration-200 whitespace-nowrap"
            >
              Nova Empresa
            </Button>
          </div>
        </div>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Razão Social</TableHead>
                <TableHead className="hidden sm:table-cell">CNPJ</TableHead>
                <TableHead className="hidden md:table-cell">Cidade/UF</TableHead>
                <TableHead className="hidden sm:table-cell">Grau de Risco</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : empresas?.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhuma empresa cadastrada</TableCell></TableRow>
              ) : (
                empresas?.map((emp) => (
                  <TableRow key={emp.id} className="cursor-pointer" onClick={() => navigate(`/empresas/${emp.id}`)}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{emp.razao_social}</p>
                        {emp.nome_fantasia && <p className="text-sm text-muted-foreground">{emp.nome_fantasia}</p>}
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell font-mono text-sm">{emp.cnpj || '—'}</TableCell>
                    <TableCell className="hidden md:table-cell">{emp.endereco_cidade && emp.endereco_uf ? `${emp.endereco_cidade}/${emp.endereco_uf}` : '—'}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {emp.grau_risco ? (
                        <Badge variant={grauRiscoColor(emp.grau_risco)}>GR {emp.grau_risco}</Badge>
                      ) : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={emp.ativa ? 'default' : 'secondary'}>{emp.ativa ? 'Ativa' : 'Inativa'}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1 sm:gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" onClick={() => setEditingId(emp.id)}>Editar</Button>
                        <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(emp.id)} className="text-destructive hover:text-destructive hidden sm:inline-flex">
                          Excluir
                        </Button>
                      </div>
                    </TableCell>
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

export default EmpresasList;
