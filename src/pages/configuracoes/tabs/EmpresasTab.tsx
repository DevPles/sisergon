import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

const UF_LIST = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

const EmpresasTab = ({ externalSearch }: { externalSearch?: string }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState(externalSearch || '');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (externalSearch !== undefined) setSearch(externalSearch);
  }, [externalSearch]);

  useEffect(() => {
    const handleOpenForm = () => setShowForm(true);
    window.addEventListener('open-nova-empresa', handleOpenForm);
    return () => window.removeEventListener('open-nova-empresa', handleOpenForm);
  }, []);

  const { data: empresas, isLoading } = useQuery({
    queryKey: ['config-empresas', search],
    queryFn: async () => {
      let query = supabase.from('empresas').select('*').order('razao_social');
      if (search) query = query.or(`razao_social.ilike.%${search}%,cnpj.ilike.%${search}%,nome_fantasia.ilike.%${search}%`);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const { data: planos } = useQuery({
    queryKey: ['planos-list'],
    queryFn: async () => {
      const { data } = await supabase.from('planos').select('*').eq('ativo', true).order('nome');
      return data ?? [];
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('empresas').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['config-empresas'] }); toast({ title: 'Empresa removida' }); },
    onError: (err: Error) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  if (showForm || editingId) {
    return <EmpresaForm empresaId={editingId} planos={planos ?? []} onClose={() => { setShowForm(false); setEditingId(null); }} onSaved={() => { setShowForm(false); setEditingId(null); queryClient.invalidateQueries({ queryKey: ['config-empresas'] }); }} />;
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Razão Social</TableHead>
            <TableHead>CNPJ</TableHead>
            <TableHead>Cidade/UF</TableHead>
            <TableHead>Grau de Risco</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
          ) : empresas?.length === 0 ? (
            <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhuma empresa</TableCell></TableRow>
          ) : empresas?.map((emp) => (
            <TableRow key={emp.id}>
              <TableCell>
                <p className="font-medium">{emp.razao_social}</p>
                {emp.nome_fantasia && <p className="text-sm text-muted-foreground">{emp.nome_fantasia}</p>}
              </TableCell>
              <TableCell className="font-mono text-sm">{emp.cnpj || '—'}</TableCell>
              <TableCell>{emp.endereco_cidade && emp.endereco_uf ? `${emp.endereco_cidade}/${emp.endereco_uf}` : '—'}</TableCell>
              <TableCell>{emp.grau_risco ? <Badge variant={emp.grau_risco >= 3 ? 'destructive' : 'default'}>GR {emp.grau_risco}</Badge> : '—'}</TableCell>
              <TableCell><Badge variant={emp.ativa ? 'default' : 'secondary'}>{emp.ativa ? 'Ativa' : 'Inativa'}</Badge></TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setEditingId(emp.id)}>Editar</Button>
                  <Button variant="ghost" size="sm" onClick={() => deleteMut.mutate(emp.id)} className="text-destructive hover:text-destructive">Excluir</Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

const EmpresaForm = ({ empresaId, planos, onClose, onSaved }: { empresaId: string | null; planos: any[]; onClose: () => void; onSaved: () => void }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const isEdit = !!empresaId;
  const [form, setForm] = useState({
    razao_social: '', nome_fantasia: '', cnpj: '', cnae: '', grau_risco: '' as string,
    endereco_logradouro: '', endereco_numero: '', endereco_complemento: '', endereco_bairro: '',
    endereco_cidade: '', endereco_uf: '', endereco_cep: '',
    responsavel_nome: '', responsavel_email: '', responsavel_telefone: '', ativa: true,
  });
  const [planoId, setPlanoId] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [existingLogo, setExistingLogo] = useState<string | null>(null);

  const { data: existing } = useQuery({
    queryKey: ['empresa-edit', empresaId],
    queryFn: async () => {
      if (!empresaId) return null;
      const { data } = await supabase.from('empresas').select('*').eq('id', empresaId).single();
      return data;
    },
    enabled: !!empresaId,
  });

  const { data: contrato } = useQuery({
    queryKey: ['contrato-empresa', empresaId],
    queryFn: async () => {
      if (!empresaId) return null;
      const { data } = await supabase.from('contratos').select('*').eq('empresa_id', empresaId).order('created_at', { ascending: false }).limit(1).maybeSingle();
      return data;
    },
    enabled: !!empresaId,
  });

   useEffect(() => {
    if (existing) {
      setForm({
        razao_social: existing.razao_social || '', nome_fantasia: existing.nome_fantasia || '',
        cnpj: existing.cnpj || '', cnae: existing.cnae || '', grau_risco: existing.grau_risco?.toString() || '',
        endereco_logradouro: existing.endereco_logradouro || '', endereco_numero: existing.endereco_numero || '',
        endereco_complemento: existing.endereco_complemento || '', endereco_bairro: existing.endereco_bairro || '',
        endereco_cidade: existing.endereco_cidade || '', endereco_uf: existing.endereco_uf || '',
        endereco_cep: existing.endereco_cep || '', responsavel_nome: existing.responsavel_nome || '',
        responsavel_email: existing.responsavel_email || '', responsavel_telefone: existing.responsavel_telefone || '',
        ativa: existing.ativa,
      });
      setExistingLogo(existing.logo_url || null);
    }
  }, [existing]);

  useEffect(() => {
    if (contrato) setPlanoId(contrato.plano_id);
  }, [contrato]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = { ...form, grau_risco: form.grau_risco ? parseInt(form.grau_risco) : null };
      let resultId = empresaId;
      if (isEdit) {
        const { error } = await supabase.from('empresas').update(payload).eq('id', empresaId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('empresas').insert(payload).select('id').single();
        if (error) throw error;
        resultId = data.id;
      }
      // Upload logo if selected
      if (logoFile && resultId) {
        const ext = logoFile.name.split('.').pop();
        const path = `empresa-${resultId}/logo.${ext}`;
        await supabase.storage.from('avatars').upload(path, logoFile, { upsert: true });
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
        await supabase.from('empresas').update({ logo_url: urlData.publicUrl } as any).eq('id', resultId);
      }
      if (planoId && resultId) {
        const planoData = planos.find(p => p.id === planoId);
        if (contrato) {
          await supabase.from('contratos').update({ plano_id: planoId }).eq('id', contrato.id);
        } else {
          await supabase.from('contratos').insert({ empresa_id: resultId, plano_id: planoId });
        }
      }
      await supabase.from('audit_logs').insert({ user_id: user?.id, entity: 'empresa', entity_id: resultId || undefined, action: isEdit ? 'update' : 'create', details: payload as any });
    },
    onSuccess: () => { toast({ title: isEdit ? 'Empresa atualizada' : 'Empresa cadastrada' }); onSaved(); },
    onError: (err: Error) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  const set = (field: string, value: string | boolean) => setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}>
      <Card>
        <CardContent className="p-6 space-y-6">
          <h2 className="text-lg font-semibold">{isEdit ? 'Editar Empresa' : 'Nova Empresa'}</h2>
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Dados da Empresa</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2"><Label>Razão Social *</Label><Input value={form.razao_social} onChange={(e) => set('razao_social', e.target.value)} required /></div>
            <div className="space-y-2"><Label>Nome Fantasia</Label><Input value={form.nome_fantasia} onChange={(e) => set('nome_fantasia', e.target.value)} /></div>
            <div className="space-y-2"><Label>CNPJ</Label><Input value={form.cnpj} onChange={(e) => set('cnpj', e.target.value)} /></div>
            <div className="space-y-2"><Label>CNAE</Label><Input value={form.cnae} onChange={(e) => set('cnae', e.target.value)} /></div>
            <div className="space-y-2">
              <Label>Grau de Risco</Label>
              <Select value={form.grau_risco} onValueChange={(v) => set('grau_risco', v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 - Baixo</SelectItem><SelectItem value="2">2 - Moderado</SelectItem>
                  <SelectItem value="3">3 - Alto</SelectItem><SelectItem value="4">4 - Crítico</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.ativa ? 'ativa' : 'inativa'} onValueChange={(v) => set('ativa', v === 'ativa')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="ativa">Ativa</SelectItem><SelectItem value="inativa">Suspensa / Inativa</SelectItem></SelectContent>
              </Select>
            </div>
          </div>


          <Separator />
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Identidade Visual</p>
          <p className="text-xs text-muted-foreground">O logo será utilizado automaticamente nos relatórios (AEP, AET, Psicossocial, PCMSO, Documentos).</p>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-xl bg-muted flex items-center justify-center overflow-hidden border-2 border-border shrink-0">
              {(logoPreview || existingLogo) ? (
                <img src={logoPreview || existingLogo!} alt="Logo" className="w-full h-full object-contain p-1" />
              ) : (
                <span className="text-[10px] text-muted-foreground text-center px-1">Sem logo</span>
              )}
            </div>
            <div className="space-y-2">
              <Label>Logo da empresa</Label>
              <Input type="file" accept="image/*" onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) { setLogoFile(f); setLogoPreview(URL.createObjectURL(f)); }
              }} />
            </div>
          </div>

          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Plano Contratado</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Plano</Label>
              <Select value={planoId} onValueChange={setPlanoId}>
                <SelectTrigger><SelectValue placeholder="Selecione um plano" /></SelectTrigger>
                <SelectContent>
                  {planos.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome} — R$ {Number(p.valor_mensal).toFixed(2)}/mês</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Endereço</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2 md:col-span-2"><Label>Logradouro</Label><Input value={form.endereco_logradouro} onChange={(e) => set('endereco_logradouro', e.target.value)} /></div>
            <div className="space-y-2"><Label>Número</Label><Input value={form.endereco_numero} onChange={(e) => set('endereco_numero', e.target.value)} /></div>
            <div className="space-y-2"><Label>Complemento</Label><Input value={form.endereco_complemento} onChange={(e) => set('endereco_complemento', e.target.value)} /></div>
            <div className="space-y-2"><Label>Bairro</Label><Input value={form.endereco_bairro} onChange={(e) => set('endereco_bairro', e.target.value)} /></div>
            <div className="space-y-2"><Label>Cidade</Label><Input value={form.endereco_cidade} onChange={(e) => set('endereco_cidade', e.target.value)} /></div>
            <div className="space-y-2">
              <Label>UF</Label>
              <Select value={form.endereco_uf} onValueChange={(v) => set('endereco_uf', v)}>
                <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                <SelectContent>{UF_LIST.map((uf) => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>CEP</Label><Input value={form.endereco_cep} onChange={(e) => set('endereco_cep', e.target.value)} /></div>
          </div>

          <Separator />
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Responsável</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2"><Label>Nome</Label><Input value={form.responsavel_nome} onChange={(e) => set('responsavel_nome', e.target.value)} /></div>
            <div className="space-y-2"><Label>E-mail</Label><Input type="email" value={form.responsavel_email} onChange={(e) => set('responsavel_email', e.target.value)} /></div>
            <div className="space-y-2"><Label>Telefone</Label><Input value={form.responsavel_telefone} onChange={(e) => set('responsavel_telefone', e.target.value)} /></div>
          </div>

          <Separator />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose} className="rounded-full">Cancelar</Button>
            <Button type="submit" disabled={mutation.isPending} className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground">
              {mutation.isPending ? 'Salvando...' : isEdit ? 'Atualizar' : 'Cadastrar'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
};

export default EmpresasTab;
