export class EmailDeliveryError extends Error {
  constructor(public readonly code: "not_configured" | "provider_rejected" | "network_error", message: string) {
    super(message);
    this.name = "EmailDeliveryError";
  }
}

export async function sendEmail(input: { to: string; subject: string; html: string }) {
  const apiKey = Deno.env.get("RESEND_API_KEY")?.trim();
  const from = Deno.env.get("EMAIL_FROM")?.trim();
  if (!apiKey || !from) {
    throw new EmailDeliveryError("not_configured", "Email provider is not configured");
  }

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

export function appointmentEmail(input: { shopName: string; clientName: string; serviceName: string; startsAt: string; token: string }) {
  const appUrl = Deno.env.get("APP_URL") ?? "";
  const confirmUrl = `${appUrl}/agendamento/resposta?token=${encodeURIComponent(input.token)}&action=confirm`;
  const cancelUrl = `${appUrl}/agendamento/resposta?token=${encodeURIComponent(input.token)}&action=cancel`;
  return `<!doctype html><html lang="pt-BR"><body style="font-family:Arial,sans-serif;background:#f4f5f1;color:#17201f;padding:24px"><div style="max-width:560px;margin:auto;background:#fff;border-radius:20px;padding:28px"><p style="color:#9d4d2e;font-weight:700">${input.shopName}</p><h1 style="font-size:25px">Olá, ${input.clientName}</h1><p>Seu atendimento de <strong>${input.serviceName}</strong> está marcado para ${input.startsAt}.</p><p style="margin:28px 0"><a href="${confirmUrl}" style="background:#183c36;color:#fff;padding:13px 18px;border-radius:10px;text-decoration:none;font-weight:700">Confirmar presença</a></p><p><a href="${cancelUrl}" style="color:#9d4d2e">Não poderei comparecer</a></p><hr style="border:0;border-top:1px solid #e4e7e1;margin:28px 0"><small>Este link é pessoal e expira após o horário do atendimento.</small></div></body></html>`;
}
