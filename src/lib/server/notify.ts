import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import webpush from "web-push";

/*
 * Envio de notificações (só no servidor). Usa a chave secreta do Supabase para enxergar os
 * cuidados de todos os tutores inscritos — por isso este arquivo nunca vai para o navegador.
 */

export const SITE = process.env.SITE_URL || "https://my-pet-orcin.vercel.app";

let admin: SupabaseClient | null = null;

export function adminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY nas variáveis do servidor.");
  admin ??= createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return admin;
}

let vapidReady = false;
function setupVapid() {
  if (vapidReady) return;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) throw new Error("Faltam as chaves VAPID nas variáveis do servidor.");
  webpush.setVapidDetails(SITE, pub, priv);
  vapidReady = true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  /** Mesma etiqueta = substitui a notificação anterior em vez de empilhar. */
  tag?: string;
}

/** Manda para todos os celulares inscritos dessas pessoas. Apaga inscrições que venceram. */
export async function sendToUsers(userIds: string[], payload: PushPayload): Promise<number> {
  if (!userIds.length) return 0;
  setupVapid();
  const db = adminClient();
  const { data: subs, error } = await db.from("notificacoes_inscricoes").select("endpoint, chaves").in("user_id", userIds);
  if (error) throw new Error(error.message);
  let sent = 0;
  await Promise.all(
    (subs ?? []).map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint as string, keys: s.chaves as { p256dh: string; auth: string } }, JSON.stringify(payload), {
          TTL: 60 * 60,
          urgency: "high",
        });
        sent++;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        // 404/410 = o celular cancelou ou o navegador apagou a inscrição
        if (code === 404 || code === 410) await db.from("notificacoes_inscricoes").delete().eq("endpoint", s.endpoint);
      }
    }),
  );
  return sent;
}

/** "8h", "14h30" no horário de Brasília. */
export function hourText(d: Date): string {
  const parts = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "numeric", minute: "2-digit", hour12: false }).formatToParts(d);
  const h = parts.find((p) => p.type === "hour")?.value ?? "";
  const m = parts.find((p) => p.type === "minute")?.value ?? "00";
  return `${Number(h)}h${m === "00" ? "" : m}`;
}

/** O pedido veio da agenda (Supabase ou Vercel) com a senha certa? */
export function cronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret) && request.headers.get("authorization") === `Bearer ${secret}`;
}
