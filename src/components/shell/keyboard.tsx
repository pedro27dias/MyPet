"use client";

import { useEffect } from "react";

/*
 * Teclado do celular (vale para o app inteiro):
 * - nenhum campo abre o teclado sozinho (sem autofocus);
 * - ao tocar num campo, a tela rola para ele ficar acima do teclado;
 * - tocar fora de um campo, ou arrastar a tela para baixo, fecha o teclado.
 * A altura do teclado vira a variável CSS --teclado (as janelas de baixo sobem junto).
 */

const isField = (el: Element | null): el is HTMLElement =>
  !!el &&
  ((el instanceof HTMLInputElement && !["button", "submit", "checkbox", "radio", "file", "range", "color"].includes(el.type)) ||
    el instanceof HTMLTextAreaElement ||
    (el instanceof HTMLElement && el.isContentEditable));

function keyboardHeight() {
  const vv = window.visualViewport;
  if (!vv) return 0;
  return Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
}

export function KeyboardHelper() {
  useEffect(() => {
    const root = document.documentElement;
    const reveal = () => {
      const el = document.activeElement;
      if (isField(el)) el.scrollIntoView({ block: "center", behavior: "smooth" });
    };
    const onViewport = () => {
      root.style.setProperty("--teclado", `${keyboardHeight()}px`);
      reveal();
    };
    const onFocusIn = (e: FocusEvent) => {
      if (!isField(e.target as Element)) return;
      // espera o teclado terminar de subir
      setTimeout(reveal, 320);
    };
    const onPointerDown = (e: PointerEvent) => {
      const active = document.activeElement;
      if (!isField(active)) return;
      const t = e.target as Element;
      // tocou em outro campo (ou no rótulo dele): mantém o teclado
      if (isField(t) || t.closest("input, textarea, select, label, [contenteditable=true]")) return;
      active.blur();
    };
    let startY: number | null = null;
    const onTouchStart = (e: TouchEvent) => {
      startY = e.touches[0]?.clientY ?? null;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (startY === null) return;
      const active = document.activeElement;
      if (isField(active) && (e.touches[0]?.clientY ?? 0) - startY > 40) {
        active.blur();
        startY = null;
      }
    };

    window.visualViewport?.addEventListener("resize", onViewport);
    window.visualViewport?.addEventListener("scroll", onViewport);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: true });
    return () => {
      window.visualViewport?.removeEventListener("resize", onViewport);
      window.visualViewport?.removeEventListener("scroll", onViewport);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
    };
  }, []);
  return null;
}
