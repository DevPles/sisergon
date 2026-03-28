import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log("Webhook received:", JSON.stringify(body));

    // Mercado Pago sends different notification types
    const { type, data, action } = body;

    if (type !== "payment" && action !== "payment.updated" && action !== "payment.created") {
      return new Response(JSON.stringify({ ok: true, ignored: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const paymentId = data?.id;
    if (!paymentId) {
      return new Response(JSON.stringify({ ok: true, no_id: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const MP_TOKEN = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
    if (!MP_TOKEN) {
      console.error("MP token not configured");
      return new Response(JSON.stringify({ error: "Token not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch payment details from Mercado Pago
    const mpResponse = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: { Authorization: `Bearer ${MP_TOKEN}` },
      }
    );

    const payment = await mpResponse.json();
    console.log("Payment details:", JSON.stringify(payment));

    if (!mpResponse.ok) {
      console.error("Failed to fetch payment:", payment);
      return new Response(JSON.stringify({ error: "Failed to fetch payment" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const externalRef = payment.external_reference;
    const mpStatus = payment.status; // approved, pending, rejected, cancelled, in_process
    const paymentMethod = payment.payment_method_id || payment.payment_type_id;

    // Map MP status to our status
    let faturaStatus = "pendente";
    if (mpStatus === "approved") faturaStatus = "pago";
    else if (mpStatus === "rejected" || mpStatus === "cancelled") faturaStatus = "cancelado";
    else if (mpStatus === "in_process" || mpStatus === "pending") faturaStatus = "pendente";

    // Try to find the fatura by external_reference (which is the faturamento_id)
    // or by mp_preference_id
    let faturaFound = false;

    if (externalRef && !externalRef.startsWith("emp_")) {
      const { data: fatura, error } = await supabase
        .from("faturamento")
        .update({
          mp_payment_id: String(paymentId),
          mp_status: mpStatus,
          status: faturaStatus,
          metodo_pagamento: paymentMethod,
          data_pagamento: mpStatus === "approved" ? new Date().toISOString().split("T")[0] : null,
        })
        .eq("id", externalRef)
        .select()
        .maybeSingle();

      if (fatura) {
        faturaFound = true;

        // Update empresa financial status if paid
        if (mpStatus === "approved" && fatura.empresa_id) {
          // Recalculate valor_em_aberto
          const { data: pendentes } = await supabase
            .from("faturamento")
            .select("valor")
            .eq("empresa_id", fatura.empresa_id)
            .eq("status", "pendente");

          const totalAberto = (pendentes || []).reduce(
            (s: number, p: { valor: number }) => s + Number(p.valor),
            0
          );

          await supabase
            .from("empresas")
            .update({
              valor_em_aberto: totalAberto,
              status_financeiro: totalAberto > 0 ? "em_atraso" : "adimplente",
            })
            .eq("id", fatura.empresa_id);
        }
      }
    }

    // Also try matching by preference_id from the payment
    if (!faturaFound && payment.preference_id) {
      const { data: fatura } = await supabase
        .from("faturamento")
        .update({
          mp_payment_id: String(paymentId),
          mp_status: mpStatus,
          status: faturaStatus,
          metodo_pagamento: paymentMethod,
          data_pagamento: mpStatus === "approved" ? new Date().toISOString().split("T")[0] : null,
        })
        .eq("mp_preference_id", payment.preference_id)
        .select()
        .maybeSingle();

      if (fatura && mpStatus === "approved" && fatura.empresa_id) {
        const { data: pendentes } = await supabase
          .from("faturamento")
          .select("valor")
          .eq("empresa_id", fatura.empresa_id)
          .eq("status", "pendente");

        const totalAberto = (pendentes || []).reduce(
          (s: number, p: { valor: number }) => s + Number(p.valor),
          0
        );

        await supabase
          .from("empresas")
          .update({
            valor_em_aberto: totalAberto,
            status_financeiro: totalAberto > 0 ? "em_atraso" : "adimplente",
          })
          .eq("id", fatura.empresa_id);
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
