import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

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

    // Verify caller is admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Não autorizado');

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: caller } } = await supabaseAdmin.auth.getUser(token);
    if (!caller) throw new Error('Não autorizado');

    const { data: callerRoles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', caller.id);

    const isAdmin = callerRoles?.some((r: any) => r.role === 'admin_master');
    if (!isAdmin) throw new Error('Apenas administradores podem convidar usuários');

    const { email, full_name, role, empresa_id, avatar_url } = await req.json();

    if (!email || !full_name || !role) {
      throw new Error('E-mail, nome e perfil são obrigatórios');
    }

    // Create user with temporary password
    const tempPassword = `Ergon${Date.now().toString(36)}!`;
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name },
    });

    if (createError) throw createError;
    if (!newUser.user) throw new Error('Falha ao criar usuário');

    // Update profile
    await supabaseAdmin
      .from('profiles')
      .update({
        full_name,
        empresa_id: empresa_id || null,
        avatar_url: avatar_url || null,
      })
      .eq('id', newUser.user.id);

    // Assign role
    await supabaseAdmin
      .from('user_roles')
      .insert({ user_id: newUser.user.id, role });

    // Send password reset so user can set their own password
    await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email,
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Usuário ${email} criado com sucesso. Senha temporária: ${tempPassword}`,
        user_id: newUser.user.id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
