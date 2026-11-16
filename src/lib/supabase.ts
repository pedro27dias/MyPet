import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/*
 * Conexão com o Supabase. O app roda no navegador: o login fica guardado no celular e o banco
 * só entrega os cachorros de quem é tutor (RLS, ver supabase/migrations).
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function isSupabaseConfigured() {
  return Boolean(url && anonKey && !url.includes("SEU-PROJETO") && !anonKey.startsWith("cole-aqui"));
}

let client: SupabaseClient | null = null;

export function supabase() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase não configurado: preencha o arquivo .env.local e reinicie o app.");
  }
  client ??= createClient(url!, anonKey!, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "pkce" },
  });
  return client;
}

/** Erros do banco em português simples. */
export function friendlyError(e: unknown): string {
  const msg = e instanceof Error ? e.message : typeof e === "object" && e && "message" in e ? String((e as { message: unknown }).message) : String(e);
  if (/Failed to fetch|NetworkError|network/i.test(msg)) return "Sem internet. Tente de novo.";
  if (/Invalid login credentials/i.test(msg)) return "E-mail ou senha incorretos.";
  if (/Email not confirmed/i.test(msg)) return "Confirme seu e-mail pelo link que enviamos.";
  if (/User already registered/i.test(msg)) return "Este e-mail já tem conta. Use \"Entrar\".";
  if (/Password should be at least/i.test(msg)) return "A senha precisa ter pelo menos 6 caracteres.";
  if (/rate limit/i.test(msg)) return "Muitas tentativas. Espere um pouco e tente de novo.";
  if (/row-level security|permission denied/i.test(msg)) return "Você não tem permissão para isso.";
  return msg || "Algo deu errado. Tente de novo.";
}
