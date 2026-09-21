import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { TenantPublicHome } from "@/components/tenant-public-home";

function nameFromSlug(slug: string) {
  return slug.split("-").filter(Boolean).map((part) => part[0]?.toUpperCase() + part.slice(1)).join(" ") || "Estabelecimento";
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const shopName = nameFromSlug(slug);
  return {
    title: `${shopName} — Agende seu horário`,
    description: `Escolha serviço, profissional e horário na agenda online de ${shopName}.`,
  };
}

export default async function PublicTenantPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ service?: string }> }) {
  const { slug } = await params;
  const { service } = await searchParams;
  if (service) redirect(`/b/${slug}/agendar?service=${encodeURIComponent(service)}`);
  return <TenantPublicHome slug={slug} />;
}
