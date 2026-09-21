"use client";

import { CustomerShell } from "@/components/customer-shell";
import { usePublicShop } from "@/lib/use-public-shop";

export function TenantServicesHeader({ slug, children }: { slug: string; children: React.ReactNode }) {
  const { shop } = usePublicShop(slug);
  return <CustomerShell tenant={{ slug, name: shop?.name ?? "Estabelecimento" }}>{children}</CustomerShell>;
}
