"use client";

import { useState } from "react";
import type { PeriodUnit } from "@/lib/dates";
import type { Freq } from "@/lib/types";

/* "Repetir a cada…" dos lembretes. (As datas usam o CampoData, em campo-data.tsx.) */

const UNITS: { value: PeriodUnit; one: string; many: string }[] = [
  { value: "dias", one: "dia", many: "dias" },
  { value: "semanas", one: "semana", many: "semanas" },
  { value: "meses", one: "mês", many: "meses" },
  { value: "anos", one: "ano", many: "anos" },
];

const fieldCls = "h-13 w-full min-w-0 rounded-2xl border-2 border-line bg-card px-4 font-bold text-fg outline-none focus:border-primary";

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
        <div className="mt-2 grid grid-cols-[auto_88px_minmax(0,1fr)] items-center gap-2">
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
