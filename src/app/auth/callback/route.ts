import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const type = url.searchParams.get("type");
  const requestedNext = url.searchParams.get("next");
  const next = requestedNext?.startsWith("/") && !requestedNext.startsWith("//") ? requestedNext : "/";
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (type === "recovery") {
        const resetUrl = new URL("/auth/redefinir-senha", url.origin);
        resetUrl.searchParams.set("next", next);
        return NextResponse.redirect(resetUrl);
      }
      await supabase.rpc("accept_team_invitation");
    }
  }
  return NextResponse.redirect(new URL(next, url.origin));
}
