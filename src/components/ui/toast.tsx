"use client";

import { AnimatePresence, motion } from "motion/react";
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

interface Toast {
  id: number;
  message: string;
  tone: "ok" | "erro" | "info";
  actions: ToastAction[];
}

type Show = (message: string, opts?: { tone?: Toast["tone"]; actions?: ToastAction[]; ms?: number }) => void;

const Ctx = createContext<Show>(() => {});

/** Aviso curto na parte de baixo da tela (com botões opcionais: "Desfazer", "Mudar horário"). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seq = useRef(0);

  const show = useCallback<Show>((message, opts = {}) => {
    if (timer.current) clearTimeout(timer.current);
    const id = ++seq.current;
    setToast({ id, message, tone: opts.tone ?? "ok", actions: opts.actions ?? [] });
    timer.current = setTimeout(() => setToast((t) => (t?.id === id ? null : t)), opts.ms ?? (opts.actions?.length ? 6000 : 3200));
  }, []);

  return (
    <Ctx.Provider value={show}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-28 z-[60] flex justify-center px-4">
        <AnimatePresence>
          {toast && (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12 }}
              className={`pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold shadow-float ${
                toast.tone === "erro" ? "bg-danger text-white" : "bg-fg text-white"
              }`}
              role="status"
            >
              <span className="flex-1">{toast.message}</span>
              {toast.actions.map((a) => (
                <button
                  key={a.label}
                  type="button"
                  className="shrink-0 rounded-full bg-white/15 px-3 py-1.5 font-bold"
                  onClick={() => {
                    setToast(null);
                    a.onClick();
                  }}
                >
                  {a.label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  return useContext(Ctx);
}
