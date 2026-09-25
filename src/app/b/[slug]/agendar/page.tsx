import type { Metadata } from "next";
import { BookingWizard } from "@/components/booking-wizard";
import { supabasePublishableKey, supabaseUrl } from "@/lib/supabase/config";

type PublicCatalog = {
  shop: { name: string; booking_message?: string | null; timezone?: string | null };
  services: Array<{ id: string; name: string; description: string | null; duration_minutes: number; price_cents: number }>;
  barbers: Array<{ id: string; display_name: string; color: string; avatar_url?: string | null; service_ids?: string[] }>;
};

async function getInitialCatalog(slug: string): Promise<PublicCatalog | null> {
  if (!supabaseUrl || !supabasePublishableKey) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1500);
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/public-booking?slug=${encodeURIComponent(slug)}`, {
      headers: { apikey: supabasePublishableKey },
      next: { revalidate: 30, tags: [`public-catalog:${slug}`] },
      signal: controller.signal,
    });
    if (!response.ok) return null;
    return await response.json() as PublicCatalog;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function nameFromSlug(slug: string) {
  return slug.split("-").filter(Boolean).map((part) => part[0]?.toUpperCase() + part.slice(1)).join(" ");
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const shopName = nameFromSlug(slug);
  return { title: `${shopName} — Agende seu horário`, description: `Escolha serviço, profissional e horário na agenda online de ${shopName}.` };
}

export default async function PublicBookingPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ service?: string }> }) {
  const { slug } = await params;
  const { service } = await searchParams;
  const initialCatalog = await getInitialCatalog(slug);
  return <BookingWizard slug={slug} initialServiceId={service} initialCatalog={initialCatalog} />;
}
