import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { corsHeaders } from 'https://esm.sh/@supabase/supabase-js@2.95.0/cors';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const today = now.toISOString().split('T')[0];

    // 1. Get active assignments
    const { data: assignments } = await supabase
      .from('test_assignments')
      .select('*')
      .eq('ativo', true);

    if (!assignments?.length) {
      return new Response(JSON.stringify({ message: 'No active assignments' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let instancesCreated = 0;
    let notificationsSent = 0;

    for (const assignment of assignments) {
      // Calculate period dates based on recurrence
      const periodStart = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
      const lastDay = new Date(currentYear, currentMonth, 0).getDate();
      const periodEnd = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(Math.min(assignment.dia_limite || 15, lastDay)).padStart(2, '0')}`;

      // Get target collaborators
      let colabQuery = supabase.from('colaboradores').select('id, user_id, empresa_id, nome_completo').eq('empresa_id', assignment.empresa_id).eq('status', 'ativo');
      if (assignment.setor_id) colabQuery = colabQuery.eq('setor_id', assignment.setor_id);
      if (assignment.colaborador_id) colabQuery = colabQuery.eq('id', assignment.colaborador_id);
      const { data: colaboradores } = await colabQuery;

      if (!colaboradores?.length) continue;

      for (const colab of colaboradores) {
        // Check if instance already exists for this period
        const { data: existing } = await supabase
          .from('test_assignment_instances')
          .select('id')
          .eq('assignment_id', assignment.id)
          .eq('colaborador_id', colab.id)
          .eq('data_inicio_periodo', periodStart)
          .maybeSingle();

        if (!existing) {
          await supabase.from('test_assignment_instances').insert({
            assignment_id: assignment.id,
            colaborador_id: colab.id,
            empresa_id: colab.empresa_id,
            tipo_teste: assignment.tipo_teste,
            data_inicio_periodo: periodStart,
            data_fim_periodo: periodEnd,
            status: 'pendente',
          });
          instancesCreated++;
        }
      }
    }

    // 2. Check for overdue instances and send notifications
    const { data: overdueInstances } = await supabase
      .from('test_assignment_instances')
      .select('*, colaboradores(nome_completo, empresa_id)')
      .eq('status', 'pendente')
      .eq('notificado_vencido', false)
      .lt('data_fim_periodo', today);

    if (overdueInstances?.length) {
      for (const instance of overdueInstances) {
        const colabName = (instance.colaboradores as any)?.nome_completo || 'Colaborador';
        const empresaId = (instance.colaboradores as any)?.empresa_id || instance.empresa_id;

        // Mark as overdue
        await supabase.from('test_assignment_instances').update({
          status: 'vencido',
          notificado_vencido: true,
        }).eq('id', instance.id);

        // Find gestor and consultant for this company
        const { data: gestores } = await supabase
          .from('user_roles')
          .select('user_id')
          .in('role', ['empresa_gestor', 'empresa_admin']);

        const { data: consultores } = await supabase
          .from('consultor_empresas')
          .select('user_id')
          .eq('empresa_id', empresaId)
          .eq('ativo', true);

        // Also notify admin_master
        const { data: admins } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'admin_master');

        const targetUsers = new Set<string>();
        gestores?.forEach(g => targetUsers.add(g.user_id));
        consultores?.forEach(c => targetUsers.add(c.user_id));
        admins?.forEach(a => targetUsers.add(a.user_id));

        const tipoLabel = instance.tipo_teste === 'disc' ? 'DISC' :
          instance.tipo_teste === 'psicossocial' ? 'Risco Psicossocial' :
          instance.tipo_teste.toUpperCase();

        for (const userId of targetUsers) {
          await supabase.from('notifications').insert({
            user_id: userId,
            type: 'teste_vencido',
            title: `Teste ${tipoLabel} vencido`,
            description: `${colabName} não realizou o teste ${tipoLabel} dentro do prazo.`,
            priority: 'warning',
            company_id: empresaId,
            entity_type: 'test_assignment_instance',
            entity_id: instance.id,
          });
          notificationsSent++;
        }
      }
    }

    return new Response(JSON.stringify({
      instancesCreated,
      notificationsSent,
      overdueCount: overdueInstances?.length || 0,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});