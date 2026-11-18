"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { addDays, addPeriod, fmtLongDate, parseDate, toDateStr, todayStr, type PeriodUnit } from "@/lib/dates";
import type { Freq } from "@/lib/types";

/*
 * Data de lembrete com duas formas: "Escolher data" (calendário) ou "Daqui a…" (número + unidade,
 * com atalhos). Sempre devolve a data real calculada (AAAA-MM-DD).
 * kind="por" serve para o fim de um remédio: "por 10 dias" = último dia é o 10º.
 */

const UNITS: { value: PeriodUnit; one: string; many: string }[] = [
  { value: "dias", one: "dia", many: "dias" },
  { value: "semanas", one: "semana", many: "semanas" },
  { value: "meses", one: "mês", many: "meses" },
  { value: "anos", one: "ano", many: "anos" },
];

const AHEAD_CHIPS: [number, PeriodUnit, string][] = [
  [7, "dias", "7 dias"],
  [15, "dias", "15 dias"],
  [1, "meses", "1 mês"],
  [3, "meses", "3 meses"],
  [6, "meses", "6 meses"],
  [1, "anos", "1 ano"],
];
const FOR_CHIPS: [number, PeriodUnit, string][] = [
  [5, "dias", "5 dias"],
  [7, "dias", "7 dias"],
  [10, "dias", "10 dias"],
  [14, "dias", "14 dias"],
  [1, "meses", "1 mês"],
  [3, "meses", "3 meses"],
];

const fieldCls = "h-13 w-full rounded-2xl border-2 border-line bg-card px-4 font-bold text-fg outline-none focus:border-primary";

export function DateInput({
  label,
  value,
  onChange,
  base,
  kind = "daqui",
  max,
  optional = false,
}: {
  label: string;
  /** AAAA-MM-DD ("" = vazio, só com optional) */
  value: string;
  onChange: (v: string) => void;
  /** A partir de quando conta o "daqui a" (padrão: hoje) */
  base?: string;
  kind?: "daqui" | "por";
  max?: string;
  optional?: boolean;
}) {
  const [mode, setMode] = useState<"data" | "rel">("data");
  const [n, setN] = useState(kind === "por" ? 7 : 15);
  const [unit, setUnit] = useState<PeriodUnit>("dias");
  const from = parseDate(base || todayStr());

  const calc = (num: number, u: PeriodUnit) => {
    const d = addPeriod(from, Math.max(0, num), u);
    return toDateStr(kind === "por" ? addDays(d, -1) : d);
  };
  const apply = (num: number, u: PeriodUnit) => {
    setN(num);
    setUnit(u);
    onChange(calc(num, u));
  };

  const chips = kind === "por" ? FOR_CHIPS : AHEAD_CHIPS;
  const relLabel = kind === "por" ? "Por…" : "Daqui a…";

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2 px-1">
        <span className="text-sm font-bold text-muted">{label}</span>
        <span className="flex rounded-full bg-bg p-0.5 text-xs font-bold" role="tablist">
          {(
            [
              ["data", "Escolher data"],
              ["rel", relLabel],
            ] as const
          ).map(([m, l]) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => {
                setMode(m);
                if (m === "rel") onChange(calc(n, unit));
              }}
              className="relative rounded-full px-2.5 py-1"
            >
              {mode === m && <motion.span layoutId={`modo-data-${label}`} className="absolute inset-0 rounded-full bg-forest" transition={{ type: "spring", stiffness: 450, damping: 34 }} />}
              <span className={`relative ${mode === m ? "text-pink" : "text-forest"}`}>{l}</span>
            </button>
          ))}
        </span>
      </div>

      {mode === "data" ? (
        <input type="date" value={value} max={max} onChange={(e) => (e.target.value || optional) && onChange(e.target.value)} className={fieldCls} />
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-[88px_1fr] gap-2">
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={999}
              value={n || ""}
              onChange={(e) => apply(Number(e.target.value.replace(/\D/g, "")) || 0, unit)}
              aria-label="Quantidade"
              className={`${fieldCls} text-center`}
            />
            <select value={unit} onChange={(e) => apply(n, e.target.value as PeriodUnit)} aria-label="Unidade" className={fieldCls}>
              {UNITS.map((u) => (
                <option key={u.value} value={u.value}>
                  {n === 1 ? u.one : u.many}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {chips.map(([num, u, l]) => {
              const sel = num === n && u === unit;
              return (
                <button
                  key={l}
                  type="button"
                  onClick={() => apply(num, u)}
                  className={`h-8 rounded-full px-3 text-xs font-bold transition active:scale-95 ${sel ? "bg-forest text-pink" : "bg-card text-fg ring-2 ring-line"}`}
                >
                  {l}
                </button>
              );
            })}
          </div>
        </div>
      )}
      <AnimatePresence initial={false}>
        {value && (
          <motion.p
            key={value}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-1.5 px-1 text-sm font-semibold text-olive"
          >
            → {fmtLongDate(value)}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// "Repetir a cada…": atalhos + personalizado (número + dias/semanas/meses/anos)
// ---------------------------------------------------------------------------------------------

export interface Repeat {
  freq: Freq;
  interval: number;
}

const REPEAT_PRESETS: { value: string; label: string }[] = [
  { value: "unica:1", label: "Não repete" },
  { value: "diaria:1", label: "Todo dia" },
  { value: "semanal:1", label: "Toda semana" },
  { value: "meses:1", label: "Todo mês" },
  { value: "meses:3", label: "A cada 3 meses" },
  { value: "meses:6", label: "A cada 6 meses" },
  { value: "anos:1", label: "Todo ano" },
];

const UNIT_TO_FREQ: Record<PeriodUnit, Freq> = { dias: "dias", semanas: "semanal", meses: "meses", anos: "anos" };
const FREQ_TO_UNIT: Partial<Record<Freq, PeriodUnit>> = { dias: "dias", semanal: "semanas", meses: "meses", anos: "anos", diaria: "dias" };

export function RepeatPicker({ value, onChange }: { value: Repeat; onChange: (r: Repeat) => void }) {
  const key = `${value.freq}:${value.interval}`;
  const preset = REPEAT_PRESETS.some((p) => p.value === key);
  const [custom, setCustom] = useState(!preset);
  const unit = FREQ_TO_UNIT[value.freq] ?? "meses";

  return (
    <div>
      <span className="mb-1 block px-1 text-sm font-bold text-muted">Repetir</span>
      <div className="flex flex-wrap gap-1.5">
        {REPEAT_PRESETS.map((p) => {
          const sel = !custom && p.value === key;
          return (
            <button
              key={p.value}
              type="button"
              onClick={() => {
                setCustom(false);
                const [f, i] = p.value.split(":");
                onChange({ freq: f as Freq, interval: Number(i) });
              }}
              className={`h-9 rounded-full px-3 text-sm font-bold transition active:scale-95 ${sel ? "bg-forest text-pink" : "bg-card text-fg ring-2 ring-line"}`}
            >
              {p.label}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => {
            setCustom(true);
            if (value.freq === "unica") onChange({ freq: "dias", interval: 10 });
          }}
          className={`h-9 rounded-full px-3 text-sm font-bold transition active:scale-95 ${custom ? "bg-forest text-pink" : "bg-card text-fg ring-2 ring-line"}`}
        >
          A cada…
        </button>
      </div>
      {custom && (
        <div className="mt-2 grid grid-cols-[auto_88px_1fr] items-center gap-2">
          <span className="pl-1 font-bold text-muted">A cada</span>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={365}
            value={value.interval || ""}
            onChange={(e) => onChange({ freq: value.freq === "unica" ? "dias" : value.freq, interval: Math.min(365, Number(e.target.value.replace(/\D/g, "")) || 1) })}
            aria-label="A cada quantos"
            className={`${fieldCls} text-center`}
          />
          <select value={unit} onChange={(e) => onChange({ freq: UNIT_TO_FREQ[e.target.value as PeriodUnit], interval: value.interval || 1 })} aria-label="Unidade" className={fieldCls}>
            {UNITS.map((u) => (
              <option key={u.value} value={u.value}>
                {value.interval === 1 ? u.one : u.many}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
