"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check, Ellipsis } from "lucide-react";
import { daysBetween, fmtDate, fmtTimeShort } from "@/lib/dates";
import type { Occurrence } from "@/lib/schedule";
import { CareIcon } from "../care/care-meta";
import { useApp } from "../app-provider";

/** Uma tarefa: ícone, nome, hora e o botão grande "Feito ✓". */
export function TaskRow({
  occ,
  busy,
  onDone,
  onMenu,
  showDate,
}: {
  occ: Occurrence;
  busy: boolean;
  onDone: () => void;
  onMenu: () => void;
  showDate?: boolean;
}) {
  const { nameOf } = useApp();
  const done = occ.state === "feito";
  const skipped = occ.state === "pulado";
  const late = occ.state === "atrasada";
  const resolved = done || skipped;
  const c = occ.care;

  let when = fmtTimeShort(occ.due);
  if (showDate || late) {
    const d = daysBetween(occ.due, new Date());
    if (d >= 1) when = d === 1 ? `ontem, ${when}` : `${fmtDate(occ.due)} (há ${d} dias)`;
    else if (d < 0) when = `${fmtDate(occ.due)}, ${when}`;
  }

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className={`flex items-center gap-3 rounded-3xl p-3 pr-2 transition-colors ${
        late ? "bg-danger-soft" : resolved ? "bg-card/60" : "bg-card shadow-card"
      }`}
    >
      <span className={resolved ? "opacity-50" : ""}>
        <CareIcon type={c.type} size={50} />
      </span>
      <button type="button" onClick={onMenu} className="min-w-0 flex-1 text-left">
        <span className={`block truncate text-[1.05rem] font-extrabold leading-tight ${resolved ? "text-muted line-through decoration-2" : ""}`}>
          {c.title}
        </span>
        {resolved ? (
          <span className="block truncate text-sm font-semibold text-muted">
            {done
              ? `Feito por ${nameOf(occ.record?.by ?? null)} às ${fmtTimeShort(occ.record?.doneAt ?? occ.key)}`
              : `Pulado${occ.record?.reason ? `: ${occ.record.reason}` : ""}`}
          </span>
        ) : (
          <span className={`block truncate text-sm font-semibold ${late ? "text-danger" : "text-muted"}`}>
            {late ? "Atrasado · " : ""}
            {when}
            {occ.snoozed ? " (adiado)" : ""}
            {c.detail ? ` · ${c.detail}` : ""}
          </span>
        )}
      </button>

      {resolved ? (
        <button type="button" onClick={onMenu} aria-label="Opções" className="grid size-12 place-items-center">
          <span className={`grid size-10 place-items-center rounded-full ${done ? "bg-pink text-forest" : "bg-line text-muted"}`}>
            {done ? <Check size={22} strokeWidth={3} /> : <span className="text-xs font-bold">—</span>}
          </span>
        </button>
      ) : (
        <div className="flex items-center">
          <button type="button" onClick={onMenu} aria-label="Mais opções" className="grid size-10 place-items-center rounded-full text-muted">
            <Ellipsis size={20} />
          </button>
          <button
            type="button"
            onClick={onDone}
            disabled={busy}
            className="relative flex h-12 items-center gap-1.5 overflow-hidden rounded-full bg-primary px-4 font-extrabold text-on-primary shadow-[0_4px_12px_rgb(43_67_33/0.28)] transition active:scale-90 disabled:opacity-80"
          >
            <AnimatePresence mode="wait" initial={false}>
              {busy ? (
                <motion.span key="b" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="grid size-6 place-items-center">
                  <motion.span
                    className="block size-5 rounded-full border-[3px] border-white/40 border-t-white"
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 0.7, ease: "linear" }}
                  />
                </motion.span>
              ) : (
                <motion.span key="f" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1.5">
                  Feito <Check size={20} strokeWidth={3} />
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      )}
    </motion.li>
  );
}
