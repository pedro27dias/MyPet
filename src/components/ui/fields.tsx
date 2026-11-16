"use client";

import { Check, Minus, Plus, X } from "lucide-react";
import type { InputHTMLAttributes, ReactNode } from "react";

/** Campos grandes e fáceis de tocar, usados no cadastro e nos formulários. */

export function TextField({
  label,
  value,
  onChange,
  multiline,
  className = "",
  ...rest
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value">) {
  const cls =
    "w-full rounded-2xl border-2 border-line bg-card px-4 text-fg outline-none transition placeholder:text-faint focus:border-primary";
  return (
    <label className={`block ${className}`}>
      {label && <span className="mb-1 block px-1 text-sm font-bold text-muted">{label}</span>}
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={rest.placeholder}
          rows={3}
          className={`${cls} resize-none py-3`}
        />
      ) : (
        <input {...rest} value={value} onChange={(e) => onChange(e.target.value)} className={`${cls} h-13`} />
      )}
    </label>
  );
}

/** Opção grande (cartão) com ícone. */
export function Choice({
  selected,
  onClick,
  icon,
  title,
  hint,
  className = "",
}: {
  selected: boolean;
  onClick: () => void;
  icon?: ReactNode;
  title: string;
  hint?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`flex w-full items-center gap-4 rounded-3xl border-2 p-4 text-left transition active:scale-[0.98] ${
        selected ? "border-primary bg-primary-soft" : "border-line bg-card hover:border-faint"
      } ${className}`}
    >
      {icon && <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-bg text-2xl">{icon}</span>}
      <span className="min-w-0 flex-1">
        <span className="block text-lg font-bold">{title}</span>
        {hint && <span className="block text-sm text-muted">{hint}</span>}
      </span>
      <span
        className={`grid size-7 shrink-0 place-items-center rounded-full transition ${
          selected ? "bg-primary text-on-primary" : "border-2 border-line"
        }`}
      >
        {selected && <Check size={16} strokeWidth={3} />}
      </span>
    </button>
  );
}

/** Botões grandes lado a lado (Sim / Não / Não sei...). */
export function BigOptions<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (v: T) => void;
}) {
  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => {
        const sel = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={sel}
            onClick={() => onChange(o.value)}
            className={`h-16 rounded-3xl border-2 text-lg font-bold transition active:scale-[0.97] ${
              sel ? "border-primary bg-primary-soft text-primary-strong" : "border-line bg-card"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Sim / Não (null = ainda sem resposta). */
export function YesNo({ value, onChange }: { value: boolean | null; onChange: (v: boolean) => void }) {
  const opts = [
    { v: true, label: "Sim" },
    { v: false, label: "Não" },
  ];
  return (
    <div className="grid grid-cols-2 gap-3">
      {opts.map((o) => {
        const sel = value === o.v;
        return (
          <button
            key={o.label}
            type="button"
            aria-pressed={sel}
            onClick={() => onChange(o.v)}
            className={`h-16 rounded-3xl border-2 text-lg font-bold transition active:scale-[0.97] ${
              sel ? "border-primary bg-primary-soft text-primary-strong" : "border-line bg-card"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Stepper({
  value,
  onChange,
  min = 0,
  max = 99,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  label: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-3xl border-2 border-line bg-card p-3">
      <button
        type="button"
        aria-label={`Menos ${label}`}
        onClick={() => onChange(Math.max(min, value - 1))}
        className="grid size-12 place-items-center rounded-2xl bg-bg text-fg active:scale-95"
      >
        <Minus size={20} />
      </button>
      <span className="text-center">
        <span className="block text-3xl font-extrabold">{value}</span>
        <span className="text-sm text-muted">{label}</span>
      </span>
      <button
        type="button"
        aria-label={`Mais ${label}`}
        onClick={() => onChange(Math.min(max, value + 1))}
        className="grid size-12 place-items-center rounded-2xl bg-bg text-fg active:scale-95"
      >
        <Plus size={20} />
      </button>
    </div>
  );
}

/** Lista de horários ("08:00", "20:00") com adicionar/remover. */
export function TimeList({ times, onChange }: { times: string[]; onChange: (t: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {times.map((t, i) => (
        <span key={i} className="flex items-center gap-1 rounded-2xl border-2 border-line bg-card pl-3">
          <input
            type="time"
            value={t}
            onChange={(e) => onChange(times.map((x, j) => (j === i ? e.target.value : x)))}
            className="h-11 bg-transparent font-bold outline-none"
            aria-label={`Horário ${i + 1}`}
          />
          {times.length > 1 && (
            <button
              type="button"
              aria-label="Tirar horário"
              onClick={() => onChange(times.filter((_, j) => j !== i))}
              className="grid size-9 place-items-center text-muted"
            >
              <X size={16} />
            </button>
          )}
        </span>
      ))}
      {times.length < 6 && (
        <button
          type="button"
          onClick={() => onChange([...times, nextTime(times)])}
          className="flex h-12 items-center gap-1 rounded-2xl border-2 border-dashed border-line px-3 font-bold text-primary"
        >
          <Plus size={16} /> Horário
        </button>
      )}
    </div>
  );
}

function nextTime(times: string[]) {
  const last = times.at(-1) ?? "08:00";
  const h = (Number(last.slice(0, 2)) + 12) % 24;
  return `${String(h).padStart(2, "0")}:${last.slice(3, 5) || "00"}`;
}

/** Pílulas de escolha única (frequência, motivo...). */
export function Pills<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={`h-10 rounded-full px-4 text-sm font-bold transition active:scale-95 ${
            value === o.value ? "bg-forest text-pink" : "bg-card text-fg ring-2 ring-line"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
