import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Usuário não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin_master")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Sem permissão" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { faturamento_id, empresa_id, valor, descricao, email_pagador, data_vencimento } = body;

    if (!empresa_id || !valor || !descricao) {
      return new Response(
        JSON.stringify({ error: "empresa_id, valor e descricao são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const MP_TOKEN = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
    if (!MP_TOKEN) {
      return new Response(
        JSON.stringify({ error: "Token do Mercado Pago não configurado" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Mercado Pago preference (payment link)
    const projectRef = Deno.env.get("SUPABASE_URL")?.replace("https://", "").replace(".supabase.co", "") || "";
    const webhookUrl = `https://${projectRef}.supabase.co/functions/v1/mercadopago-webhook`;

    const preference = {
      items: [
        {
          title: descricao,
          quantity: 1,
          unit_price: Number(valor),
          currency_id: "BRL",
        },
      ],
      payer: email_pagador ? { email: email_pagador } : undefined,
      external_reference: faturamento_id || `emp_${empresa_id}_${Date.now()}`,
      notification_url: webhookUrl,
      date_of_expiration: data_vencimento
        ? new Date(data_vencimento + "T23:59:59-03:00").toISOString()
        : undefined,
      back_urls: {
        success: "https://sisergon.lovable.app/faturamento?status=success",
        failure: "https://sisergon.lovable.app/faturamento?status=failure",
        pending: "https://sisergon.lovable.app/faturamento?status=pending",
      },
      auto_return: "approved",
      payment_methods: {
        installments: 1,
      },
    };

    const mpResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${MP_TOKEN}`,
      },
      body: JSON.stringify(preference),
    });

    const mpData = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error("MP Error:", JSON.stringify(mpData));
      return new Response(
        JSON.stringify({ error: "Erro ao criar cobrança no Mercado Pago", details: mpData }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update or create faturamento record with MP data
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (faturamento_id) {
      await serviceClient
        .from("faturamento")
        .update({
          mp_preference_id: mpData.id,
          mp_payment_link: mpData.init_point,
          mp_status: "pending",
        })
        .eq("id", faturamento_id);
    } else {
      // Create new faturamento record
      const numFatura = `FAT-${Date.now().toString(36).toUpperCase()}`;
      const { data: newFat, error: insertErr } = await serviceClient
        .from("faturamento")
        .insert({
          empresa_id,
          valor: Number(valor),
          descricao,
          data_vencimento: data_vencimento || null,
          status: "pendente",
          tipo: "mensalidade",
          mp_preference_id: mpData.id,
          mp_payment_link: mpData.init_point,
          mp_status: "pending",
          numero_fatura: numFatura,
          created_by: user.id,
        })
        .select()
        .single();

      if (insertErr) {
        console.error("Insert error:", insertErr);
        return new Response(
          JSON.stringify({ error: "Erro ao salvar fatura", details: insertErr }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          fatura: newFat,
          payment_link: mpData.init_point,
          sandbox_link: mpData.sandbox_init_point,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        preference_id: mpData.id,
        payment_link: mpData.init_point,
        sandbox_link: mpData.sandbox_init_point,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: "Erro interno", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
