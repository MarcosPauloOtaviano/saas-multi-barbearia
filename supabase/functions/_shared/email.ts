export async function sendEmail(input: { to: string; subject: string; html: string }) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("EMAIL_FROM");
  if (!apiKey || !from) throw new Error("Email provider is not configured");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [input.to], subject: input.subject, html: input.html }),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(`Email provider rejected the request (${response.status})`);
  return payload as { id?: string };
}

export function appointmentEmail(input: { shopName: string; clientName: string; serviceName: string; startsAt: string; token: string }) {
  const appUrl = Deno.env.get("APP_URL") ?? "";
  const confirmUrl = `${appUrl}/agendamento/resposta?token=${encodeURIComponent(input.token)}&action=confirm`;
  const cancelUrl = `${appUrl}/agendamento/resposta?token=${encodeURIComponent(input.token)}&action=cancel`;
  return `<!doctype html><html lang="pt-BR"><body style="font-family:Arial,sans-serif;background:#f4f5f1;color:#17201f;padding:24px"><div style="max-width:560px;margin:auto;background:#fff;border-radius:20px;padding:28px"><p style="color:#9d4d2e;font-weight:700">${input.shopName}</p><h1 style="font-size:25px">Olá, ${input.clientName}</h1><p>Seu atendimento de <strong>${input.serviceName}</strong> está marcado para ${input.startsAt}.</p><p style="margin:28px 0"><a href="${confirmUrl}" style="background:#183c36;color:#fff;padding:13px 18px;border-radius:10px;text-decoration:none;font-weight:700">Confirmar presença</a></p><p><a href="${cancelUrl}" style="color:#9d4d2e">Não poderei comparecer</a></p><hr style="border:0;border-top:1px solid #e4e7e1;margin:28px 0"><small>Este link é pessoal e expira após o horário do atendimento.</small></div></body></html>`;
}
