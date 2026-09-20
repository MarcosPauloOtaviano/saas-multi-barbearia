import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasSupabaseEnv, supabasePublishableKey, supabaseUrl } from "@/lib/supabase/config";

export async function updateSession(request: NextRequest) {
  if (!hasSupabaseEnv || !supabaseUrl || !supabasePublishableKey) return NextResponse.next({ request });
  let response = NextResponse.next({ request });
  const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;
  const path = request.nextUrl.pathname;
  const loginMatch = path.match(/^\/admin\/([^/]+)\/entrar\/?$/);
  const adminMatch = path.match(/^\/admin\/([^/]+)(?:\/|$)/);
  const isProtectedAdmin = Boolean(adminMatch && !loginMatch);
  if (!user && isProtectedAdmin) {
    const url = request.nextUrl.clone();
    url.pathname = `/admin/${adminMatch?.[1]}/entrar`;
    url.search = "";
    return NextResponse.redirect(url);
  }
  return response;
}
