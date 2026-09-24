"use client";

import { useEffect, useState } from "react";
import { useAppData } from "@/components/app-data-provider";
import { hasSupabaseEnv, supabasePublishableKey, supabaseUrl } from "@/lib/supabase/config";
import type { Barber, Product, Service } from "@/lib/types";

export type PublicShop = {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  phone?: string | null;
  address?: string | null;
  websiteUrl?: string | null;
  instagramUrl?: string | null;
  googleReviewsUrl?: string | null;
  googleReviewCount?: number | null;
  logoUrl?: string | null;
  primaryColor?: string | null;
  accentColor?: string | null;
  bookingMessage?: string | null;
};

export function usePublicShop(slug?: string) {
  const initialData = useAppData();
  const isConfigured = Boolean(slug);
  const [shop, setShop] = useState<PublicShop | null>(null);
  const [services, setServices] = useState<Service[]>(hasSupabaseEnv ? [] : initialData.services);
  const [barbers, setBarbers] = useState<Barber[]>(hasSupabaseEnv || isConfigured ? [] : initialData.barbers);
  const [products, setProducts] = useState<Product[]>(hasSupabaseEnv || isConfigured ? [] : initialData.products);
  const [loading, setLoading] = useState(Boolean(hasSupabaseEnv && isConfigured));

  useEffect(() => {
    if (!slug) return;
    if (!hasSupabaseEnv || !supabaseUrl || !supabasePublishableKey) {
      return;
    }
    Promise.all([
      fetch(`${supabaseUrl}/functions/v1/public-booking?slug=${encodeURIComponent(slug)}`, { headers: { apikey: supabasePublishableKey } })
        .then((response) => { if (!response.ok) throw new Error("catalog_unavailable"); return response.json(); }),
      fetch(`${supabaseUrl}/rest/v1/rpc/get_public_shop_profile`, {
        method: "POST",
        headers: { apikey: supabasePublishableKey, "Content-Type": "application/json" },
        body: JSON.stringify({ target_slug: slug }),
      }).then((response) => response.ok ? response.json() : []),
    ])
      .then(([payload, profiles]) => {
        const profile = profiles[0] ?? payload.shop;
        setShop({
          id: profile.id,
          name: profile.name,
          slug: profile.slug,
          timezone: profile.timezone ?? "America/Sao_Paulo",
          phone: profile.phone ?? null,
          address: profile.address ?? null,
          websiteUrl: profile.website_url ?? null,
          instagramUrl: profile.instagram_url ?? null,
          googleReviewsUrl: profile.google_reviews_url ?? null,
          googleReviewCount: profile.google_review_count ?? null,
          logoUrl: profile.logo_url ?? null,
          primaryColor: profile.primary_color ?? null,
          accentColor: profile.accent_color ?? null,
          bookingMessage: profile.booking_message ?? null,
        });
        setServices(payload.services.map((item: { id: string; name: string; description: string | null; duration_minutes: number; price_cents: number }) => ({ id: item.id, name: item.name, description: item.description ?? "", durationMinutes: item.duration_minutes, priceCents: item.price_cents, active: true })));
        setBarbers(payload.barbers.map((item: { id: string; display_name: string; color: string; avatar_url?: string | null }) => ({ id: item.id, name: item.display_name, avatarUrl: item.avatar_url ?? undefined, role: "Barbeiro", color: item.color, todayCount: 0, workingHours: "", active: true })));
        setProducts((payload.products ?? []).map((item: { id: string; name: string; description: string | null; price_cents: number; active: boolean }) => ({ id: item.id, name: item.name, description: item.description ?? "", priceCents: item.price_cents, active: item.active })));
      })
      .catch(() => {
        setShop(null);
        setServices([]);
        setBarbers([]);
        setProducts([]);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  return { shop, services, barbers, products, loading };
}
