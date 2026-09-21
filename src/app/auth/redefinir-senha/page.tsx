import { ResetPasswordForm } from "@/components/reset-password-form";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const requestedNext = params.next ?? "/admin/stilo-sampa/entrar";
  const next = requestedNext.startsWith("/") && !requestedNext.startsWith("//") ? requestedNext : "/admin/stilo-sampa/entrar";
  return <ResetPasswordForm nextPath={next} />;
}
