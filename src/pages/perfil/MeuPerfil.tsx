import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

const ROLE_LABELS: Record<string, string> = {
  admin_master: 'Administrador Master',
  consultor: 'Consultor / Avaliador',
  empresa_admin: 'Administrador da Empresa',
  empresa_gestor: 'Gestor da Empresa',
  colaborador: 'Colaborador',
};

const MeuPerfil = () => {
  const { user, profile, roles, primaryRole, refreshProfile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  // Password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // Load full profile with avatar
  const { data: fullProfile } = useQuery({
    queryKey: ['meu-perfil', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user!.id)
        .single();
      if (data) {
        setFullName(data.full_name || '');
        setAvatarUrl(data.avatar_url || '');
      }
      return data;
    },
    enabled: !!user?.id,
  });

  // Empresa vinculada
  const { data: empresa } = useQuery({
    queryKey: ['minha-empresa-perfil', fullProfile?.empresa_id],
    queryFn: async () => {
      const { data } = await supabase
        .from('empresas')
        .select('razao_social, nome_fantasia, cnpj')
        .eq('id', fullProfile!.empresa_id!)
        .single();
      return data;
    },
    enabled: !!fullProfile?.empresa_id,
  });

  // Colaborador info (if role is colaborador)
  const { data: colaborador } = useQuery({
    queryKey: ['meu-colaborador-perfil', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('colaboradores')
        .select('*, cargos(nome), setores(nome), unidades(nome)')
        .eq('user_id', user!.id)
        .single();
      return data;
    },
    enabled: !!user?.id && roles.includes('colaborador'),
  });

  const updateProfile = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName, avatar_url: avatarUrl || null })
        .eq('id', user!.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['meu-perfil'] });
      await refreshProfile();
      toast({ title: 'Perfil atualizado com sucesso' });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao atualizar', description: err.message, variant: 'destructive' });
    },
  });

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `${user?.id}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
      setAvatarUrl(urlData.publicUrl);
      toast({ title: 'Foto enviada com sucesso' });
    } catch (err: any) {
      toast({ title: 'Erro ao enviar foto', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast({ title: 'A nova senha deve ter no mínimo 6 caracteres', variant: 'destructive' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: 'As senhas não coincidem', variant: 'destructive' });
      return;
    }
    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({ title: 'Senha alterada com sucesso' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast({ title: 'Erro ao alterar senha', description: err.message, variant: 'destructive' });
    } finally {
      setChangingPassword(false);
    }
  };

  const initials = (fullName || user?.email || '?')
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Meu Perfil</h1>
        <p className="text-muted-foreground">Gerencie suas informações pessoais e segurança</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card principal do perfil */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Dados Pessoais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar */}
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={avatarUrl} alt={fullName} />
                <AvatarFallback className="text-lg bg-primary/10 text-primary">{initials}</AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Foto de perfil</p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="rounded-full relative overflow-hidden" disabled={uploading}>
                    {uploading ? 'Enviando...' : 'Alterar foto'}
                    <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleAvatarUpload} />
                  </Button>
                  {avatarUrl && (
                    <Button variant="ghost" size="sm" onClick={() => setAvatarUrl('')} className="text-destructive">
                      Remover
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Campos editáveis */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome completo</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input value={user?.email || ''} disabled />
                <p className="text-xs text-muted-foreground">O e-mail não pode ser alterado</p>
              </div>
            </div>

            <Button onClick={() => updateProfile.mutate()} disabled={updateProfile.isPending} className="rounded-full">
              {updateProfile.isPending ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </CardContent>
        </Card>

        {/* Card de info lateral */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informações da Conta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Perfil de acesso</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {roles.map((role) => (
                    <Badge key={role} variant="outline">{ROLE_LABELS[role] || role}</Badge>
                  ))}
                </div>
              </div>
              {empresa && (
                <div>
                  <p className="text-sm text-muted-foreground">Empresa vinculada</p>
                  <p className="font-medium">{empresa.razao_social}</p>
                  {empresa.cnpj && <p className="text-xs text-muted-foreground">{empresa.cnpj}</p>}
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Membro desde</p>
                <p className="font-medium">
                  {fullProfile?.created_at ? format(new Date(fullProfile.created_at), 'dd/MM/yyyy') : '—'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Info do colaborador */}
          {colaborador && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Dados Funcionais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Matrícula</p>
                  <p className="font-medium">{colaborador.matricula || '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Cargo</p>
                  <p className="font-medium">{(colaborador.cargos as any)?.nome || '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Setor</p>
                  <p className="font-medium">{(colaborador.setores as any)?.nome || '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Unidade</p>
                  <p className="font-medium">{(colaborador.unidades as any)?.nome || '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Turno</p>
                  <p className="font-medium">{colaborador.turno || '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Data de Admissão</p>
                  <p className="font-medium">
                    {colaborador.data_admissao ? format(new Date(colaborador.data_admissao), 'dd/MM/yyyy') : '—'}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Alterar senha */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">Alterar Senha</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Nova senha</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
            </div>
            <div className="space-y-2">
              <Label>Confirmar nova senha</Label>
              <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repita a senha" />
            </div>
            <div className="flex items-end">
              <Button onClick={handleChangePassword} disabled={changingPassword} variant="outline" className="rounded-full">
                {changingPassword ? 'Alterando...' : 'Alterar Senha'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MeuPerfil;
