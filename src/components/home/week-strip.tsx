"use client";

import { motion } from "motion/react";
import { addDays, sameDay, startOfWeek, weekdayShort } from "@/lib/dates";
import { dayOccurrences } from "@/lib/schedule";
import type { Care, CareRecord } from "@/lib/types";

/** Semana (seg a dom) com bolinhas nos dias que têm tarefas. Tocar mostra as tarefas do dia. */
export function WeekStrip({
  cares,
  records,
  selected,
  onSelect,
}: {
  cares: Care[];
  records: CareRecord[];
  selected: Date;
  onSelect: (d: Date) => void;
}) {
  const today = new Date();
  const monday = startOfWeek(today);
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));

  return (
    <div className="grid grid-cols-7 gap-1 rounded-3xl bg-card p-2 shadow-card">
      {days.map((d) => {
        const occ = dayOccurrences(cares, records, d, today);
        const pending = occ.filter((o) => o.state === "pendente" || o.state === "atrasada").length;
        const allDone = occ.length > 0 && pending === 0;
        const late = occ.some((o) => o.state === "atrasada");
        const isSel = sameDay(d, selected);
        const isToday = sameDay(d, today);
        return (
          <button
            key={d.toISOString()}
            type="button"
            onClick={() => onSelect(d)}
            aria-pressed={isSel}
            aria-label={`${weekdayShort(d)} ${d.getDate()}: ${occ.length} tarefas`}
            className="relative flex flex-col items-center gap-1 rounded-2xl py-2"
          >
            {isSel && (
              <motion.span layoutId="week-sel" className="absolute inset-0 rounded-2xl bg-fg" transition={{ type: "spring", damping: 30, stiffness: 400 }} />
            )}
            <span className={`relative text-xs font-bold ${isSel ? "text-white/70" : isToday ? "text-primary" : "text-muted"}`}>{weekdayShort(d)}</span>
            <span className={`relative text-lg font-extrabold ${isSel ? "text-white" : ""}`}>{d.getDate()}</span>
            <span className="relative flex h-2 items-center gap-0.5">
              {occ.length > 0 && (
                <span
                  className={`size-2 rounded-full ${late ? "bg-danger" : allDone ? "bg-success" : isSel ? "bg-white" : "bg-peach"}`}
                />
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
