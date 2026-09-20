import { LoginForm } from "@/components/login-form";
import { hasSupabaseEnv } from "@/lib/supabase/config";

export default function LoginPage() { return <LoginForm demoMode={!hasSupabaseEnv} />; }
