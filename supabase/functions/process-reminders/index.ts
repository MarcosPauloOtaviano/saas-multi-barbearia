import { createClient } from "npm:@supabase/supabase-js@2.116.0";
import { appointmentEmail, sendEmail } from "../_shared/email.ts";
import { json, serviceClientConfig } from "../_shared/http.ts";

function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return json(request, { error: "method_not_allowed" }, 405);
  try {
    const cronSecret = Deno.env.get("CRON_SECRET");
    if (!cronSecret || request.headers.get("x-cron-secret") !== cronSecret) return json(request, { error: "unauthorized" }, 401);
    const { url, serviceKey } = serviceClientConfig();
    const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
    const { data: reminders, error: claimError } = await supabase.rpc("claim_due_reminders", { batch_size: 25 });
    if (claimError) throw claimError;

    let sent = 0;
    let failed = 0;
    for (const reminder of reminders ?? []) {
      try {
        const { data: appointment, error } = await supabase
          .from("appointments")
          .select("id, starts_at, ends_at, clients(name,email), barbershops(name), appointment_services(service_name)")
          .eq("id", reminder.appointment_id)
          .single();
        if (error) throw error;
        const client = Array.isArray(appointment.clients) ? appointment.clients[0] : appointment.clients;
        const shop = Array.isArray(appointment.barbershops) ? appointment.barbershops[0] : appointment.barbershops;
        const service = Array.isArray(appointment.appointment_services) ? appointment.appointment_services[0] : appointment.appointment_services;
        if (!client?.email) throw new Error("Client has no email address");

        const token = randomToken();
        const tokenHash = await sha256Hex(token);
        const { error: tokenError } = await supabase.from("booking_tokens").insert({
          barbershop_id: reminder.barbershop_id,
          appointment_id: reminder.appointment_id,
          token_hash: `\\x${tokenHash}`,
          expires_at: appointment.ends_at,
        });
        if (tokenError) throw tokenError;

        const result = await sendEmail({
          to: client.email,
          subject: `Lembrete de atendimento — ${shop?.name ?? "Barbearia"}`,
          html: appointmentEmail({ shopName: shop?.name ?? "Barbearia", clientName: client.name, serviceName: service?.service_name ?? "atendimento", startsAt: new Date(appointment.starts_at).toLocaleString("pt-BR", { dateStyle: "full", timeStyle: "short", timeZone: "America/Sao_Paulo" }), token }),
        });
        await supabase.from("appointment_reminders").update({ status: "sent", sent_at: new Date().toISOString(), last_error: null }).eq("id", reminder.id);
        await supabase.from("reminder_deliveries").insert({ barbershop_id: reminder.barbershop_id, reminder_id: reminder.id, provider: "resend", provider_message_id: result.id ?? null, success: true });
        sent += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown reminder failure";
        await supabase.from("appointment_reminders").update({ status: reminder.attempt_count >= 5 ? "failed" : "pending", last_error: message.slice(0, 500) }).eq("id", reminder.id);
        await supabase.from("reminder_deliveries").insert({ barbershop_id: reminder.barbershop_id, reminder_id: reminder.id, provider: "resend", success: false, error_message: message.slice(0, 500) });
        failed += 1;
      }
    }
    return json(request, { claimed: reminders?.length ?? 0, sent, failed });
  } catch (error) {
    return json(request, { error: error instanceof Error ? error.message : "unexpected_error" }, 500);
  }
});
