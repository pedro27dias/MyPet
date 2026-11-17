/**
 * Notificações no celular (Web Push). Cada celular/navegador que ativa vira uma "inscrição"
 * guardada no banco; o servidor manda os lembretes para todas as inscrições dos tutores.
 * iPhone: só funciona com o app instalado na Tela de Início (iOS 16.4+).
 */

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

export type PushState = "carregando" | "sem-suporte" | "ios-instalar" | "bloqueado" | "desligado" | "ligado";

export function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function pushSupported() {
  return Boolean(PUBLIC_KEY) && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js");
  } catch {
    return null;
  }
}

async function registration() {
  return (await navigator.serviceWorker.getRegistration()) ?? (await registerServiceWorker());
}

export async function currentPushState(): Promise<PushState> {
  if (!pushSupported()) return isIos() && !isStandalone() ? "ios-instalar" : "sem-suporte";
  if (Notification.permission === "denied") return "bloqueado";
  const reg = await registration();
  const sub = await reg?.pushManager.getSubscription();
  return sub && Notification.permission === "granted" ? "ligado" : "desligado";
}

function keyBytes(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/** Pede permissão e cria a inscrição. Devolve endpoint + chaves para guardar no banco. */
export async function subscribePush(): Promise<{ endpoint: string; keys: Record<string, string> }> {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Permissão negada. Libere as notificações do site nas configurações do navegador.");
  const reg = await registration();
  if (!reg) throw new Error("Este navegador não aceita notificações.");
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(PUBLIC_KEY) }));
  const json = sub.toJSON();
  return { endpoint: sub.endpoint, keys: (json.keys ?? {}) as Record<string, string> };
}

/** Cancela a inscrição deste celular. Devolve o endpoint (para apagar no banco). */
export async function unsubscribePush(): Promise<string | null> {
  const reg = await registration();
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return null;
  await sub.unsubscribe();
  return sub.endpoint;
}
