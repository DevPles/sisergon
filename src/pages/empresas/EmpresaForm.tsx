import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';

interface Props {
  empresaId: string | null;
  onClose: () => void;
  onSaved: () => void;
}

const UF_LIST = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

const EmpresaForm = ({ empresaId, onClose, onSaved }: Props) => {
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
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

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

  // Load linked profile (gestor) for this empresa
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
        razao_social: existing.razao_social || '',
        nome_fantasia: existing.nome_fantasia || '',
        cnpj: existing.cnpj || '',
        cnae: existing.cnae || '',
        grau_risco: existing.grau_risco?.toString() || '',
        endereco_logradouro: existing.endereco_logradouro || '',
        endereco_numero: existing.endereco_numero || '',
        endereco_complemento: existing.endereco_complemento || '',
        endereco_bairro: existing.endereco_bairro || '',
        endereco_cidade: existing.endereco_cidade || '',
        endereco_uf: existing.endereco_uf || '',
        endereco_cep: existing.endereco_cep || '',
        responsavel_nome: existing.responsavel_nome || '',
        responsavel_email: existing.responsavel_email || '',
        responsavel_telefone: existing.responsavel_telefone || '',
        ativa: existing.ativa,
      });
      if (existing.logo_url) {
        setLogoPreview(existing.logo_url);
      }
    }
  }, [existing]);

  useEffect(() => {
    if (linkedProfile) {
      setLinkedProfileId(linkedProfile.id);
      setUserForm({
        full_name: linkedProfile.full_name || '',
        email: linkedProfile.email || '',
        avatar_url: (linkedProfile as any).avatar_url || '',
      });
      if ((linkedProfile as any).avatar_url) {
        setAvatarPreview((linkedProfile as any).avatar_url);
      }
    }
  }, [linkedProfile]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        grau_risco: form.grau_risco ? parseInt(form.grau_risco) : null,
      };

      let empresaResultId = empresaId;

      if (isEdit) {
        const { error } = await supabase.from('empresas').update(payload).eq('id', empresaId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('empresas').insert(payload).select('id').single();
        if (error) throw error;
        empresaResultId = data.id;
      }

      // Upload logo if changed
      if (logoFile && empresaResultId) {
        const ext = logoFile.name.split('.').pop();
        const path = `empresa-${empresaResultId}/logo.${ext}`;
        const { error: logoUploadError } = await supabase.storage.from('avatars').upload(path, logoFile, { upsert: true });
        if (logoUploadError) throw logoUploadError;
        const { data: logoUrlData } = supabase.storage.from('avatars').getPublicUrl(path);
        await supabase.from('empresas').update({ logo_url: logoUrlData.publicUrl }).eq('id', empresaResultId);
      } else if (!logoPreview && existing?.logo_url) {
        // Logo was removed
        await supabase.from('empresas').update({ logo_url: null }).eq('id', empresaResultId);
      }

      // Upload avatar if changed
      let avatarUrl = userForm.avatar_url;
      if (avatarFile && empresaResultId) {
        const ext = avatarFile.name.split('.').pop();
        const path = `empresa-${empresaResultId}/avatar.${ext}`;
        const { error: uploadError } = await supabase.storage.from('avatars').upload(path, avatarFile, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
        avatarUrl = urlData.publicUrl;
      }

      // Update linked profile if exists
      if (linkedProfileId) {
        await supabase.from('profiles').update({
          full_name: userForm.full_name,
          avatar_url: avatarUrl,
        } as any).eq('id', linkedProfileId);
      }

      await supabase.from('audit_logs').insert({
        user_id: user?.id,
        entity_type: 'empresa',
        entity_id: empresaResultId || undefined,
        action: isEdit ? 'update' : 'create',
        new_data: payload as any,
      });
    },
    onSuccess: () => {
      toast({ title: isEdit ? 'Empresa atualizada' : 'Empresa cadastrada' });
      onSaved();
    },
    onError: (err: Error) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  const handleResetPassword = async () => {
    if (!userForm.email) {
      toast({ title: 'E-mail não informado', variant: 'destructive' });
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(userForm.email);
    if (error) {
      toast({ title: 'Erro ao enviar reset', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'E-mail de redefinição enviado' });
    }
  };

  const set = (field: string, value: string | boolean) => setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{isEdit ? 'Editar Empresa' : 'Nova Empresa'}</h1>
          <p className="text-muted-foreground">Cadastro completo da empresa</p>
        </div>
        <Button variant="outline" onClick={onClose} className="rounded-full shadow-[0_4px_14px_0_hsl(var(--border)/0.4)] hover:scale-105 hover:-translate-y-0.5 transition-all duration-200">Voltar</Button>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}>
        <Card className="overflow-hidden">
          <CardContent className="p-6 space-y-6">
            {/* Dados da Empresa */}
            <div className="flex items-center gap-2 text-primary">
<h2 className="text-lg font-semibold" style={{ fontFamily: 'Space Grotesk' }}>Dados da Empresa</h2>
            </div>
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

            {/* Identidade Visual */}
            <div className="flex items-center gap-2 text-primary">
<h2 className="text-lg font-semibold" style={{ fontFamily: 'Space Grotesk' }}>Identidade Visual</h2>
            </div>
            <div className="flex items-start gap-6">
              <div className="flex flex-col items-center gap-2">
                <div className="relative group w-32 h-32 rounded-xl border-2 border-dashed border-border bg-muted/50 flex items-center justify-center overflow-hidden">
                  {logoPreview ? (
                    <>
                      <img src={logoPreview} alt="Logo da empresa" className="w-full h-full object-contain p-2" />
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
✕
                      </button>
                    </>
                  ) : (
                    <label className="cursor-pointer flex flex-col items-center gap-1 text-muted-foreground hover:text-primary transition-colors">
                      <span className="text-xs">Upload Logo</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                    </label>
                  )}
                </div>
                {logoPreview && (
                  <label className="text-xs text-primary cursor-pointer hover:underline">
                    Alterar logo
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                  </label>
                )}
              </div>
              <div className="flex-1 text-sm text-muted-foreground space-y-1">
                <p>Faça upload do logotipo da empresa.</p>
                <p>Formatos aceitos: PNG, JPG, SVG. Tamanho recomendado: 512×512px.</p>
                <p>O logo será utilizado em relatórios, laudos e documentos gerados pelo sistema.</p>
              </div>
            </div>

            <Separator />

            {/* Endereço */}
            <div className="flex items-center gap-2 text-primary">
<h2 className="text-lg font-semibold" style={{ fontFamily: 'Space Grotesk' }}>Endereço</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label>Logradouro</Label>
                <Input value={form.endereco_logradouro} onChange={(e) => set('endereco_logradouro', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Número</Label>
                <Input value={form.endereco_numero} onChange={(e) => set('endereco_numero', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Complemento</Label>
                <Input value={form.endereco_complemento} onChange={(e) => set('endereco_complemento', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Bairro</Label>
                <Input value={form.endereco_bairro} onChange={(e) => set('endereco_bairro', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Cidade</Label>
                <Input value={form.endereco_cidade} onChange={(e) => set('endereco_cidade', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>UF</Label>
                <Select value={form.endereco_uf} onValueChange={(v) => set('endereco_uf', v)}>
                  <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                  <SelectContent>{UF_LIST.map((uf) => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>CEP</Label>
                <Input value={form.endereco_cep} onChange={(e) => set('endereco_cep', e.target.value)} placeholder="00000-000" />
              </div>
            </div>

            <Separator />

            {/* Responsável */}
            <div className="flex items-center gap-2 text-primary">
<h2 className="text-lg font-semibold" style={{ fontFamily: 'Space Grotesk' }}>Responsável</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={form.responsavel_nome} onChange={(e) => set('responsavel_nome', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input type="email" value={form.responsavel_email} onChange={(e) => set('responsavel_email', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input value={form.responsavel_telefone} onChange={(e) => set('responsavel_telefone', e.target.value)} />
              </div>
            </div>

            {/* Perfil de Usuário vinculado */}
            {isEdit && (
              <>
                <Separator />
                <div className="flex items-center gap-2 text-primary">
<h2 className="text-lg font-semibold" style={{ fontFamily: 'Space Grotesk' }}>Perfil de Usuário Vinculado</h2>
                </div>
                <div className="flex items-start gap-6">
                  <div className="flex flex-col items-center gap-2">
                    <div className="relative group">
                      <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-primary/20">
                        {avatarPreview ? (
                          <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
<span className="text-2xl text-muted-foreground">📷</span>
                        )}
                      </div>
                      <label className="absolute inset-0 rounded-full cursor-pointer flex items-center justify-center bg-primary/0 group-hover:bg-primary/30 transition-colors">
                        <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                      </label>
                    </div>
                    <span className="text-xs text-muted-foreground">Alterar foto</span>
                  </div>
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nome Completo</Label>
                      <Input value={userForm.full_name} onChange={(e) => setUserForm(p => ({ ...p, full_name: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>E-mail do Usuário</Label>
                      <Input value={userForm.email} disabled className="bg-muted" />
                    </div>
                    <div className="md:col-span-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleResetPassword}
                        disabled={!userForm.email}
                        className="rounded-full shadow-[0_4px_14px_0_hsl(var(--border)/0.4)] hover:scale-105 hover:-translate-y-0.5 transition-all duration-200"
                      >
                        Enviar Reset de Senha
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}

            <Separator />

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={onClose} className="rounded-full shadow-[0_4px_14px_0_hsl(var(--border)/0.4)] hover:scale-105 hover:-translate-y-0.5 transition-all duration-200">Cancelar</Button>
              <Button type="submit" disabled={mutation.isPending} className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_4px_14px_0_hsl(var(--primary)/0.4)] hover:shadow-[0_6px_20px_0_hsl(var(--primary)/0.5)] hover:scale-105 hover:-translate-y-0.5 transition-all duration-200">
                {mutation.isPending ? 'Salvando...' : isEdit ? 'Atualizar' : 'Cadastrar'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
};

export default EmpresaForm;
