import { notFound } from "next/navigation";
import { LoginForm } from "@/components/login-form";

function shopNameFromSlug(slug: string) {
  if (slug === "stilo-sampa") return "Stilo Sampa";
  return slug.split("-").filter(Boolean).map((part) => part[0]?.toUpperCase() + part.slice(1)).join(" ");
}

export default async function TenantLoginPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) notFound();
  return <LoginForm slug={slug} shopName={shopNameFromSlug(slug)} />;
}
