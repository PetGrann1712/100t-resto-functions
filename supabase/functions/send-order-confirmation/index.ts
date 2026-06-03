import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;

serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { order, items, customerEmail, customerName } = await req.json();

    const itemsHtml = items.map((item: any) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #f0f0f0">${item.quantity}× ${item.name}</td>
        <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:600">
          $${(Number(item.price) * item.quantity).toFixed(2)}
        </td>
      </tr>
    `).join('');

    const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:20px;background:#f8f9fa">

  <div style="background:white;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">

    <!-- Header -->
    <div style="background:#55B82E;padding:24px;text-align:center">
      <img src="https://hknkbvardspbgmgmrxoy.supabase.co/storage/v1/object/public/logo%20100t/d6ad799c-1305-4afe-a90a-f2c187f53cfc%20(1).png"
           alt="100T Resto Bio" style="width:80px;height:80px;object-fit:contain">
      <h1 style="color:white;margin:12px 0 4px;font-size:22px">Commande confirmée !</h1>
      <p style="color:rgba(255,255,255,0.85);margin:0;font-size:14px">Merci pour votre commande 🌿</p>
    </div>

    <!-- Body -->
    <div style="padding:24px">
      <p style="font-size:15px;color:#1a1a1a">Bonjour <strong>${customerName || 'cher client'}</strong>,</p>
      <p style="font-size:14px;color:#6b7280;margin-bottom:20px">
        Votre commande <strong>#${order.id}</strong> a bien été reçue et est en cours de traitement.
      </p>

      <!-- Statut -->
      <div style="background:#e8f5e1;border-radius:10px;padding:14px;margin-bottom:20px;text-align:center">
        <span style="font-size:24px">⏳</span>
        <p style="margin:6px 0 0;font-weight:700;color:#3d8a20;font-size:15px">En attente de confirmation</p>
        <p style="margin:4px 0 0;font-size:12px;color:#6b7280">Notre équipe vous contactera pour confirmer</p>
      </div>

      <!-- Articles -->
      <h3 style="font-size:14px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px">
        Votre commande
      </h3>
      <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
        ${itemsHtml}
      </table>

      <!-- Totaux -->
      <div style="background:#f8f9fa;border-radius:10px;padding:14px;margin-bottom:20px">
        <div style="display:flex;justify-content:space-between;margin-bottom:6px">
          <span style="font-size:13px;color:#6b7280">Sous-total</span>
          <span style="font-size:13px">$${Number(order.subtotal || 0).toFixed(2)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:10px">
          <span style="font-size:13px;color:#6b7280">Livraison</span>
          <span style="font-size:13px;color:#55B82E">
            ${Number(order.delivery_fee) === 0 ? 'Gratuite' : '$' + Number(order.delivery_fee).toFixed(2)}
          </span>
        </div>
        <div style="display:flex;justify-content:space-between;border-top:1px solid #e0e0e0;padding-top:10px">
          <span style="font-weight:700;font-size:15px">Total</span>
          <span style="font-weight:800;font-size:17px;color:#55B82E">$${Number(order.total || 0).toFixed(2)}</span>
        </div>
      </div>

      <!-- Livraison -->
      <div style="border:1px solid #e0e0e0;border-radius:10px;padding:14px;margin-bottom:20px">
        <p style="margin:0 0 6px;font-weight:700;font-size:14px">📍 Livraison</p>
        <p style="margin:0;font-size:13px;color:#6b7280">${order.delivery_address || '—'}</p>
        ${order.phone ? `<p style="margin:4px 0 0;font-size:13px;color:#6b7280">📞 ${order.phone}</p>` : ''}
      </div>

      <!-- Pied -->
      <p style="font-size:13px;color:#6b7280;line-height:1.6;margin-bottom:0">
        Notre équipe vous contactera pour confirmer l'heure de livraison.<br>
        Pour toute question : <a href="mailto:contact@100trestobio.com" style="color:#55B82E">contact@100trestobio.com</a>
      </p>
    </div>

    <!-- Footer -->
    <div style="background:#f8f9fa;padding:16px;text-align:center;border-top:1px solid #e0e0e0">
      <p style="margin:0;font-size:12px;color:#9ca3af">
        100T Resto Bio — 1, rue Rosalvo Bobo, Delmas 45, Port-au-Prince<br>
        📞 +509 3752 5722 | contact@100trestobio.com
      </p>
    </div>
  </div>

</body>
</html>`;

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "100T Resto Bio <onboarding@resend.dev>",
        to: [customerEmail],
        subject: `Commande #${order.id} confirmée — 100T Resto Bio`,
        html: emailHtml,
      }),
    });

    const result = await emailResponse.json();

    if (!emailResponse.ok) {
      throw new Error(JSON.stringify(result));
    }

    return new Response(JSON.stringify({ success: true, id: result.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
