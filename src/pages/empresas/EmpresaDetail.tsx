import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const EmpresaDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: empresa } = useQuery({
    queryKey: ['empresa', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('empresas').select('*').eq('id', id!).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: unidades } = useQuery({
    queryKey: ['unidades', id],
    queryFn: async () => {
      const { data } = await supabase.from('unidades').select('*').eq('empresa_id', id!).order('nome');
      return data ?? [];
    },
  });

  const { data: setores } = useQuery({
    queryKey: ['setores', id],
    queryFn: async () => {
      const { data } = await supabase.from('setores').select('*').eq('empresa_id', id!).order('nome');
      return data ?? [];
    },
  });

  const { data: cargos } = useQuery({
    queryKey: ['cargos', id],
    queryFn: async () => {
      const { data } = await supabase.from('cargos').select('*').eq('empresa_id', id!).order('nome');
      return data ?? [];
    },
  });

  const { data: colaboradores } = useQuery({
    queryKey: ['colaboradores-empresa', id],
    queryFn: async () => {
      const { data } = await supabase.from('colaboradores').select('*').eq('empresa_id', id!).order('nome_completo');
      return data ?? [];
    },
  });

  const { data: allTemplates } = useQuery({
    queryKey: ['empresa-all-templates', id],
    queryFn: async () => {
      const [formRes, testRes] = await Promise.all([
        supabase.from('form_templates').select('*')
          .or(`empresa_id.eq.${id},is_global.eq.true`)
          .order('created_at', { ascending: false }),
        supabase.from('test_templates').select('*')
          .or(`empresa_id.eq.${id},is_global.eq.true`)
          .order('created_at', { ascending: false }),
      ]);
      const forms = (formRes.data || []).map((f) => ({ ...f, _source: 'form' as const }));
      const tests = (testRes.data || []).map((t) => ({ ...t, _source: 'test' as const }));
      return [...forms, ...tests];
    },
  });

  if (!empresa) return <div className="text-center py-12 text-muted-foreground">Carregando...</div>;

  const tipoLabel = (t: string) => {
    const map: Record<string, string> = { aep: 'AEP', aet: 'AET', psicossocial: 'Psicossocial', checklist: 'Checklist', plano_acao: 'Plano de Ação', formulario_custom: 'Custom', disc: 'DISC', comportamental: 'Comportamental' };
    return map[t] || t;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{empresa.razao_social}</h1>
          {empresa.nome_fantasia && <p className="text-muted-foreground">{empresa.nome_fantasia}</p>}
        </div>
        <Button variant="outline" onClick={() => navigate('/cadastros')}>Voltar</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Unidades</p><p className="text-2xl font-bold">{unidades?.length ?? 0}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Setores</p><p className="text-2xl font-bold">{setores?.length ?? 0}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Cargos</p><p className="text-2xl font-bold">{cargos?.length ?? 0}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Colaboradores</p><p className="text-2xl font-bold">{colaboradores?.length ?? 0}</p></CardContent></Card>
      </div>

      <Tabs defaultValue="dados">
        <TabsList>
          <TabsTrigger value="dados">Dados Cadastrais</TabsTrigger>
          <TabsTrigger value="unidades">Unidades</TabsTrigger>
          <TabsTrigger value="setores">Setores</TabsTrigger>
          <TabsTrigger value="cargos">Cargos</TabsTrigger>
          <TabsTrigger value="colaboradores">Colaboradores</TabsTrigger>
          <TabsTrigger value="templates">Formulários / Testes</TabsTrigger>
        </TabsList>

        <TabsContent value="dados" className="mt-6">
          <Card>
            <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-8">
              <div><span className="text-sm text-muted-foreground">CNPJ:</span> <span className="ml-2 font-mono">{empresa.cnpj || '—'}</span></div>
              <div><span className="text-sm text-muted-foreground">CNAE:</span> <span className="ml-2">{empresa.cnae || '—'}</span></div>
              <div><span className="text-sm text-muted-foreground">Grau de Risco:</span> <span className="ml-2">{empresa.grau_risco ? `GR ${empresa.grau_risco}` : '—'}</span></div>
              <div><span className="text-sm text-muted-foreground">Status:</span> <Badge className="ml-2" variant={empresa.ativa ? 'default' : 'secondary'}>{empresa.ativa ? 'Ativa' : 'Inativa'}</Badge></div>
              <div className="md:col-span-2"><span className="text-sm text-muted-foreground">Endereço:</span> <span className="ml-2">{[empresa.endereco_logradouro, empresa.endereco_numero, empresa.endereco_bairro, empresa.endereco_cidade, empresa.endereco_uf].filter(Boolean).join(', ') || '—'}</span></div>
              <div><span className="text-sm text-muted-foreground">Responsável:</span> <span className="ml-2">{empresa.responsavel_nome || '—'}</span></div>
              <div><span className="text-sm text-muted-foreground">Contato:</span> <span className="ml-2">{empresa.responsavel_email || '—'} {empresa.responsavel_telefone ? `| ${empresa.responsavel_telefone}` : ''}</span></div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="unidades" className="mt-6">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Endereço</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {unidades?.length === 0 ? <TableRow><TableCell colSpan={3} className="text-center py-6 text-muted-foreground">Nenhuma unidade cadastrada</TableCell></TableRow>
                : unidades?.map((u) => (
                  <TableRow key={u.id}><TableCell className="font-medium">{u.nome}</TableCell><TableCell>{u.endereco || '—'}</TableCell><TableCell><Badge variant={u.ativa ? 'default' : 'secondary'}>{u.ativa ? 'Ativa' : 'Inativa'}</Badge></TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="setores" className="mt-6">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Descrição</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {setores?.length === 0 ? <TableRow><TableCell colSpan={3} className="text-center py-6 text-muted-foreground">Nenhum setor cadastrado</TableCell></TableRow>
                : setores?.map((s) => (
                  <TableRow key={s.id}><TableCell className="font-medium">{s.nome}</TableCell><TableCell>{s.descricao || '—'}</TableCell><TableCell><Badge variant={s.ativo ? 'default' : 'secondary'}>{s.ativo ? 'Ativo' : 'Inativo'}</Badge></TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="cargos" className="mt-6">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>CBO</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {cargos?.length === 0 ? <TableRow><TableCell colSpan={3} className="text-center py-6 text-muted-foreground">Nenhum cargo cadastrado</TableCell></TableRow>
                : cargos?.map((c) => (
                  <TableRow key={c.id}><TableCell className="font-medium">{c.nome}</TableCell><TableCell>{c.cbo || '—'}</TableCell><TableCell><Badge variant={c.ativo ? 'default' : 'secondary'}>{c.ativo ? 'Ativo' : 'Inativo'}</Badge></TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="colaboradores" className="mt-6">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Matrícula</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {colaboradores?.length === 0 ? <TableRow><TableCell colSpan={3} className="text-center py-6 text-muted-foreground">Nenhum colaborador cadastrado</TableCell></TableRow>
                : colaboradores?.map((c) => (
                  <TableRow key={c.id}><TableCell className="font-medium">{c.nome_completo}</TableCell><TableCell>{c.matricula || '—'}</TableCell><TableCell><Badge variant={c.status === 'ativo' ? 'default' : 'secondary'}>{c.status}</Badge></TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Tipo</TableHead><TableHead>Origem</TableHead><TableHead>Escopo</TableHead><TableHead>Status</TableHead><TableHead>Versão</TableHead></TableRow></TableHeader>
              <TableBody>
                {(!allTemplates || allTemplates.length === 0) ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">Nenhum formulário ou teste vinculado a esta empresa</TableCell></TableRow>
                ) : allTemplates.map((t) => (
                  <TableRow key={`${t._source}-${t.id}`}>
                    <TableCell className="font-medium">{t.nome}</TableCell>
                    <TableCell><Badge variant="outline">{tipoLabel(t.tipo)}</Badge></TableCell>
                    <TableCell><Badge variant={t._source === 'form' ? 'default' : 'secondary'}>{t._source === 'form' ? 'Formulário' : 'Teste'}</Badge></TableCell>
                    <TableCell>{t.is_global ? <Badge variant="secondary">Global</Badge> : <Badge>Empresa</Badge>}</TableCell>
                    <TableCell><Badge variant={t.status === 'ativo' ? 'default' : 'secondary'}>{t.status}</Badge></TableCell>
                    <TableCell>v{t.versao}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EmpresaDetail;
