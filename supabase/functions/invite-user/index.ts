import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

type InvitePayload = {
  email?: string;
  full_name?: string;
  role?: string;
  empresa_id?: string | null;
  avatar_url?: string | null;
  password?: string;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const body: InvitePayload = await req.json();
    const { email, full_name, role, empresa_id, avatar_url, password } = body;

    if (!email || !full_name || !role) {
      throw new Error('E-mail, nome e perfil são obrigatórios');
    }

    const authHeader = req.headers.get('Authorization');
    const { count: rolesCount, error: countError } = await supabaseAdmin
      .from('user_roles')
      .select('id', { count: 'exact', head: true });

    if (countError) throw countError;

    const isFirstUserBootstrap = !authHeader && (rolesCount ?? 0) === 0 && role === 'admin_master';

    if (!isFirstUserBootstrap) {
      if (!authHeader) throw new Error('Não autorizado');

      const token = authHeader.replace('Bearer ', '');
      const {
        data: { user: caller },
      } = await supabaseAdmin.auth.getUser(token);

      if (!caller) throw new Error('Não autorizado');

      const { data: callerRoles } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', caller.id);

      const isAdmin = callerRoles?.some((r: { role: string }) => r.role === 'admin_master');
      if (!isAdmin) throw new Error('Apenas administradores podem convidar usuários');
    }

    const tempPassword = `Ergon${Date.now().toString(36)}!`;
    const userPassword = password?.trim() ? password : tempPassword;

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: userPassword,
      email_confirm: true,
      user_metadata: { full_name },
    });

    if (createError) throw createError;
    if (!newUser.user) throw new Error('Falha ao criar usuário');

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert(
        {
          id: newUser.user.id,
          full_name,
          email,
          empresa_id: empresa_id || null,
          avatar_url: avatar_url || null,
        },
        { onConflict: 'id' },
      );

    if (profileError) throw profileError;

    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({ user_id: newUser.user.id, role });

    if (roleError) throw roleError;

    if (!password) {
      await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: isFirstUserBootstrap
          ? 'Usuário administrador inicial criado com sucesso.'
          : `Usuário ${email} criado com sucesso.`,
        user_id: newUser.user.id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro inesperado';

    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});