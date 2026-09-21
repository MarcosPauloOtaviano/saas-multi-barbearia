import { CustomerServices } from "@/components/customer-services";
import { TenantServicesHeader } from "@/components/tenant-services-header";

export default async function TenantServicesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <TenantServicesHeader slug={slug}><CustomerServices slug={slug} /></TenantServicesHeader>;
}
