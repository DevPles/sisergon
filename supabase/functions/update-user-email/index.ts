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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Não autorizado');

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: caller } } = await supabaseAdmin.auth.getUser(token);
    if (!caller) throw new Error('Não autorizado');

    const { data: callerRoles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', caller.id);

    const isAdmin = callerRoles?.some((r: { role: string }) => r.role === 'admin_master');
    if (!isAdmin) throw new Error('Apenas administradores podem alterar e-mails');

    const { user_id, new_email } = await req.json();
    if (!user_id || !new_email) throw new Error('user_id e new_email são obrigatórios');

    // Update email in auth
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
      email: new_email,
      email_confirm: true,
    });
    if (authError) throw authError;

    // Update email in profiles
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ email: new_email })
      .eq('id', user_id);
    if (profileError) throw profileError;

    return new Response(
      JSON.stringify({ success: true, message: 'E-mail atualizado com sucesso' }),
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
