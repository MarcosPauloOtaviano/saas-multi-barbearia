"use client";

import { CustomerHome } from "@/components/customer-home";
import { CustomerShell } from "@/components/customer-shell";
import { usePublicShop } from "@/lib/use-public-shop";

export function TenantPublicHome({ slug }: { slug: string }) {
  const { shop, services, barbers, loading } = usePublicShop(slug);
  const name = shop?.name ?? (loading ? "Carregando estabelecimento" : "Estabelecimento não encontrado");
  return <CustomerShell tenant={{ slug, name }}><CustomerHome slug={slug} shop={shop} shopName={shop?.name} services={services} barbers={barbers} /></CustomerShell>;
}
