export class EmailDeliveryError extends Error {
  constructor(public readonly code: "not_configured" | "provider_rejected" | "network_error", message: string) {
    super(message);
    this.name = "EmailDeliveryError";
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character] ?? character));
}

export function assertEmailConfigured() {
  const apiKey = Deno.env.get("RESEND_API_KEY")?.trim();
  const from = Deno.env.get("EMAIL_FROM")?.trim();
  const appUrl = Deno.env.get("APP_URL")?.trim().replace(/\/+$/, "");
  if (!apiKey || !from || !appUrl) {
    throw new EmailDeliveryError("not_configured", "Email provider is not configured");
  }
  return { apiKey, from, appUrl };
}

export async function sendEmail(input: { to: string; subject: string; html: string }) {
  const { apiKey, from } = assertEmailConfigured();

  let response: Response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [input.to], subject: input.subject, html: input.html }),
    });
  } catch {
    throw new EmailDeliveryError("network_error", "Email provider could not be reached");
  }

  const rawPayload = await response.text();
  let payload: { id?: string; message?: string; name?: string } = {};
  try {
    payload = rawPayload ? JSON.parse(rawPayload) as typeof payload : {};
  } catch {
    // Keep the provider response out of the client response when it is not JSON.
  }
  if (!response.ok) {
    const reason = [payload.name, payload.message].filter(Boolean).join(": ");
    throw new EmailDeliveryError("provider_rejected", `Email provider rejected the request (${response.status}${reason ? `: ${reason}` : ""})`);
  }
  return payload;
}

export function appointmentEmail(input: { shopName: string; clientName: string; serviceName: string; startsAt: string; token: string; kind?: "confirmation" | "reminder" }) {
  const appUrl = (Deno.env.get("APP_URL") ?? "").replace(/\/+$/, "");
  const confirmUrl = `${appUrl}/agendamento/resposta?token=${encodeURIComponent(input.token)}&action=confirm`;
  const cancelUrl = `${appUrl}/agendamento/resposta?token=${encodeURIComponent(input.token)}&action=cancel`;
  const isReminder = input.kind === "reminder";
  const safeShopName = escapeHtml(input.shopName);
  const safeClientName = escapeHtml(input.clientName);
  const safeServiceName = escapeHtml(input.serviceName);
  const safeStartsAt = escapeHtml(input.startsAt);
  const title = isReminder ? "Seu atendimento está próximo" : "Seu horário foi reservado";
  const intro = isReminder ? "Este é um lembrete do seu atendimento" : "Seu agendamento foi recebido pela barbearia";
  return `<!doctype html><html lang="pt-BR"><body style="font-family:Arial,sans-serif;background:#f4f5f1;color:#17201f;padding:24px"><div style="max-width:560px;margin:auto;background:#fff;border-radius:20px;padding:28px"><p style="color:#9d4d2e;font-weight:700">${safeShopName}</p><h1 style="font-size:25px">${title}</h1><p>Olá, ${safeClientName}.</p><p>${intro}: <strong>${safeServiceName}</strong>, em <strong>${safeStartsAt}</strong>.</p><p style="margin:28px 0"><a href="${confirmUrl}" style="background:#183c36;color:#fff;padding:13px 18px;border-radius:10px;text-decoration:none;font-weight:700">Confirmar presença</a></p><p><a href="${cancelUrl}" style="color:#9d4d2e">Preciso cancelar este horário</a></p><hr style="border:0;border-top:1px solid #e4e7e1;margin:28px 0"><small>Os botões são pessoais e expiram após o horário do atendimento. Se você não solicitou este horário, ignore esta mensagem.</small></div></body></html>`;
}
