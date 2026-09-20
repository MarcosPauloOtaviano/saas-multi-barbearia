import { RegisterForm } from "@/components/register-form";
import { hasSupabaseEnv } from "@/lib/supabase/config";
export default function RegisterPage() { return <RegisterForm demoMode={!hasSupabaseEnv} />; }
