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
    fetch(`${supabaseUrl}/functions/v1/public-booking?slug=${encodeURIComponent(slug)}`, { headers: { apikey: supabasePublishableKey } })
      .then((response) => { if (!response.ok) throw new Error("catalog_unavailable"); return response.json(); })
      .then((payload) => {
        setShop({
          id: payload.shop.id,
          name: payload.shop.name,
          slug: payload.shop.slug,
          timezone: payload.shop.timezone ?? "America/Sao_Paulo",
          phone: payload.shop.phone ?? null,
          address: payload.shop.address ?? null,
          websiteUrl: payload.shop.website_url ?? null,
          instagramUrl: payload.shop.instagram_url ?? null,
          googleReviewsUrl: payload.shop.google_reviews_url ?? null,
          googleReviewCount: payload.shop.google_review_count ?? null,
          logoUrl: payload.shop.logo_url ?? null,
          primaryColor: payload.shop.primary_color ?? null,
          accentColor: payload.shop.accent_color ?? null,
          bookingMessage: payload.shop.booking_message ?? null,
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
