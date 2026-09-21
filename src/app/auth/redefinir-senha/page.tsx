import { ResetPasswordForm } from "@/components/reset-password-form";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const requestedNext = params.next ?? "/admin";
  const next = requestedNext.startsWith("/") && !requestedNext.startsWith("//") ? requestedNext : "/admin";
  return <ResetPasswordForm nextPath={next} />;
}
