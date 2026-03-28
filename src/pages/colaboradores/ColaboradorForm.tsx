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
  colaboradorId: string | null;
  onClose: () => void;
  onSaved: () => void;
}

const ColaboradorForm = ({ colaboradorId, onClose, onSaved }: Props) => {
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
    queryFn: async () => {
      const { data } = await supabase.from('empresas').select('id, razao_social').eq('ativa', true).order('razao_social');
      return data ?? [];
    },
  });

  const { data: unidades } = useQuery({
    queryKey: ['unidades-select', form.empresa_id],
    queryFn: async () => {
      if (!form.empresa_id) return [];
      const { data } = await supabase.from('unidades').select('id, nome').eq('empresa_id', form.empresa_id).order('nome');
      return data ?? [];
    },
    enabled: !!form.empresa_id,
  });

  const { data: setoresData } = useQuery({
    queryKey: ['setores-select', form.empresa_id],
    queryFn: async () => {
      if (!form.empresa_id) return [];
      const { data } = await supabase.from('setores').select('id, nome').eq('empresa_id', form.empresa_id).order('nome');
      return data ?? [];
    },
    enabled: !!form.empresa_id,
  });

  const { data: cargosData } = useQuery({
    queryKey: ['cargos-select', form.empresa_id],
    queryFn: async () => {
      if (!form.empresa_id) return [];
      const { data } = await supabase.from('cargos').select('id, nome').eq('empresa_id', form.empresa_id).order('nome');
      return data ?? [];
    },
    enabled: !!form.empresa_id,
  });

  const { data: existing } = useQuery({
    queryKey: ['colaborador', colaboradorId],
    queryFn: async () => {
      if (!colaboradorId) return null;
      const { data, error } = await supabase.from('colaboradores').select('*').eq('id', colaboradorId).single();
      if (error) throw error;
      return data;
    },
    enabled: !!colaboradorId,
  });

  // Load linked profile
  const { data: linkedProfile } = useQuery({
    queryKey: ['colaborador-profile', existing?.user_id],
    queryFn: async () => {
      if (!existing?.user_id) return null;
      const { data } = await supabase.from('profiles').select('*').eq('id', existing.user_id).maybeSingle();
      return data;
    },
    enabled: !!existing?.user_id,
  });

  useEffect(() => {
    if (existing) {
      setForm({
        nome_completo: existing.nome_completo || '',
        matricula: existing.matricula || '',
        cpf: existing.cpf || '',
        data_nascimento: existing.data_nascimento || '',
        sexo: existing.sexo || '',
        empresa_id: existing.empresa_id || '',
        unidade_id: existing.unidade_id || '',
        setor_id: existing.setor_id || '',
        cargo_id: existing.cargo_id || '',
        data_admissao: existing.data_admissao || '',
        jornada: existing.jornada || '',
        turno: existing.turno || '',
        gestor_responsavel: existing.gestor_responsavel || '',
        status: existing.status || 'ativo',
      });
      if (existing.user_id) setLinkedUserId(existing.user_id);
    }
  }, [existing]);

  useEffect(() => {
    if (linkedProfile) {
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

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        data_nascimento: form.data_nascimento || null,
        data_admissao: form.data_admissao || null,
        unidade_id: form.unidade_id || null,
        setor_id: form.setor_id || null,
        cargo_id: form.cargo_id || null,
        sexo: form.sexo || null,
      };
      if (isEdit) {
        const { error } = await supabase.from('colaboradores').update(payload).eq('id', colaboradorId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('colaboradores').insert(payload);
        if (error) throw error;
      }

      // Upload avatar if changed
      if (avatarFile && linkedUserId) {
        const ext = avatarFile.name.split('.').pop();
        const path = `colaborador-${linkedUserId}/avatar.${ext}`;
        const { error: uploadError } = await supabase.storage.from('avatars').upload(path, avatarFile, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
        await supabase.from('profiles').update({
          full_name: userForm.full_name,
          avatar_url: urlData.publicUrl,
        } as any).eq('id', linkedUserId);
      } else if (linkedUserId) {
        await supabase.from('profiles').update({
          full_name: userForm.full_name,
        } as any).eq('id', linkedUserId);
      }

      await supabase.from('audit_logs').insert({
        user_id: user?.id,
        entity_type: 'colaborador',
        entity_id: colaboradorId || undefined,
        action: isEdit ? 'update' : 'create',
        new_data: payload as any,
      });
    },
    onSuccess: () => {
      toast({ title: isEdit ? 'Colaborador atualizado' : 'Colaborador cadastrado' });
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

  const set = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{isEdit ? 'Editar Colaborador' : 'Novo Colaborador'}</h1>
          <p className="text-muted-foreground">Cadastro completo do colaborador</p>
        </div>
        <Button variant="outline" onClick={onClose} className="rounded-full shadow-[0_4px_14px_0_hsl(var(--border)/0.4)] hover:scale-105 hover:-translate-y-0.5 transition-all duration-200">Voltar</Button>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}>
        <Card className="overflow-hidden">
          <CardContent className="p-6 space-y-6">
            {/* Dados Pessoais */}
            <div className="flex items-center gap-2 text-primary">
<h2 className="text-lg font-semibold" style={{ fontFamily: 'Space Grotesk' }}>Dados Pessoais</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label>Nome Completo *</Label>
                <Input value={form.nome_completo} onChange={(e) => set('nome_completo', e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>CPF</Label>
                <Input value={form.cpf} onChange={(e) => set('cpf', e.target.value)} placeholder="000.000.000-00" />
              </div>
              <div className="space-y-2">
                <Label>Data de Nascimento</Label>
                <Input type="date" value={form.data_nascimento} onChange={(e) => set('data_nascimento', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Sexo</Label>
                <Select value={form.sexo} onValueChange={(v) => set('sexo', v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">Masculino</SelectItem>
                    <SelectItem value="F">Feminino</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* Vínculo Funcional */}
            <div className="flex items-center gap-2 text-primary">
<h2 className="text-lg font-semibold" style={{ fontFamily: 'Space Grotesk' }}>Vínculo Funcional</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Empresa *</Label>
                <Select value={form.empresa_id} onValueChange={(v) => set('empresa_id', v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione a empresa" /></SelectTrigger>
                  <SelectContent>{empresas?.map((e) => <SelectItem key={e.id} value={e.id}>{e.razao_social}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Matrícula</Label>
                <Input value={form.matricula} onChange={(e) => set('matricula', e.target.value)} />
              </div>
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
              <div className="space-y-2">
                <Label>Data de Admissão</Label>
                <Input type="date" value={form.data_admissao} onChange={(e) => set('data_admissao', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Jornada</Label>
                <Input value={form.jornada} onChange={(e) => set('jornada', e.target.value)} placeholder="Ex: 8h diárias" />
              </div>
              <div className="space-y-2">
                <Label>Turno</Label>
                <Select value={form.turno} onValueChange={(v) => set('turno', v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Diurno">Diurno</SelectItem>
                    <SelectItem value="Noturno">Noturno</SelectItem>
                    <SelectItem value="Revezamento">Revezamento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Gestor Responsável</Label>
                <Input value={form.gestor_responsavel} onChange={(e) => set('gestor_responsavel', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => set('status', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                    <SelectItem value="afastado">Afastado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Perfil de Usuário vinculado */}
            {isEdit && linkedUserId && (
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

export default ColaboradorForm;
