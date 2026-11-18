"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react";
import { useState } from "react";
import { addDays, addMonths, monthLabel, sameDay, startOfDay, startOfWeek, toDateStr, weekdayShort } from "@/lib/dates";
import { occurrencesBetween, type Occurrence } from "@/lib/schedule";
import type { Care, CareRecord, CareType } from "@/lib/types";

/*
 * Calendário do Início. Fechado: a semana (seg–dom) com bolinhas. "▾ Ver mês" (ou arrastar para
 * baixo) abre o mês inteiro: bolinhas coloridas por tipo, check nos dias resolvidos, coral nos
 * atrasados. Tocar num dia mostra a lista dele embaixo.
 */

/** Cor da bolinha por tipo (vermífugo e antipulgas juntos; consulta e exame juntos). */
const DOT: Record<CareType, string> = {
  remedio: "bg-t-remedio",
  vacina: "bg-t-vacina",
  vermifugo: "bg-t-vermifugo",
  antipulgas: "bg-t-vermifugo",
  coleira: "bg-pink-strong",
  banho: "bg-t-banho",
  consulta: "bg-t-consulta",
  exame: "bg-t-consulta",
  outro: "bg-t-outro",
};

const LETTERS = ["S", "T", "Q", "Q", "S", "S", "D"];

interface DayInfo {
  occ: Occurrence[];
  dots: string[];
  more: boolean;
  late: boolean;
  allDone: boolean;
}

function bucket(cares: Care[], records: CareRecord[], from: Date, to: Date, now: Date) {
  const map = new Map<string, Occurrence[]>();
  for (const o of occurrencesBetween(cares, records, from, to, now)) {
    const when = o.record?.doneAt ? new Date(o.record.doneAt) : o.due;
    const k = toDateStr(when);
    const list = map.get(k);
    if (list) list.push(o);
    else map.set(k, [o]);
  }
  return (d: Date): DayInfo => {
    const occ = map.get(toDateStr(d)) ?? [];
    const colors = [...new Set(occ.map((o) => DOT[o.care.type]))];
    const pending = occ.filter((o) => o.state === "pendente" || o.state === "atrasada").length;
    return { occ, dots: colors.slice(0, 3), more: colors.length > 3, late: occ.some((o) => o.state === "atrasada"), allDone: occ.length > 0 && pending === 0 };
  };
}

export function WeekStrip({
  cares,
  records,
  selected,
  onSelect,
  onMonthChange,
}: {
  cares: Care[];
  records: CareRecord[];
  selected: Date;
  onSelect: (d: Date) => void;
  /** Primeiro dia que aparece no mês aberto (para carregar registros mais antigos). */
  onMonthChange?: (gridStart: Date) => void;
}) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => new Date(selected.getFullYear(), selected.getMonth(), 1));
  const [dir, setDir] = useState(1);
  const today = new Date();

  const gridStart = startOfWeek(month);
  const weekStart = startOfWeek(selected);
  const fromMs = (open ? gridStart : weekStart).getTime();
  const days = open ? 42 : 7;
  const info = bucket(cares, records, new Date(fromMs), addDays(new Date(fromMs), days), new Date());

  function goMonth(n: number) {
    const m = addMonths(month, n);
    setDir(n);
    setMonth(m);
    onMonthChange?.(startOfWeek(m));
  }

  function toggle(v = !open) {
    if (v) {
      const m = new Date(selected.getFullYear(), selected.getMonth(), 1);
      setMonth(m);
      onMonthChange?.(startOfWeek(m));
    }
    setOpen(v);
  }

  function goToday() {
    const m = new Date(today.getFullYear(), today.getMonth(), 1);
    setDir(m < month ? -1 : 1);
    setMonth(m);
    onSelect(today);
    onMonthChange?.(startOfWeek(m));
  }

  return (
    <motion.div layout transition={{ type: "spring", damping: 32, stiffness: 300 }} className="overflow-hidden rounded-3xl bg-card p-2 shadow-card">
      <AnimatePresence mode="popLayout" initial={false}>
        {open ? (
          <motion.div key="mes" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
            <div className="flex items-center gap-1 px-1 pb-2 pt-1">
              <button type="button" aria-label="Mês anterior" onClick={() => goMonth(-1)} className="grid size-9 place-items-center rounded-full text-forest active:bg-bg">
                <ChevronLeft size={20} />
              </button>
              <span className="titulo flex-1 text-center text-xl">{monthLabel(month)}</span>
              <button type="button" aria-label="Próximo mês" onClick={() => goMonth(1)} className="grid size-9 place-items-center rounded-full text-forest active:bg-bg">
                <ChevronRight size={20} />
              </button>
              <button type="button" onClick={goToday} className="ml-1 h-8 rounded-full bg-olive-soft px-3 text-xs font-bold text-forest active:scale-95">
                Hoje
              </button>
            </div>
            <div className="grid grid-cols-7 text-center text-[11px] font-bold text-muted">
              {LETTERS.map((l, i) => (
                <span key={i}>{l}</span>
              ))}
            </div>
            <AnimatePresence mode="popLayout" initial={false} custom={dir}>
              <motion.div
                key={toDateStr(month)}
                custom={dir}
                variants={{ enter: (d: number) => ({ x: d * 50, opacity: 0 }), center: { x: 0, opacity: 1 }, exit: (d: number) => ({ x: d * -50, opacity: 0 }) }}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.22 }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.2}
                onDragEnd={(_, i) => (i.offset.x < -50 ? goMonth(1) : i.offset.x > 50 ? goMonth(-1) : null)}
                className="mt-1 grid grid-cols-7 gap-y-1"
              >
                {Array.from({ length: 42 }, (_, i) => addDays(gridStart, i)).map((d) => (
                  <MonthDay
                    key={d.toISOString()}
                    d={d}
                    info={info(d)}
                    inMonth={d.getMonth() === month.getMonth()}
                    isToday={sameDay(d, today)}
                    isSel={sameDay(d, selected)}
                    past={d < startOfDay(today)}
                    onClick={() => onSelect(d)}
                  />
                ))}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        ) : (
          <motion.div key="semana" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} className="grid grid-cols-7 gap-1">
            {Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)).map((d) => {
              const { occ, late, allDone } = info(d);
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
                  {isSel && <motion.span layoutId="week-sel" className="absolute inset-0 rounded-2xl bg-forest" transition={{ type: "spring", damping: 30, stiffness: 400 }} />}
                  <span className={`relative text-xs font-bold ${isSel ? "text-pink/80" : isToday ? "text-primary" : "text-muted"}`}>{weekdayShort(d)}</span>
                  <span className={`relative text-lg font-extrabold ${isSel ? "text-pink" : "text-fg"}`}>{d.getDate()}</span>
                  <span className="relative flex h-2 items-center gap-0.5">
                    {occ.length > 0 && <span className={`size-2 rounded-full ${late ? "bg-danger" : allDone ? "bg-pink" : isSel ? "bg-pink-soft" : "bg-olive"}`} />}
                  </span>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Alça: tocar ou arrastar para abrir/fechar o mês */}
      <motion.button
        type="button"
        onClick={() => toggle()}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.3}
        onDragEnd={(_, i) => (i.offset.y > 25 ? toggle(true) : i.offset.y < -25 ? toggle(false) : null)}
        aria-expanded={open}
        className="mx-auto mt-1 flex h-7 touch-none items-center gap-1 rounded-full px-3 text-xs font-bold text-olive"
      >
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        {open ? "Ver semana" : "Ver mês"}
      </motion.button>
    </motion.div>
  );
}

function MonthDay({
  d,
  info,
  inMonth,
  isToday,
  isSel,
  past,
  onClick,
}: {
  d: Date;
  info: DayInfo;
  inMonth: boolean;
  isToday: boolean;
  isSel: boolean;
  past: boolean;
  onClick: () => void;
}) {
  const circle = isSel ? "bg-pink text-forest" : isToday ? "bg-forest text-pink" : "text-fg";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isSel}
      aria-label={`${d.getDate()}: ${info.occ.length} tarefas`}
      className={`flex flex-col items-center gap-0.5 py-0.5 ${inMonth ? "" : "opacity-35"}`}
    >
      <span className={`grid size-9 place-items-center rounded-full text-[15px] font-bold transition-colors ${circle} ${isSel && isToday ? "ring-2 ring-forest" : ""}`}>
        {d.getDate()}
      </span>
      <span className="flex h-2.5 items-center gap-[3px]">
        {info.occ.length === 0 ? null : past && info.allDone ? (
          <Check size={11} strokeWidth={3.5} className="text-olive" aria-label="feito" />
        ) : info.late ? (
          <span className="size-1.5 rounded-full bg-danger" />
        ) : (
          <>
            {info.dots.map((c) => (
              <span key={c} className={`size-1.5 rounded-full ${c}`} />
            ))}
            {info.more && <span className="text-[9px] font-extrabold leading-none text-muted">+</span>}
          </>
        )}
      </span>
    </button>
  );
}
