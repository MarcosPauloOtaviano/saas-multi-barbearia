import { createClient } from "npm:@supabase/supabase-js@2.116.0";
import { corsHeaders, json, serviceClientConfig } from "../_shared/http.ts";

type InviteRole = "manager" | "barber" | "receptionist";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(request) });
  if (request.method !== "POST") return json(request, { error: "method_not_allowed" }, 405);

  try {
    const { url, serviceKey } = serviceClientConfig();
    const authorization = request.headers.get("Authorization") ?? "";
    const token = authorization.replace(/^Bearer\s+/i, "");
    if (!token) return json(request, { error: "authentication_required" }, 401);

    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
    const { data: authData, error: authError } = await admin.auth.getUser(token);
    if (authError || !authData.user) return json(request, { error: "invalid_session" }, 401);

    const body = await request.json();
    const barbershopId = String(body.barbershopId ?? "");
    const fullName = String(body.fullName ?? "").trim().slice(0, 100);
    const email = String(body.email ?? "").trim().toLowerCase().slice(0, 254);
    const role = String(body.role ?? "") as InviteRole;
    const color = /^#[0-9a-f]{6}$/i.test(String(body.color ?? "")) ? String(body.color) : "#356f68";
    const existingBarberId = body.barberId ? String(body.barberId) : null;

    if (!barbershopId || fullName.length < 2 || !email.includes("@") || !["manager", "barber", "receptionist"].includes(role)) {
      return json(request, { error: "invalid_payload" }, 400);
    }

    const { data: caller } = await admin
      .from("memberships")
      .select("role,status")
      .eq("barbershop_id", barbershopId)
      .eq("user_id", authData.user.id)
      .eq("status", "active")
      .maybeSingle();

    const canInvite = caller?.role === "owner" || (caller?.role === "manager" && ["barber", "receptionist"].includes(role));
    if (!canInvite) return json(request, { error: "not_authorized" }, 403);

    if (existingBarberId) {
      const { data: existing } = await admin.from("barbers").select("id").eq("id", existingBarberId).eq("barbershop_id", barbershopId).is("membership_id", null).maybeSingle();
      if (role !== "barber" || !existing) return json(request, { error: "professional_unavailable" }, 409);
    }
    const { data: shop } = await admin.from("barbershops").select("slug").eq("id", barbershopId).single();
    if (!shop) return json(request, { error: "shop_unavailable" }, 404);

    const siteUrl = Deno.env.get("SITE_URL") ?? "http://localhost:3000";
    const redirectTo = `${siteUrl.replace(/\/$/, "")}/auth/callback?type=invite&next=/admin/${shop.slug}`;
    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName },
      redirectTo,
    });

    if (inviteError || !invited.user) {
      return json(request, { error: inviteError?.message ?? "invite_failed" }, 409);
    }

    try {
      const { error: profileError } = await admin.from("profiles").upsert({ id: invited.user.id, full_name: fullName, email });
      if (profileError) throw profileError;

      const { data: membership, error: membershipError } = await admin
        .from("memberships")
        .insert({ barbershop_id: barbershopId, user_id: invited.user.id, role, status: "invited" })
        .select("id")
        .single();
      if (membershipError) throw membershipError;

      let barberId: string | null = null;
      if (role === "barber") {
        const query = existingBarberId
          ? admin.from("barbers").update({ membership_id: membership.id }).eq("id", existingBarberId).eq("barbershop_id", barbershopId).is("membership_id", null)
          : admin.from("barbers").insert({ barbershop_id: barbershopId, membership_id: membership.id, display_name: fullName, color });
        const { data: barber, error: barberError } = await query.select("id").single();
        if (barberError) throw barberError;
        barberId = barber.id;

        // O vínculo dos serviços é criado pela trigger atômica do banco.
      }

      return json(request, {
        member: { id: membership.id, userId: invited.user.id, name: fullName, email, role, status: "invited", barberId, color },
      }, 201);
    } catch (databaseError) {
      await admin.auth.admin.deleteUser(invited.user.id);
      throw databaseError;
    }
  } catch (error) {
    return json(request, { error: error instanceof Error ? error.message : "unexpected_error" }, 500);
  }
});
