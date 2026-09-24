import { createClient } from "npm:@supabase/supabase-js@2.116.0";
import { appointmentEmail, EmailDeliveryError, sendEmail } from "../_shared/email.ts";
import { corsHeaders, json, serviceClientConfig } from "../_shared/http.ts";

async function hashIp(value: string) {
  const salt = Deno.env.get("IP_HASH_SALT") ?? "";
  if (!value || !salt) return null;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${salt}:${value}`));
  return `\\x${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(request) });
  if (!["GET", "POST"].includes(request.method)) return json(request, { error: "method_not_allowed" }, 405);
  try {
    const { url, serviceKey } = serviceClientConfig();
    const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

    if (request.method === "GET") {
      const slug = new URL(request.url).searchParams.get("slug") ?? "";
      const { data: shop, error: shopError } = await supabase.from("barbershops").select("id,name,slug,timezone,phone,address,website_url,instagram_url,google_reviews_url,google_review_count,logo_url,primary_color,accent_color,booking_message").eq("slug", slug).eq("active", true).eq("public_booking_enabled", true).single();
      if (shopError || !shop) return json(request, { error: "barbershop_not_found" }, 404);
      const [{ data: services, error: servicesError }, { data: barbers, error: barbersError }, { data: barberServices, error: barberServicesError }, { data: products, error: productsError }] = await Promise.all([
        supabase.from("services").select("id,name,description,duration_minutes,price_cents").eq("barbershop_id", shop.id).eq("active", true).order("name"),
        supabase.from("barbers").select("id,display_name,bio,color,avatar_url").eq("barbershop_id", shop.id).eq("active", true).order("display_name"),
        supabase.from("barber_services").select("barber_id,service_id").eq("barbershop_id", shop.id),
        supabase.from("products").select("id,name,description,price_cents,active").eq("barbershop_id", shop.id).eq("active", true).order("name"),
      ]);
      if (servicesError || barbersError || barberServicesError || productsError) throw servicesError ?? barbersError ?? barberServicesError ?? productsError;
      const serviceIdsByBarber = new Map<string, string[]>();
      for (const link of barberServices ?? []) {
        serviceIdsByBarber.set(link.barber_id, [...(serviceIdsByBarber.get(link.barber_id) ?? []), link.service_id]);
      }
      return json(request, {
        shop,
        services: services ?? [],
        barbers: (barbers ?? []).map((barber) => ({ ...barber, service_ids: serviceIdsByBarber.get(barber.id) ?? [] })),
        products: products ?? [],
      });
    }

    const body = await request.json();
    const slug = String(body.slug ?? "");
    const { data: shop } = await supabase.from("barbershops").select("id,name").eq("slug", slug).eq("active", true).eq("public_booking_enabled", true).single();
    if (!shop) return json(request, { error: "barbershop_not_found" }, 404);

    const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
    const ipHash = await hashIp(forwarded);
    if (ipHash) {
      const since = new Date(Date.now() - 10 * 60_000).toISOString();
      const { count } = await supabase.from("public_booking_attempts").select("id", { count: "exact", head: true }).eq("barbershop_id", shop.id).eq("ip_hash", ipHash).gte("created_at", since);
      if ((count ?? 0) >= 12) {
        await supabase.from("public_booking_attempts").insert({ barbershop_id: shop.id, ip_hash: ipHash, outcome: "rate_limited" });
        return json(request, { error: "rate_limited" }, 429);
      }
    }

    if (body.action === "availability") {
      const serviceIds = Array.isArray(body.serviceIds)
        ? body.serviceIds.map((value: unknown) => String(value)).filter(Boolean).slice(0, 8)
        : body.serviceId ? [String(body.serviceId)] : [];
      const requestedBarberId = String(body.barberId ?? "");
      const requestedDate = String(body.date ?? "");
      if (!serviceIds.length || !requestedBarberId || !/^\d{4}-\d{2}-\d{2}$/.test(requestedDate)) {
        return json(request, { error: "invalid_payload" }, 400);
      }

      const { data: links, error: linksError } = await supabase
        .from("barber_services")
        .select("barber_id,service_id")
        .eq("barbershop_id", shop.id)
        .in("service_id", serviceIds);
      if (linksError) throw linksError;
      const servicesByBarber = new Map<string, Set<string>>();
      for (const link of links ?? []) {
        const assigned = servicesByBarber.get(link.barber_id) ?? new Set<string>();
        assigned.add(link.service_id);
        servicesByBarber.set(link.barber_id, assigned);
      }
      const eligibleIds = [...servicesByBarber.entries()]
        .filter(([, assigned]) => serviceIds.every((serviceId) => assigned.has(serviceId)))
        .map(([barberId]) => barberId);
      if (!eligibleIds.length) return json(request, { slots: [] });
      if (!eligibleIds.length || (requestedBarberId !== "any" && !eligibleIds.includes(requestedBarberId))) {
        return json(request, { slots: [] });
      }

      let barberQuery = supabase
        .from("barbers")
        .select("id,display_name")
        .eq("barbershop_id", shop.id)
        .eq("active", true)
        .in("id", eligibleIds)
        .order("display_name");
      if (requestedBarberId !== "any") barberQuery = barberQuery.eq("id", requestedBarberId);
      const { data: candidates, error: candidatesError } = await barberQuery;
      if (candidatesError) throw candidatesError;

      const availability = await Promise.all((candidates ?? []).map(async (barber) => {
        const { data, error } = await supabase.rpc("get_public_availability", {
          target_slug: slug,
          selected_service_ids: serviceIds,
          selected_barber_id: barber.id,
          requested_date: requestedDate,
        });
        if (error) throw error;
        return (data ?? []).map((row: { starts_at: string }) => ({
          startsAt: row.starts_at,
          barberId: barber.id,
          barberName: barber.display_name,
        }));
      }));

      return json(request, {
        slots: availability.flat().sort((left, right) => left.startsAt.localeCompare(right.startsAt) || left.barberName.localeCompare(right.barberName)),
      });
    }

    const serviceIds = Array.isArray(body.serviceIds)
      ? body.serviceIds.map((value: unknown) => String(value)).filter(Boolean).slice(0, 8)
      : body.serviceId ? [String(body.serviceId)] : [];
    if (body.action !== "book" || !serviceIds.length || !body.barberId || !body.startsAt || !body.client?.name || !body.client?.email || !body.requestId) {
      return json(request, { error: "invalid_payload" }, 400);
    }

    const { data, error } = await supabase.rpc("create_public_booking", {
      target_slug: slug,
      selected_service_ids: serviceIds,
      selected_barber_id: body.barberId,
      requested_start: body.startsAt,
      client_name: String(body.client.name).slice(0, 120),
      client_email: String(body.client.email).slice(0, 254),
      client_phone: String(body.client.phone ?? "").slice(0, 40),
      request_id: String(body.requestId),
    });
    if (error) {
      await supabase.from("public_booking_attempts").insert({ barbershop_id: shop.id, ip_hash: ipHash, outcome: "rejected" });
      if (["23P01", "23505"].includes(error.code)) return json(request, { error: "slot_no_longer_available" }, 409);
      throw error;
    }

    const result = data?.[0];
    await supabase.from("public_booking_attempts").insert({ barbershop_id: shop.id, ip_hash: ipHash, outcome: "accepted" });
    let emailSent = false;
    let emailStatus: "sent" | "not_configured" | "failed" = "failed";
    if (result?.response_token) {
      const { data: appointment } = await supabase.from("appointments").select("starts_at,clients(name,email),appointment_services(service_name)").eq("id", result.appointment_id).single();
      const client = Array.isArray(appointment?.clients) ? appointment?.clients[0] : appointment?.clients;
      const service = Array.isArray(appointment?.appointment_services) ? appointment?.appointment_services[0] : appointment?.appointment_services;
      if (client?.email) {
        try {
          await sendEmail({ to: client.email, subject: `Agendamento recebido — ${shop.name}`, html: appointmentEmail({ shopName: shop.name, clientName: client.name, serviceName: service?.service_name ?? "atendimento", startsAt: new Date(appointment.starts_at).toLocaleString("pt-BR", { dateStyle: "full", timeStyle: "short", timeZone: "America/Sao_Paulo" }), token: result.response_token }) });
          emailSent = true;
          emailStatus = "sent";
        } catch (error) {
          emailStatus = error instanceof EmailDeliveryError && error.code === "not_configured" ? "not_configured" : "failed";
          console.error("booking_confirmation_email_failed", { appointmentId: result.appointment_id, status: emailStatus, error: error instanceof Error ? error.message : "unknown_error" });
          // The booking remains valid. The response tells the client to keep the confirmation screen when delivery fails.
        }
      }
    }
    return json(request, { appointmentId: result?.appointment_id, emailSent, emailStatus }, 201);
  } catch (error) {
    return json(request, { error: error instanceof Error ? error.message : "unexpected_error" }, 500);
  }
});
