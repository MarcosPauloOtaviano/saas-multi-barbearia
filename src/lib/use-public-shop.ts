"use client";

import { useEffect, useState } from "react";
import { useAppData } from "@/components/app-data-provider";
import { hasSupabaseEnv, supabasePublishableKey, supabaseUrl } from "@/lib/supabase/config";
import type { Barber, Service } from "@/lib/types";

export function usePublicShop(slug = "stilo-sampa") {
  const initialData = useAppData();
  const [services, setServices] = useState<Service[]>(hasSupabaseEnv ? [] : initialData.services);
  const [barbers, setBarbers] = useState<Barber[]>(hasSupabaseEnv ? [] : initialData.barbers);
  const [loading, setLoading] = useState(hasSupabaseEnv);

  useEffect(() => {
    if (!hasSupabaseEnv || !supabaseUrl || !supabasePublishableKey) return;
    fetch(`${supabaseUrl}/functions/v1/public-booking?slug=${encodeURIComponent(slug)}`, { headers: { apikey: supabasePublishableKey } })
      .then((response) => { if (!response.ok) throw new Error("catalog_unavailable"); return response.json(); })
      .then((payload) => {
        setServices(payload.services.map((item: { id: string; name: string; description: string | null; duration_minutes: number; price_cents: number }) => ({ id: item.id, name: item.name, description: item.description ?? "", durationMinutes: item.duration_minutes, priceCents: item.price_cents, active: true })));
        setBarbers(payload.barbers.map((item: { id: string; display_name: string; color: string; avatar_url?: string | null }) => ({ id: item.id, name: item.display_name, avatarUrl: item.avatar_url ?? undefined, role: "Barbeiro", color: item.color, todayCount: 0, workingHours: "", active: true })));
      })
      .catch(() => {
        setServices([]);
        setBarbers([]);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  return { services, barbers, loading };
}
