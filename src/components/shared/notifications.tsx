"use client";

import { AnimatePresence, motion } from "motion/react";
import { Bell, BellOff, Share, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { currentPushState, subscribePush, unsubscribePush, type PushState } from "@/lib/push";
import { useApp } from "../app-provider";
import { Button } from "../ui/button";
import { useToast } from "../ui/toast";

/** Estado das notificações deste celular + ligar/desligar. */
export function usePush() {
  const { repo } = useApp();
  const toast = useToast();
  const [state, setState] = useState<PushState>("carregando");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    currentPushState().then((s) => alive && setState(s));
    return () => {
      alive = false;
    };
  }, []);

  const enable = useCallback(async () => {
    setBusy(true);
    try {
      if (repo.mode === "demo") throw new Error("Notificações só funcionam com conta (fora do modo demonstração).");
      const { endpoint, keys } = await subscribePush();
      await repo.savePushSubscription(endpoint, keys);
      setState("ligado");
      toast("Notificações ligadas ✓");
    } catch (e) {
      toast((e as Error).message, { tone: "erro", ms: 6000 });
      setState(await currentPushState());
    } finally {
      setBusy(false);
    }
  }, [repo, toast]);

  const disable = useCallback(async () => {
    setBusy(true);
    try {
      const endpoint = await unsubscribePush();
      if (endpoint) await repo.deletePushSubscription(endpoint).catch(() => {});
      setState("desligado");
      toast("Notificações desligadas neste celular.");
    } finally {
      setBusy(false);
    }
  }, [repo, toast]);

  return { state, busy, enable, disable };
}

const HIDE_KEY = "mypet-aviso-notificacoes";

/** Cartão no Início convidando a ligar as notificações (some quando liga ou quando fecha). */
export function NotificationsCard() {
  const { state, busy, enable } = usePush();
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    let v = false;
    try {
      v = localStorage.getItem(HIDE_KEY) === "1";
    } catch {
      /* ignora */
    }
    const t = setTimeout(() => setHidden(v), 0);
    return () => clearTimeout(t);
  }, []);

  const hide = () => {
    setHidden(true);
    try {
      localStorage.setItem(HIDE_KEY, "1");
    } catch {
      /* ignora */
    }
  };

  const show = !hidden && (state === "desligado" || state === "ios-instalar");
  return (
    <AnimatePresence>
      {show && (
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, height: 0, marginTop: 0 }}
          className="relative overflow-hidden rounded-3xl bg-pink-soft p-4"
        >
          <button type="button" onClick={hide} aria-label="Fechar aviso" className="absolute right-2 top-2 grid size-9 place-items-center rounded-full text-forest/60">
            <X size={18} />
          </button>
          <div className="flex items-start gap-3 pr-8">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-pink text-forest">
              <Bell size={22} />
            </span>
            <div>
              <p className="font-bold text-forest">Receba os lembretes no celular</p>
              {state === "ios-instalar" ? (
                <p className="mt-1 text-sm text-ink">
                  No iPhone, primeiro instale o app: toque em <Share size={14} className="inline -translate-y-0.5" /> <b>Compartilhar</b> →{" "}
                  <b>Adicionar à Tela de Início</b>. Depois abra por lá e ative aqui.
                </p>
              ) : (
                <p className="mt-1 text-sm text-ink">Avisamos na hora de cada cuidado e quando outro tutor marcar algo como feito.</p>
              )}
            </div>
          </div>
          {state === "desligado" && (
            <Button size="sm" className="mt-3 w-full" onClick={enable} disabled={busy}>
              <Bell size={16} /> {busy ? "Ativando..." : "Ativar notificações"}
            </Button>
          )}
        </motion.section>
      )}
    </AnimatePresence>
  );
}

/** Linha de configuração (aba Pet → Perfil). */
export function NotificationsSetting() {
  const { state, busy, enable, disable } = usePush();
  const text: Record<PushState, string> = {
    carregando: "Verificando...",
    "sem-suporte": "Este navegador não aceita notificações.",
    "ios-instalar": "No iPhone: instale o app (Compartilhar → Adicionar à Tela de Início) e abra por lá.",
    bloqueado: "Bloqueadas. Libere nas configurações do navegador para este site.",
    desligado: "Desligadas neste celular.",
    ligado: "Ligadas neste celular: lembretes na hora e quando outro tutor conclui.",
  };
  return (
    <section className="rounded-3xl bg-card p-4 shadow-card">
      <div className="flex items-center gap-3">
        <span className={`grid size-11 shrink-0 place-items-center rounded-2xl ${state === "ligado" ? "bg-pink text-forest" : "bg-olive-soft text-olive"}`}>
          {state === "ligado" ? <Bell size={22} /> : <BellOff size={22} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-forest">Notificações</p>
          <p className="text-sm text-muted">{text[state]}</p>
        </div>
      </div>
      {(state === "desligado" || state === "ligado") && (
        <Button
          size="sm"
          variant={state === "ligado" ? "ghost" : "primary"}
          className="mt-3 w-full"
          disabled={busy}
          onClick={state === "ligado" ? disable : enable}
        >
          {busy ? "Aguarde..." : state === "ligado" ? "Desligar neste celular" : "Ativar notificações"}
        </Button>
      )}
    </section>
  );
}
