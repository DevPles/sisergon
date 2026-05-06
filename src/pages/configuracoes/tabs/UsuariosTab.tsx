import { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';

const ROLE_LABELS: Record<string, string> = {
  admin_master: 'Administrador Master',
  consultor: 'Consultor',
  empresa_gestor: 'Empresa / Gestor',
  empresa_admin: 'Empresa Admin',
  colaborador: 'Colaborador',
};

const ROLE_COLORS: Record<string, string> = {
  admin_master: 'bg-primary/10 text-primary border-primary/30',
  consultor: 'bg-blue-500/10 text-blue-700 border-blue-500/30',
  empresa_gestor: 'bg-green-500/10 text-green-700 border-green-500/30',
  empresa_admin: 'bg-amber-500/10 text-amber-700 border-amber-500/30',
  colaborador: 'bg-muted text-muted-foreground border-border',
};

interface UsuariosTabProps {
  externalSearch?: string;
  externalRoleFilter?: string;
}

const UsuariosTab = ({ externalSearch, externalRoleFilter, onInviteClick }: UsuariosTabProps & { onInviteClick?: () => void }) => {
  useEffect(() => {
    const handleOpenInvite = () => setView('invite');
    window.addEventListener('open-convidar-usuario', handleOpenInvite);
    return () => window.removeEventListener('open-convidar-usuario', handleOpenInvite);
  }, []);

  const { toast } = useToast();
  const [searchState, setSearchState] = useState('');
  const [roleFilterState, setRoleFilterState] = useState('all');
  
  const search = externalSearch !== undefined ? externalSearch : searchState;
  const roleFilter = externalRoleFilter !== undefined ? externalRoleFilter : roleFilterState;
  const [view, setView] = useState<'list' | 'invite' | 'edit'>('list');
  const [editingUser, setEditingUser] = useState<any>(null);

  const { data: profiles, isLoading } = useQuery({
    queryKey: ['config-profiles', search, roleFilter],
    queryFn: async () => {
      let query = supabase.from('profiles').select('*').order('full_name');
      if (search) query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
      const { data: profilesData, error } = await query;
      if (error) throw error;
      const { data: rolesData } = await supabase.from('user_roles').select('user_id, role');
      const rolesMap: Record<string, string[]> = {};
      rolesData?.forEach((r) => {
        if (!rolesMap[r.user_id]) rolesMap[r.user_id] = [];
        rolesMap[r.user_id].push(r.role);
      });
      let result = (profilesData ?? []).map((p) => ({ ...p, roles: rolesMap[p.id] ?? [] }));
      if (roleFilter !== 'all') result = result.filter((p) => p.roles.includes(roleFilter));
      return result;
    },
  });

  const { data: empresas } = useQuery({
    queryKey: ['empresas-select'],
    queryFn: async () => {
      const { data } = await supabase.from('empresas').select('id, razao_social').order('razao_social');
      return data ?? [];
    },
  });

  const handleResetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else toast({ title: 'E-mail de redefinição enviado' });
  };

  const handleEdit = (user: any) => {
    setEditingUser(user);
    setView('edit');
  };

  if (view === 'invite') return <UserForm empresas={empresas ?? []} onClose={() => setView('list')} />;
  if (view === 'edit' && editingUser) return <UserForm empresas={empresas ?? []} user={editingUser} onClose={() => { setView('list'); setEditingUser(null); }} />;

  const totalUsers = profiles?.length ?? 0;
  const activeUsers = profiles?.filter((p: any) => p.roles.length > 0).length ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted-foreground whitespace-nowrap">{totalUsers} usuários ({activeUsers} ativos)</span>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]"></TableHead>
            <TableHead>Nome</TableHead>
            <TableHead>E-mail</TableHead>
            <TableHead>Perfil</TableHead>
            <TableHead>Empresa</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
          ) : profiles?.length === 0 ? (
            <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum usuário</TableCell></TableRow>
          ) : profiles?.map((p: any) => {
            const initials = (p.full_name || '?').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
            return (
              <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleEdit(p)}>
                <TableCell>
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={p.avatar_url || ''} alt={p.full_name} />
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">{initials}</AvatarFallback>
                  </Avatar>
                </TableCell>
                <TableCell className="font-medium">{p.full_name || '—'}</TableCell>
                <TableCell className="text-muted-foreground">{p.email || '—'}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {p.roles?.map((role: string) => (
                      <Badge key={role} variant="outline" className={ROLE_COLORS[role] || ''}>{ROLE_LABELS[role] || role}</Badge>
                    ))}
                    {(!p.roles || p.roles.length === 0) && <Badge variant="outline" className="text-muted-foreground">Sem perfil</Badge>}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {p.empresa_id ? (empresas?.find(e => e.id === p.empresa_id)?.razao_social || '—') : '—'}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(p)}>Editar</Button>
                    <Button variant="ghost" size="sm" onClick={() => p.email && handleResetPassword(p.email)}>Resetar Senha</Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

interface UserFormProps {
  empresas: any[];
  user?: any;
  onClose: () => void;
}

const UserForm = ({ empresas, user, onClose }: UserFormProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEdit = !!user;

  const [email, setEmail] = useState(user?.email || '');
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [role, setRole] = useState(user?.roles?.[0] || 'consultor');
  const [empresaId, setEmpresaId] = useState(user?.empresa_id || 'none');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resettingPw, setResettingPw] = useState(false);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `${user?.id || 'new'}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
      setAvatarUrl(urlData.publicUrl);
      toast({ title: 'Foto enviada' });
    } catch (err: any) {
      toast({ title: 'Erro ao enviar foto', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (isEdit) {
      setSending(true);
      try {
        // Update email if changed
        if (email !== user.email) {
          const { data: emailResult, error: emailFnError } = await supabase.functions.invoke('update-user-email', {
            body: { user_id: user.id, new_email: email },
          });
          if (emailFnError) throw emailFnError;
          if (emailResult?.error) throw new Error(emailResult.error);
        }

        const { error: profileError } = await supabase.from('profiles').update({
          full_name: fullName,
          empresa_id: empresaId === 'none' ? null : empresaId,
          avatar_url: avatarUrl || null,
        }).eq('id', user.id);
        if (profileError) throw profileError;

        const currentRoles = user.roles || [];
        if (!currentRoles.includes(role) || currentRoles.length > 1) {
          await supabase.from('user_roles').delete().eq('user_id', user.id);
          const { error: roleError } = await supabase.from('user_roles').insert({ user_id: user.id, role: role as any });
          if (roleError) throw roleError;
        }

        queryClient.invalidateQueries({ queryKey: ['config-profiles'] });
        toast({ title: 'Usuário atualizado' });
        onClose();
      } catch (err: any) {
        toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' });
      } finally {
        setSending(false);
      }
    } else {
      if (!email || !fullName) {
        toast({ title: 'Preencha nome e e-mail', variant: 'destructive' });
        return;
      }
      setSending(true);
      try {
        const { error } = await supabase.functions.invoke('invite-user', {
          body: { email, full_name: fullName, role, empresa_id: empresaId === 'none' ? null : empresaId, avatar_url: avatarUrl || null },
        });
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ['config-profiles'] });
        toast({ title: 'Convite enviado', description: `Usuário ${email} convidado como ${ROLE_LABELS[role]}` });
        onClose();
      } catch (err: any) {
        toast({ title: 'Erro ao convidar', description: err.message, variant: 'destructive' });
      } finally {
        setSending(false);
      }
    }
  };

  const initials = (fullName || '?').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{isEdit ? 'Editar Usuário' : 'Convidar Usuário'}</h2>
          {isEdit && <Badge variant="outline" className="text-xs text-muted-foreground">ID: {user.id.slice(0, 8)}...</Badge>}
        </div>

        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20">
            <AvatarImage src={avatarUrl} alt={fullName} />
            <AvatarFallback className="text-lg bg-primary/10 text-primary">{initials}</AvatarFallback>
          </Avatar>
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Foto do usuário</Label>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="rounded-full relative overflow-hidden" disabled={uploading}>
                {uploading ? 'Enviando...' : 'Alterar foto'}
                <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleAvatarUpload} />
              </Button>
              {avatarUrl && <Button variant="ghost" size="sm" onClick={() => setAvatarUrl('')} className="text-destructive">Remover</Button>}
            </div>
          </div>
        </div>

        <Separator />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Nome completo *</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>E-mail *</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Perfil de acesso</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admin_master">Administrador Master</SelectItem>
                <SelectItem value="consultor">Consultor / Avaliador</SelectItem>
                <SelectItem value="empresa_admin">Administrador da Empresa</SelectItem>
                <SelectItem value="empresa_gestor">Empresa / Gestor</SelectItem>
                <SelectItem value="colaborador">Colaborador</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Empresa vinculada</Label>
            <Select value={empresaId} onValueChange={setEmpresaId}>
              <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma</SelectItem>
                {empresas.map((e) => <SelectItem key={e.id} value={e.id}>{e.razao_social}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Card className="bg-muted/50 border-dashed">
          <CardContent className="p-4">
            <p className="text-sm font-medium mb-1">Permissões do perfil: {ROLE_LABELS[role]}</p>
            <p className="text-xs text-muted-foreground">
              {role === 'admin_master' && 'Acesso total ao sistema. Pode gerenciar empresas, usuários, consultores, planos, configurações e dashboards.'}
              {role === 'consultor' && 'Acesso técnico. Pode realizar avaliações, emitir laudos e criar planos de ação nas empresas vinculadas.'}
              {role === 'empresa_admin' && 'Gestão interna da empresa. Pode gerenciar usuários internos, acompanhar dados e indicadores da empresa.'}
              {role === 'empresa_gestor' && 'Visualização gerencial. Pode acompanhar colaboradores, avaliações, laudos e planos da empresa.'}
              {role === 'colaborador' && 'Portal individual. Pode responder checklists, visualizar histórico pessoal e orientações recebidas.'}
            </p>
          </CardContent>
        </Card>

        {/* Admin password reset */}
        {isEdit && (
          <>
            <Separator />
            <div className="space-y-2">
              <Label>Definir nova senha para este usuário</Label>
              <div className="flex gap-2">
                <div className="relative flex-1 max-w-sm">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Nova senha (mín. 6 caracteres)"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={resettingPw || newPassword.length < 6}
                  onClick={async () => {
                    setResettingPw(true);
                    try {
                      const { data: result, error } = await supabase.functions.invoke('admin-reset-password', {
                        body: { user_id: user.id, new_password: newPassword },
                      });
                      if (error) throw error;
                      if (result?.error) throw new Error(result.error);
                      toast({ title: 'Senha alterada com sucesso' });
                      setNewPassword('');
                    } catch (err: any) {
                      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
                    } finally {
                      setResettingPw(false);
                    }
                  }}
                >
                  {resettingPw ? 'Alterando...' : 'Alterar Senha'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">A senha será alterada imediatamente. O usuário poderá usar a nova senha no próximo login.</p>
            </div>
          </>
        )}

        <Separator />
        <div className="flex items-center justify-between">
          <div>
            {isEdit && (
              <Button variant="ghost" size="sm" onClick={() => user.email && handleResetPassword(user.email)} className="text-muted-foreground">
                Enviar e-mail de redefinição de senha
              </Button>
            )}
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onClose} className="rounded-full">Cancelar</Button>
            <Button onClick={handleSave} disabled={sending} className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground">
              {sending ? 'Salvando...' : isEdit ? 'Salvar Alterações' : 'Enviar Convite'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const handleResetPassword = async (email: string) => {
  await supabase.auth.resetPasswordForEmail(email);
};

export default UsuariosTab;
