import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import FaturamentoTab from './FaturamentoTab';
import TemplatesTab from './TemplatesTab';


const UF_LIST = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

/* ───────────────── EMPRESA FORM ───────────────── */
const EmpresaFormInline = ({ empresaId, onClose, onSaved }: { empresaId: string | null; onClose: () => void; onSaved: () => void }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const isEdit = !!empresaId;

  const [form, setForm] = useState({
    razao_social: '', nome_fantasia: '', cnpj: '', cnae: '',
    grau_risco: '' as string, endereco_logradouro: '', endereco_numero: '',
    endereco_complemento: '', endereco_bairro: '', endereco_cidade: '',
    endereco_uf: '', endereco_cep: '', responsavel_nome: '',
    responsavel_email: '', responsavel_telefone: '', ativa: true,
  });
  const [userForm, setUserForm] = useState({ full_name: '', email: '', avatar_url: '' });
  const [linkedProfileId, setLinkedProfileId] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const { data: existing } = useQuery({
    queryKey: ['empresa', empresaId],
    queryFn: async () => {
      if (!empresaId) return null;
      const { data, error } = await supabase.from('empresas').select('*').eq('id', empresaId).single();
      if (error) throw error;
      return data;
    },
    enabled: !!empresaId,
  });

  const { data: linkedProfile } = useQuery({
    queryKey: ['empresa-profile', empresaId],
    queryFn: async () => {
      if (!empresaId) return null;
      const { data } = await supabase.from('profiles').select('*').eq('empresa_id', empresaId).limit(1).maybeSingle();
      return data;
    },
    enabled: !!empresaId,
  });

  useEffect(() => {
    if (existing) {
      setForm({
        razao_social: existing.razao_social || '', nome_fantasia: existing.nome_fantasia || '',
        cnpj: existing.cnpj || '', cnae: existing.cnae || '',
        grau_risco: existing.grau_risco?.toString() || '',
        endereco_logradouro: existing.endereco_logradouro || '', endereco_numero: existing.endereco_numero || '',
        endereco_complemento: existing.endereco_complemento || '', endereco_bairro: existing.endereco_bairro || '',
        endereco_cidade: existing.endereco_cidade || '', endereco_uf: existing.endereco_uf || '',
        endereco_cep: existing.endereco_cep || '', responsavel_nome: existing.responsavel_nome || '',
        responsavel_email: existing.responsavel_email || '', responsavel_telefone: existing.responsavel_telefone || '',
        ativa: existing.ativa,
      });
    }
  }, [existing]);

  useEffect(() => {
    if (linkedProfile) {
      setLinkedProfileId(linkedProfile.id);
      setUserForm({ full_name: linkedProfile.full_name || '', email: linkedProfile.email || '', avatar_url: (linkedProfile as any).avatar_url || '' });
      if ((linkedProfile as any).avatar_url) setAvatarPreview((linkedProfile as any).avatar_url);
    }
  }, [linkedProfile]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setAvatarFile(file); setAvatarPreview(URL.createObjectURL(file)); }
  };

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
      let avatarUrl = userForm.avatar_url;
      if (avatarFile && resultId) {
        const ext = avatarFile.name.split('.').pop();
        const path = `empresa-${resultId}/avatar.${ext}`;
        await supabase.storage.from('avatars').upload(path, avatarFile, { upsert: true });
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
        avatarUrl = urlData.publicUrl;
      }
      if (linkedProfileId) {
        await supabase.from('profiles').update({ full_name: userForm.full_name, avatar_url: avatarUrl } as any).eq('id', linkedProfileId);
      }
      await supabase.from('audit_logs').insert({ user_id: user?.id, entity: 'empresa', entity_id: resultId || undefined, action: isEdit ? 'update' : 'create', details: payload as any });
    },
    onSuccess: () => { toast({ title: isEdit ? 'Empresa atualizada' : 'Empresa cadastrada' }); onSaved(); },
    onError: (err: Error) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  const handleResetPassword = async () => {
    if (!userForm.email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(userForm.email);
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else toast({ title: 'E-mail de redefinição enviado' });
  };

  const set = (field: string, value: string | boolean) => setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}>
      <Card>
        <CardContent className="p-6 space-y-6">
          <h2 className="text-lg font-semibold">{isEdit ? 'Editar Empresa' : 'Nova Empresa'}</h2>

          {/* Dados da Empresa */}
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Dados da Empresa</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label>Razão Social *</Label>
              <Input value={form.razao_social} onChange={(e) => set('razao_social', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Nome Fantasia</Label>
              <Input value={form.nome_fantasia} onChange={(e) => set('nome_fantasia', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>CNPJ</Label>
              <Input value={form.cnpj} onChange={(e) => set('cnpj', e.target.value)} placeholder="00.000.000/0000-00" />
            </div>
            <div className="space-y-2">
              <Label>CNAE</Label>
              <Input value={form.cnae} onChange={(e) => set('cnae', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Grau de Risco</Label>
              <Select value={form.grau_risco} onValueChange={(v) => set('grau_risco', v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 - Baixo</SelectItem>
                  <SelectItem value="2">2 - Moderado</SelectItem>
                  <SelectItem value="3">3 - Alto</SelectItem>
                  <SelectItem value="4">4 - Crítico</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Endereço</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label>Logradouro</Label>
              <Input value={form.endereco_logradouro} onChange={(e) => set('endereco_logradouro', e.target.value)} />
            </div>
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
            <div className="space-y-2"><Label>CEP</Label><Input value={form.endereco_cep} onChange={(e) => set('endereco_cep', e.target.value)} placeholder="00000-000" /></div>
          </div>

          <Separator />

          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Responsável</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2"><Label>Nome</Label><Input value={form.responsavel_nome} onChange={(e) => set('responsavel_nome', e.target.value)} /></div>
            <div className="space-y-2"><Label>E-mail</Label><Input type="email" value={form.responsavel_email} onChange={(e) => set('responsavel_email', e.target.value)} /></div>
            <div className="space-y-2"><Label>Telefone</Label><Input value={form.responsavel_telefone} onChange={(e) => set('responsavel_telefone', e.target.value)} /></div>
          </div>

          {isEdit && linkedProfileId && (
            <>
              <Separator />
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Perfil de Usuário Vinculado</p>
              <div className="flex items-start gap-6">
                <div className="flex flex-col items-center gap-2">
                  <div className="relative group">
                    <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-border">
                      {avatarPreview ? (
                        <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-2xl text-muted-foreground font-bold">{userForm.full_name?.charAt(0)?.toUpperCase() || '?'}</span>
                      )}
                    </div>
                    <label className="absolute inset-0 rounded-full cursor-pointer bg-foreground/0 group-hover:bg-foreground/20 transition-colors">
                      <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                    </label>
                  </div>
                  <span className="text-xs text-muted-foreground">Alterar foto</span>
                </div>
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Nome Completo</Label><Input value={userForm.full_name} onChange={(e) => setUserForm(p => ({ ...p, full_name: e.target.value }))} /></div>
                  <div className="space-y-2"><Label>E-mail do Usuário</Label><Input value={userForm.email} disabled className="bg-muted" /></div>
                  <div>
                    <Button type="button" variant="outline" onClick={handleResetPassword} disabled={!userForm.email}
                      className="rounded-full shadow-[0_4px_14px_0_hsl(var(--border)/0.4)] hover:scale-105 hover:-translate-y-0.5 transition-all duration-200">
                      Enviar Reset de Senha
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}

          <Separator />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose} className="rounded-full shadow-[0_4px_14px_0_hsl(var(--border)/0.4)] hover:scale-105 hover:-translate-y-0.5 transition-all duration-200">Cancelar</Button>
            <Button type="submit" disabled={mutation.isPending} className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_4px_14px_0_hsl(var(--primary)/0.4)] hover:shadow-[0_6px_20px_0_hsl(var(--primary)/0.5)] hover:scale-105 hover:-translate-y-0.5 transition-all duration-200">
              {mutation.isPending ? 'Salvando...' : isEdit ? 'Atualizar' : 'Cadastrar'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
};

/* ───────────────── COLABORADOR FORM ───────────────── */
const ColaboradorFormInline = ({ colaboradorId, onClose, onSaved }: { colaboradorId: string | null; onClose: () => void; onSaved: () => void }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const isEdit = !!colaboradorId;

  const [form, setForm] = useState({
    nome_completo: '', matricula: '', cpf: '', data_nascimento: '',
    sexo: '', empresa_id: '', unidade_id: '', setor_id: '', cargo_id: '',
    data_admissao: '', jornada: '', turno: '', gestor_responsavel: '', status: 'ativo',
  });
  const [userForm, setUserForm] = useState({ full_name: '', email: '', avatar_url: '' });
  const [linkedUserId, setLinkedUserId] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const { data: empresas } = useQuery({
    queryKey: ['empresas-select'],
    queryFn: async () => { const { data } = await supabase.from('empresas').select('id, razao_social').eq('ativa', true).order('razao_social'); return data ?? []; },
  });
  const { data: unidades } = useQuery({
    queryKey: ['unidades-select', form.empresa_id],
    queryFn: async () => { if (!form.empresa_id) return []; const { data } = await supabase.from('unidades').select('id, nome').eq('empresa_id', form.empresa_id).order('nome'); return data ?? []; },
    enabled: !!form.empresa_id,
  });
  const { data: setoresData } = useQuery({
    queryKey: ['setores-select', form.empresa_id],
    queryFn: async () => { if (!form.empresa_id) return []; const { data } = await supabase.from('setores').select('id, nome').eq('empresa_id', form.empresa_id).order('nome'); return data ?? []; },
    enabled: !!form.empresa_id,
  });
  const { data: cargosData } = useQuery({
    queryKey: ['cargos-select', form.empresa_id],
    queryFn: async () => { if (!form.empresa_id) return []; const { data } = await supabase.from('cargos').select('id, nome').eq('empresa_id', form.empresa_id).order('nome'); return data ?? []; },
    enabled: !!form.empresa_id,
  });

  const { data: existing } = useQuery({
    queryKey: ['colaborador', colaboradorId],
    queryFn: async () => { if (!colaboradorId) return null; const { data, error } = await supabase.from('colaboradores').select('*').eq('id', colaboradorId).single(); if (error) throw error; return data; },
    enabled: !!colaboradorId,
  });

  const { data: linkedProfile } = useQuery({
    queryKey: ['colaborador-profile', existing?.user_id],
    queryFn: async () => { if (!existing?.user_id) return null; const { data } = await supabase.from('profiles').select('*').eq('id', existing.user_id).maybeSingle(); return data; },
    enabled: !!existing?.user_id,
  });

  useEffect(() => {
    if (existing) {
      setForm({
        nome_completo: existing.nome_completo || '', matricula: existing.matricula || '', cpf: existing.cpf || '',
        data_nascimento: existing.data_nascimento || '', sexo: existing.sexo || '', empresa_id: existing.empresa_id || '',
        unidade_id: existing.unidade_id || '', setor_id: existing.setor_id || '', cargo_id: existing.cargo_id || '',
        data_admissao: existing.data_admissao || '', jornada: existing.jornada || '', turno: existing.turno || '',
        gestor_responsavel: existing.gestor_responsavel || '', status: existing.status || 'ativo',
      });
      if (existing.user_id) setLinkedUserId(existing.user_id);
    }
  }, [existing]);

  useEffect(() => {
    if (linkedProfile) {
      setUserForm({ full_name: linkedProfile.full_name || '', email: linkedProfile.email || '', avatar_url: (linkedProfile as any).avatar_url || '' });
      if ((linkedProfile as any).avatar_url) setAvatarPreview((linkedProfile as any).avatar_url);
    }
  }, [linkedProfile]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setAvatarFile(file); setAvatarPreview(URL.createObjectURL(file)); }
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = { ...form, data_nascimento: form.data_nascimento || null, data_admissao: form.data_admissao || null, unidade_id: form.unidade_id || null, setor_id: form.setor_id || null, cargo_id: form.cargo_id || null, sexo: form.sexo || null };
      if (isEdit) { const { error } = await supabase.from('colaboradores').update(payload).eq('id', colaboradorId); if (error) throw error; }
      else { const { error } = await supabase.from('colaboradores').insert(payload); if (error) throw error; }
      if (avatarFile && linkedUserId) {
        const ext = avatarFile.name.split('.').pop();
        const path = `colaborador-${linkedUserId}/avatar.${ext}`;
        await supabase.storage.from('avatars').upload(path, avatarFile, { upsert: true });
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
        await supabase.from('profiles').update({ full_name: userForm.full_name, avatar_url: urlData.publicUrl } as any).eq('id', linkedUserId);
      } else if (linkedUserId) {
        await supabase.from('profiles').update({ full_name: userForm.full_name } as any).eq('id', linkedUserId);
      }
      await supabase.from('audit_logs').insert({ user_id: user?.id, entity: 'colaborador', entity_id: colaboradorId || undefined, action: isEdit ? 'update' : 'create', details: payload as any });
    },
    onSuccess: () => { toast({ title: isEdit ? 'Colaborador atualizado' : 'Colaborador cadastrado' }); onSaved(); },
    onError: (err: Error) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  const handleResetPassword = async () => {
    if (!userForm.email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(userForm.email);
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else toast({ title: 'E-mail de redefinição enviado' });
  };

  const set = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}>
      <Card>
        <CardContent className="p-6 space-y-6">
          <h2 className="text-lg font-semibold">{isEdit ? 'Editar Colaborador' : 'Novo Colaborador'}</h2>

          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Dados Pessoais</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2"><Label>Nome Completo *</Label><Input value={form.nome_completo} onChange={(e) => set('nome_completo', e.target.value)} required /></div>
            <div className="space-y-2"><Label>CPF</Label><Input value={form.cpf} onChange={(e) => set('cpf', e.target.value)} placeholder="000.000.000-00" /></div>
            <div className="space-y-2"><Label>Data de Nascimento</Label><Input type="date" value={form.data_nascimento} onChange={(e) => set('data_nascimento', e.target.value)} /></div>
            <div className="space-y-2">
              <Label>Sexo</Label>
              <Select value={form.sexo} onValueChange={(v) => set('sexo', v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent><SelectItem value="M">Masculino</SelectItem><SelectItem value="F">Feminino</SelectItem><SelectItem value="Outro">Outro</SelectItem></SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Vínculo Funcional</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Empresa *</Label>
              <Select value={form.empresa_id} onValueChange={(v) => set('empresa_id', v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{empresas?.map((e) => <SelectItem key={e.id} value={e.id}>{e.razao_social}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Matrícula</Label><Input value={form.matricula} onChange={(e) => set('matricula', e.target.value)} /></div>
            <div className="space-y-2">
              <Label>Unidade</Label>
              <Select value={form.unidade_id} onValueChange={(v) => set('unidade_id', v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{unidades?.map((u) => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Setor</Label>
              <Select value={form.setor_id} onValueChange={(v) => set('setor_id', v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{setoresData?.map((s) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Cargo</Label>
              <Select value={form.cargo_id} onValueChange={(v) => set('cargo_id', v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{cargosData?.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Data de Admissão</Label><Input type="date" value={form.data_admissao} onChange={(e) => set('data_admissao', e.target.value)} /></div>
            <div className="space-y-2"><Label>Jornada</Label><Input value={form.jornada} onChange={(e) => set('jornada', e.target.value)} placeholder="Ex: 8h diárias" /></div>
            <div className="space-y-2">
              <Label>Turno</Label>
              <Select value={form.turno} onValueChange={(v) => set('turno', v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent><SelectItem value="Diurno">Diurno</SelectItem><SelectItem value="Noturno">Noturno</SelectItem><SelectItem value="Revezamento">Revezamento</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Gestor Responsável</Label><Input value={form.gestor_responsavel} onChange={(e) => set('gestor_responsavel', e.target.value)} /></div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => set('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="ativo">Ativo</SelectItem><SelectItem value="inativo">Inativo</SelectItem><SelectItem value="afastado">Afastado</SelectItem></SelectContent>
              </Select>
            </div>
          </div>

          {isEdit && linkedUserId && (
            <>
              <Separator />
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Perfil de Usuário Vinculado</p>
              <div className="flex items-start gap-6">
                <div className="flex flex-col items-center gap-2">
                  <div className="relative group">
                    <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-border">
                      {avatarPreview ? (
                        <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-2xl text-muted-foreground font-bold">{userForm.full_name?.charAt(0)?.toUpperCase() || '?'}</span>
                      )}
                    </div>
                    <label className="absolute inset-0 rounded-full cursor-pointer bg-foreground/0 group-hover:bg-foreground/20 transition-colors">
                      <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                    </label>
                  </div>
                  <span className="text-xs text-muted-foreground">Alterar foto</span>
                </div>
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Nome Completo</Label><Input value={userForm.full_name} onChange={(e) => setUserForm(p => ({ ...p, full_name: e.target.value }))} /></div>
                  <div className="space-y-2"><Label>E-mail do Usuário</Label><Input value={userForm.email} disabled className="bg-muted" /></div>
                  <div>
                    <Button type="button" variant="outline" onClick={handleResetPassword} disabled={!userForm.email}
                      className="rounded-full shadow-[0_4px_14px_0_hsl(var(--border)/0.4)] hover:scale-105 hover:-translate-y-0.5 transition-all duration-200">
                      Enviar Reset de Senha
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}

          <Separator />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose} className="rounded-full shadow-[0_4px_14px_0_hsl(var(--border)/0.4)] hover:scale-105 hover:-translate-y-0.5 transition-all duration-200">Cancelar</Button>
            <Button type="submit" disabled={mutation.isPending} className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_4px_14px_0_hsl(var(--primary)/0.4)] hover:shadow-[0_6px_20px_0_hsl(var(--primary)/0.5)] hover:scale-105 hover:-translate-y-0.5 transition-all duration-200">
              {mutation.isPending ? 'Salvando...' : isEdit ? 'Atualizar' : 'Cadastrar'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
};

/* ───────────────── MAIN PAGE ───────────────── */
const CadastrosPage = () => {
  const [empresaSearch, setEmpresaSearch] = useState('');
  const [activeTab, setActiveTab] = useState('empresas');
  const [faturamentoEmpresa, setFaturamentoEmpresa] = useState('');
  const [templateEmpresa, setTemplateEmpresa] = useState('');
  const [templateNewTrigger, setTemplateNewTrigger] = useState(0);
  const [templateShowFilters, setTemplateShowFilters] = useState(false);
  const [colabSearch, setColabSearch] = useState('');
  const [showEmpresaForm, setShowEmpresaForm] = useState(false);
  const [editingEmpresaId, setEditingEmpresaId] = useState<string | null>(null);
  const [showColabForm, setShowColabForm] = useState(false);
  const [editingColabId, setEditingColabId] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: empresas, isLoading: loadingEmpresas } = useQuery({
    queryKey: ['empresas', empresaSearch],
    queryFn: async () => {
      let query = supabase.from('empresas').select('*').order('razao_social');
      if (empresaSearch) query = query.or(`razao_social.ilike.%${empresaSearch}%,nome_fantasia.ilike.%${empresaSearch}%,cnpj.ilike.%${empresaSearch}%`);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const { data: colaboradores, isLoading: loadingColabs } = useQuery({
    queryKey: ['colaboradores', colabSearch],
    queryFn: async () => {
      let query = supabase.from('colaboradores').select(`*, empresas(razao_social)`).order('nome_completo');
      if (colabSearch) query = query.or(`nome_completo.ilike.%${colabSearch}%,cpf.ilike.%${colabSearch}%,matricula.ilike.%${colabSearch}%`);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const deleteEmpresa = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('empresas').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['empresas'] }); toast({ title: 'Empresa removida' }); },
    onError: (err: Error) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  const deleteColab = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('colaboradores').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['colaboradores'] }); toast({ title: 'Colaborador removido' }); },
    onError: (err: Error) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  // Show forms
  if (showEmpresaForm || editingEmpresaId) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Cadastros</h1>
        </div>
        <EmpresaFormInline
          empresaId={editingEmpresaId}
          onClose={() => { setShowEmpresaForm(false); setEditingEmpresaId(null); }}
          onSaved={() => { setShowEmpresaForm(false); setEditingEmpresaId(null); queryClient.invalidateQueries({ queryKey: ['empresas'] }); }}
        />
      </div>
    );
  }

  if (showColabForm || editingColabId) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Cadastros</h1>
        </div>
        <ColaboradorFormInline
          colaboradorId={editingColabId}
          onClose={() => { setShowColabForm(false); setEditingColabId(null); }}
          onSaved={() => { setShowColabForm(false); setEditingColabId(null); queryClient.invalidateQueries({ queryKey: ['colaboradores'] }); }}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Cadastros</h1>
          <p className="text-muted-foreground">Gestão de empresas e colaboradores</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <Tabs defaultValue="empresas" onValueChange={(v) => setActiveTab(v)}>
            <div className="px-6 pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <TabsList>
                <TabsTrigger value="empresas">Empresas ({empresas?.length ?? 0})</TabsTrigger>
                <TabsTrigger value="colaboradores">Colaboradores ({colaboradores?.length ?? 0})</TabsTrigger>
                <TabsTrigger value="templates">Formulários</TabsTrigger>
                <TabsTrigger value="faturamento">Faturamento</TabsTrigger>
              </TabsList>
              {activeTab === 'faturamento' && (
                <div className="flex items-center gap-3">
                  <Select value={faturamentoEmpresa} onValueChange={setFaturamentoEmpresa}>
                    <SelectTrigger className="w-72"><SelectValue placeholder="Selecione a empresa..." /></SelectTrigger>
                    <SelectContent>
                      {empresas?.map(e => (
                        <SelectItem key={e.id} value={e.id}>{e.razao_social}{e.nome_fantasia ? ` (${e.nome_fantasia})` : ''}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {activeTab === 'templates' && (
                <div className="flex items-center gap-3">
                  <Select value={templateEmpresa} onValueChange={setTemplateEmpresa}>
                    <SelectTrigger className="w-56"><SelectValue placeholder="Todas / Global" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__global__">Global (Padrão)</SelectItem>
                      {empresas?.map(e => <SelectItem key={e.id} value={e.id}>{e.razao_social}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button onClick={() => setTemplateNewTrigger(Date.now())} className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_4px_14px_0_hsl(var(--primary)/0.4)] hover:shadow-[0_6px_20px_0_hsl(var(--primary)/0.5)] hover:scale-105 hover:-translate-y-0.5 transition-all duration-200 whitespace-nowrap">
                    Novo Formulário
                  </Button>
                </div>
              )}
              {!['faturamento', 'templates'].includes(activeTab) && (
              <div className="flex items-center gap-3">
                {activeTab === 'empresas' ? (
                  <>
                    <Input placeholder="Buscar empresa..." value={empresaSearch} onChange={(e) => setEmpresaSearch(e.target.value)} className="w-64" />
                    <Button onClick={() => setShowEmpresaForm(true)} className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_4px_14px_0_hsl(var(--primary)/0.4)] hover:shadow-[0_6px_20px_0_hsl(var(--primary)/0.5)] hover:scale-105 hover:-translate-y-0.5 transition-all duration-200 whitespace-nowrap">
                      Nova Empresa
                    </Button>
                  </>
                ) : (
                  <>
                    <Input placeholder="Buscar colaborador..." value={colabSearch} onChange={(e) => setColabSearch(e.target.value)} className="w-64" />
                    <Button onClick={() => setShowColabForm(true)} className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_4px_14px_0_hsl(var(--primary)/0.4)] hover:shadow-[0_6px_20px_0_hsl(var(--primary)/0.5)] hover:scale-105 hover:-translate-y-0.5 transition-all duration-200 whitespace-nowrap">
                      Novo Colaborador
                    </Button>
                  </>
                )}
              </div>
              )}
            </div>

            <TabsContent value="empresas" className="mt-0">
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
                  {loadingEmpresas ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                  ) : empresas?.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhuma empresa cadastrada</TableCell></TableRow>
                  ) : empresas?.map((emp) => (
                    <TableRow key={emp.id} className="cursor-pointer" onClick={() => navigate(`/empresas/${emp.id}`)}>
                      <TableCell>
                        <p className="font-medium">{emp.razao_social}</p>
                        {emp.nome_fantasia && <p className="text-sm text-muted-foreground">{emp.nome_fantasia}</p>}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{emp.cnpj || '—'}</TableCell>
                      <TableCell>{emp.endereco_cidade && emp.endereco_uf ? `${emp.endereco_cidade}/${emp.endereco_uf}` : '—'}</TableCell>
                      <TableCell>{emp.grau_risco ? <Badge variant={emp.grau_risco >= 3 ? 'destructive' : 'default'}>GR {emp.grau_risco}</Badge> : '—'}</TableCell>
                      <TableCell><Badge variant={emp.ativa ? 'default' : 'secondary'}>{emp.ativa ? 'Ativa' : 'Inativa'}</Badge></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm" onClick={() => setEditingEmpresaId(emp.id)}>Editar</Button>
                          <Button variant="ghost" size="sm" onClick={() => deleteEmpresa.mutate(emp.id)} className="text-destructive hover:text-destructive">Excluir</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="colaboradores" className="mt-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Matrícula</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingColabs ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                  ) : colaboradores?.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum colaborador cadastrado</TableCell></TableRow>
                  ) : colaboradores?.map((col) => (
                    <TableRow key={col.id}>
                      <TableCell className="font-medium">{col.nome_completo}</TableCell>
                      <TableCell>{col.matricula || '—'}</TableCell>
                      <TableCell>{(col.empresas as any)?.razao_social || '—'}</TableCell>
                      <TableCell><Badge variant={col.status === 'ativo' ? 'default' : 'secondary'}>{col.status}</Badge></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => setEditingColabId(col.id)}>Editar</Button>
                          <Button variant="ghost" size="sm" onClick={() => deleteColab.mutate(col.id)} className="text-destructive hover:text-destructive">Excluir</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="templates" className="mt-0 p-6">
              <TemplatesTab selectedEmpresa={templateEmpresa} onSelectedEmpresaChange={setTemplateEmpresa} externalNewTrigger={templateNewTrigger} />
            </TabsContent>




            <TabsContent value="faturamento" className="mt-0 p-6">
              <FaturamentoTab selectedEmpresa={faturamentoEmpresa} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default CadastrosPage;
