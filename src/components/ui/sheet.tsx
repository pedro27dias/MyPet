"use client";

import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";

/** Janela que sobe de baixo (no computador, fica centralizada). */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <motion.div
            className="absolute inset-0 bg-forest/35 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            // sobe junto com o teclado (--teclado vem do KeyboardHelper)
            style={{ marginBottom: "var(--teclado, 0px)", maxHeight: "calc(90dvh - var(--teclado, 0px))" }}
            className="pb-safe relative w-full max-w-md overflow-y-auto overscroll-contain rounded-t-[28px] bg-card px-5 pt-3 shadow-float sm:rounded-[28px] sm:pb-5"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 340 }}
          >
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line sm:hidden" />
            {title && (
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="titulo text-2xl">{title}</h2>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Fechar"
                  className="grid size-9 place-items-center rounded-full bg-bg text-muted"
                >
                  <X size={18} />
                </button>
              </div>
            )}
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
