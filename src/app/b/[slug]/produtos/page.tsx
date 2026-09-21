import { CustomerProducts } from "@/components/customer-products";
import { TenantServicesHeader } from "@/components/tenant-services-header";

export default async function TenantProductsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <TenantServicesHeader slug={slug}><CustomerProducts slug={slug} /></TenantServicesHeader>;
}
