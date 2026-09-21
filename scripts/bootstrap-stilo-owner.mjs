import { createClient } from "@supabase/supabase-js";

const required = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "STILO_ADMIN_EMAIL", "STILO_ADMIN_PASSWORD", "CONFIRM_PRODUCTION_RESET"];
const missing = required.filter((name) => !process.env[name]);
if (missing.length) {
  throw new Error(`Variáveis ausentes: ${missing.join(", ")}`);
}
if (process.env.STILO_ADMIN_PASSWORD.length < 8) {
  throw new Error("STILO_ADMIN_PASSWORD deve ter pelo menos 8 caracteres.");
}
if (process.env.CONFIRM_PRODUCTION_RESET !== "STILO_SAMPA") {
  throw new Error("Defina CONFIRM_PRODUCTION_RESET=STILO_SAMPA para confirmar a limpeza definitiva.");
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const email = process.env.STILO_ADMIN_EMAIL.trim().toLowerCase();
let user = null;
const existingUsers = [];

for (let page = 1; page <= 10; page += 1) {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
  if (error) throw error;
  existingUsers.push(...data.users);
  user ??= data.users.find((candidate) => candidate.email?.toLowerCase() === email) ?? null;
  if (data.users.length < 1000) break;
}

if (!user) {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: process.env.STILO_ADMIN_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: "Mantena" },
  });
  if (error) throw error;
  user = data.user;
} else {
  const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
    password: process.env.STILO_ADMIN_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: "Mantena" },
  });
  if (error) throw error;
  user = data.user;
}

const { error: attachError } = await supabase.rpc("attach_initial_stilo_owner", {
  target_user_id: user.id,
});
if (attachError) throw attachError;

for (const candidate of existingUsers) {
  if (candidate.email?.toLowerCase() === email) continue;
  const { error } = await supabase.auth.admin.deleteUser(candidate.id);
  if (error) throw error;
}

async function listMediaFiles(prefix = "") {
  const { data, error } = await supabase.storage.from("barber-media").list(prefix, { limit: 1000 });
  if (error && !error.message.toLowerCase().includes("not found")) throw error;
  const paths = [];
  for (const item of data ?? []) {
    const path = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.id) paths.push(path);
    else paths.push(...await listMediaFiles(path));
  }
  return paths;
}

const mediaFiles = await listMediaFiles();
for (let index = 0; index < mediaFiles.length; index += 100) {
  const { error } = await supabase.storage.from("barber-media").remove(mediaFiles.slice(index, index + 100));
  if (error) throw error;
}

process.stdout.write(`Base limpa; Mantena vinculado à Stilo Sampa: ${email}\n`);
