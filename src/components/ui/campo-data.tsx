"use client";

import { AnimatePresence, motion } from "motion/react";
import { CalendarDays, ChevronLeft, ChevronRight, Clock, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { addDays, addMonths, addPeriod, fmtLongDate, monthLabel, parseDate, sameDay, startOfWeek, toDateStr, todayStr, type PeriodUnit } from "@/lib/dates";

/*
 * Campo de data (e hora) do app inteiro — nunca o input nativo do celular (no iPhone ele ignora a
 * largura e a fonte). É uma pílula do mesmo tamanho dos outros campos; ao tocar, sobe um painel com
 * atalhos, calendário do mês, horário (se tiver) e "Confirmar". Sempre devolve a data real (AAAA-MM-DD).
 */

const MONTHS_SHORT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** "Hoje", "Ontem", "Amanhã", "18 nov" ou "18 nov 26" */
export function fmtShortDate(value: string): string {
  if (!value) return "";
  const d = parseDate(value);
  const today = new Date();
  if (sameDay(d, today)) return "Hoje";
  if (sameDay(d, addDays(today, -1))) return "Ontem";
  if (sameDay(d, addDays(today, 1))) return "Amanhã";
  const year = d.getFullYear() !== today.getFullYear() ? ` ${String(d.getFullYear()).slice(2)}` : "";
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}${year}`;
}

/** Botão com a mesma aparência dos campos de texto (52 px, borda, raio, fonte). */
const PILL =
  "flex h-13 w-full min-w-0 items-center gap-2 rounded-2xl border-2 border-line bg-card px-3.5 text-left text-base font-bold text-fg outline-none transition focus-visible:border-primary active:scale-[0.99]";

function Label({ children }: { children: ReactNode }) {
  return <span className="mb-1 block truncate px-1 text-sm font-bold text-muted">{children}</span>;
}

// ---------------------------------------------------------------------------------------------

const AHEAD: [number, PeriodUnit, string][] = [
  [7, "dias", "7 dias"],
  [15, "dias", "15 dias"],
  [1, "meses", "1 mês"],
  [3, "meses", "3 meses"],
  [6, "meses", "6 meses"],
  [1, "anos", "1 ano"],
];
const FOR: [number, PeriodUnit, string][] = [
  [5, "dias", "5 dias"],
  [7, "dias", "7 dias"],
  [10, "dias", "10 dias"],
  [14, "dias", "14 dias"],
  [1, "meses", "1 mês"],
  [3, "meses", "3 meses"],
];
const UNITS: { value: PeriodUnit; one: string; many: string }[] = [
  { value: "dias", one: "dia", many: "dias" },
  { value: "semanas", one: "semana", many: "semanas" },
  { value: "meses", one: "mês", many: "meses" },
  { value: "anos", one: "ano", many: "anos" },
];

export function CampoData({
  label,
  value,
  onChange,
  time,
  onTimeChange,
  min,
  max,
  optional = false,
  emptyText = "Escolher",
  ahead = false,
  kind = "data",
  base,
}: {
  label?: string;
  /** AAAA-MM-DD ("" = vazio, só com optional) */
  value: string;
  onChange: (v: string) => void;
  /** "HH:MM" — mostra o seletor de horário */
  time?: string;
  onTimeChange?: (t: string) => void;
  min?: string;
  max?: string;
  optional?: boolean;
  emptyText?: string;
  /** Lembretes: atalho "Daqui a…" */
  ahead?: boolean;
  /** "por" = fim de remédio ("por 10 dias", contando de `base`) */
  kind?: "data" | "por";
  base?: string;
}) {
  const [open, setOpen] = useState(false);
  const shown = value ? `${fmtShortDate(value)}${time ? ` · ${time}` : ""}` : emptyText;
  return (
    <div className="min-w-0">
      {label && <Label>{label}</Label>}
      <button type="button" onClick={() => setOpen(true)} className={PILL} aria-label={`${label ?? "Data"}: ${value ? fmtLongDate(value) : emptyText}${time ? ` às ${time}` : ""}`}>
        <CalendarDays size={19} className="shrink-0 text-olive" />
        <span className={`min-w-0 flex-1 truncate ${value ? "" : "font-semibold text-faint"}`}>{shown}</span>
      </button>
      <PickerSheet open={open} onClose={() => setOpen(false)} title={label ?? "Data"}>
        <DatePanel
          value={value}
          time={time}
          min={min}
          max={max}
          optional={optional}
          ahead={ahead}
          kind={kind}
          base={base}
          onConfirm={(v, t) => {
            onChange(v);
            if (t && onTimeChange) onTimeChange(t);
            setOpen(false);
          }}
        />
      </PickerSheet>
    </div>
  );
}

/** Só horário ("08:30"), mesma pílula. */
export function CampoHora({ label, value, onChange, compact = false }: { label?: string; value: string; onChange: (t: string) => void; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  return (
    <div className="min-w-0">
      {label && <Label>{label}</Label>}
      <button type="button" onClick={() => (setDraft(value), setOpen(true))} className={compact ? PILL.replace("w-full", "w-auto") : PILL} aria-label={`${label ?? "Horário"}: ${value}`}>
        <Clock size={19} className="shrink-0 text-olive" />
        <span className="min-w-0 flex-1 truncate">{value}</span>
      </button>
      <PickerSheet open={open} onClose={() => setOpen(false)} title={label ?? "Horário"}>
        <div className="space-y-5 pb-2">
          <TimePicker value={draft} onChange={setDraft} />
          <button type="button" onClick={() => (onChange(draft), setOpen(false))} className="h-14 w-full rounded-full bg-forest text-lg font-bold text-pink active:scale-[0.98]">
            Confirmar
          </button>
        </div>
      </PickerSheet>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------

/** Painel que sobe de baixo, por cima de qualquer outra janela (vai direto no <body>). */
function PickerSheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- o portal só existe no navegador
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!mounted) return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center">
          <motion.div className="absolute inset-0 bg-forest/35 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="pb-safe relative max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-[28px] bg-card px-5 pt-3 shadow-float sm:rounded-[28px]"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
          >
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line" />
            <div className="mb-4 flex items-center justify-between">
              <h2 className="titulo text-2xl">{title}</h2>
              <button type="button" aria-label="Fechar" onClick={onClose} className="grid size-10 place-items-center rounded-full bg-bg text-muted">
                <X size={20} />
              </button>
            </div>
            {children}
            <div className="h-4" />
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function Chip({ sel, onClick, disabled, children }: { sel: boolean; onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={sel}
      onClick={onClick}
      className={`h-10 rounded-full px-4 text-sm font-bold transition active:scale-95 disabled:opacity-30 ${sel ? "bg-forest text-pink" : "bg-bg text-forest ring-2 ring-line"}`}
    >
      {children}
    </button>
  );
}

function DatePanel({
  value,
  time,
  min,
  max,
  optional,
  ahead,
  kind,
  base,
  onConfirm,
}: {
  value: string;
  time?: string;
  min?: string;
  max?: string;
  optional: boolean;
  ahead: boolean;
  kind: "data" | "por";
  base?: string;
  onConfirm: (v: string, t?: string) => void;
}) {
  const today = todayStr();
  const [draft, setDraft] = useState(value || (kind === "por" ? "" : today));
  const [draftTime, setDraftTime] = useState(time ?? "09:00");
  const [month, setMonth] = useState(() => {
    const d = parseDate(value || base || today);
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [rel, setRel] = useState<{ n: number; unit: PeriodUnit } | null>(null);
  const from = parseDate(base || today);
  const allowed = (d: string) => (!min || d >= min) && (!max || d <= max);

  function pick(d: string) {
    if (!allowed(d)) return;
    setDraft(d);
    const p = parseDate(d);
    setMonth(new Date(p.getFullYear(), p.getMonth(), 1));
  }
  function applyRel(n: number, unit: PeriodUnit) {
    setRel({ n, unit });
    const d = addPeriod(from, Math.max(0, n), unit);
    pick(toDateStr(kind === "por" ? addDays(d, -1) : d));
  }

  const quick: { label: string; d: string }[] =
    kind === "por"
      ? []
      : [
          { label: "Hoje", d: today },
          { label: "Ontem", d: toDateStr(addDays(new Date(), -1)) },
          { label: "Amanhã", d: toDateStr(addDays(new Date(), 1)) },
        ];
  const chips = kind === "por" ? FOR : AHEAD;
  const showRel = ahead || kind === "por";

  return (
    <div className="space-y-4 pb-2">
      <div className="flex flex-wrap gap-2">
        {quick.map((q) => (
          <Chip key={q.label} sel={draft === q.d && !rel} disabled={!allowed(q.d)} onClick={() => (setRel(null), pick(q.d))}>
            {q.label}
          </Chip>
        ))}
        {showRel && (
          <Chip sel={!!rel} onClick={() => (rel ? setRel(null) : applyRel(kind === "por" ? 7 : 15, "dias"))}>
            {kind === "por" ? "Por…" : "Daqui a…"}
          </Chip>
        )}
        {optional && (
          <Chip sel={!draft} onClick={() => (setRel(null), setDraft(""))}>
            {kind === "por" ? "Sem fim" : "Sem data"}
          </Chip>
        )}
      </div>

      <AnimatePresence initial={false}>
        {rel && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="space-y-2 rounded-3xl bg-bg p-3">
              <div className="grid grid-cols-[88px_minmax(0,1fr)] gap-2">
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={999}
                  value={rel.n || ""}
                  onChange={(e) => applyRel(Number(e.target.value.replace(/\D/g, "")) || 0, rel.unit)}
                  aria-label="Quantidade"
                  className="h-13 w-full min-w-0 rounded-2xl border-2 border-line bg-card px-3 text-center text-base font-bold outline-none focus:border-primary"
                />
                <select
                  value={rel.unit}
                  onChange={(e) => applyRel(rel.n, e.target.value as PeriodUnit)}
                  aria-label="Unidade"
                  className="h-13 w-full min-w-0 rounded-2xl border-2 border-line bg-card px-3 text-base font-bold outline-none focus:border-primary"
                >
                  {UNITS.map((u) => (
                    <option key={u.value} value={u.value}>
                      {rel.n === 1 ? u.one : u.many}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {chips.map(([n, u, l]) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => applyRel(n, u)}
                    className={`h-8 rounded-full px-3 text-xs font-bold active:scale-95 ${rel.n === n && rel.unit === u ? "bg-forest text-pink" : "bg-card text-forest ring-2 ring-line"}`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <MonthGrid month={month} setMonth={setMonth} selected={draft} onPick={(d) => (setRel(null), pick(d))} allowed={allowed} />

      {time !== undefined && (
        <div>
          <span className="mb-2 block px-1 text-sm font-bold text-muted">Horário</span>
          <TimePicker value={draftTime} onChange={setDraftTime} />
        </div>
      )}

      <p className="min-h-5 px-1 text-sm font-semibold text-olive">
        {draft ? `→ ${fmtLongDate(draft)}${time !== undefined ? ` às ${draftTime}` : ""}` : kind === "por" ? "→ uso contínuo, sem data de fim" : "→ sem data"}
      </p>
      <button
        type="button"
        onClick={() => onConfirm(draft, time !== undefined ? draftTime : undefined)}
        className="h-14 w-full rounded-full bg-forest text-lg font-bold text-pink active:scale-[0.98]"
      >
        Confirmar
      </button>
    </div>
  );
}

/** Calendário do mês no estilo do app: escolhido = círculo rosa, hoje = contorno verde. */
function MonthGrid({
  month,
  setMonth,
  selected,
  onPick,
  allowed,
}: {
  month: Date;
  setMonth: (d: Date) => void;
  selected: string;
  onPick: (d: string) => void;
  allowed: (d: string) => boolean;
}) {
  const start = startOfWeek(month);
  const today = todayStr();
  return (
    <div className="rounded-3xl bg-bg p-2">
      <div className="flex items-center gap-1 px-1 pb-1">
        <button type="button" aria-label="Mês anterior" onClick={() => setMonth(addMonths(month, -1))} className="grid size-10 place-items-center rounded-full text-forest active:bg-card">
          <ChevronLeft size={20} />
        </button>
        <span className="titulo flex-1 text-center text-lg">{monthLabel(month)}</span>
        <button type="button" aria-label="Próximo mês" onClick={() => setMonth(addMonths(month, 1))} className="grid size-10 place-items-center rounded-full text-forest active:bg-card">
          <ChevronRight size={20} />
        </button>
      </div>
      <div className="grid grid-cols-7 text-center text-[11px] font-bold text-muted">
        {["S", "T", "Q", "Q", "S", "S", "D"].map((l, i) => (
          <span key={i} className="py-1">
            {l}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5">
        {Array.from({ length: 42 }, (_, i) => addDays(start, i)).map((d) => {
          const ds = toDateStr(d);
          const inMonth = d.getMonth() === month.getMonth();
          const sel = ds === selected;
          const isToday = ds === today;
          const ok = allowed(ds);
          return (
            <button
              key={ds}
              type="button"
              disabled={!ok}
              onClick={() => onPick(ds)}
              aria-pressed={sel}
              aria-label={fmtLongDate(ds)}
              className={`mx-auto grid size-10 place-items-center rounded-full text-[15px] font-bold transition ${
                sel ? "bg-pink text-forest" : isToday ? "text-forest ring-2 ring-inset ring-forest" : "text-fg"
              } ${inMonth ? "" : "opacity-35"} ${ok ? "active:scale-90" : "cursor-default opacity-20"}`}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Horário: hora e minuto em listas (sem o relógio nativo). */
function TimePicker({ value, onChange }: { value: string; onChange: (t: string) => void }) {
  const [h, m] = (value || "09:00").split(":");
  const minutes = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));
  if (!minutes.includes(m)) minutes.push(m);
  minutes.sort();
  const cls = "h-13 w-full min-w-0 appearance-none rounded-2xl border-2 border-line bg-card px-3 text-center text-xl font-extrabold text-forest outline-none focus:border-primary";
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
      <select aria-label="Hora" value={h} onChange={(e) => onChange(`${e.target.value}:${m}`)} className={cls}>
        {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0")).map((x) => (
          <option key={x} value={x}>
            {x}
          </option>
        ))}
      </select>
      <span className="text-2xl font-extrabold text-forest">:</span>
      <select aria-label="Minutos" value={m} onChange={(e) => onChange(`${h}:${e.target.value}`)} className={cls}>
        {minutes.map((x) => (
          <option key={x} value={x}>
            {x}
          </option>
        ))}
      </select>
    </div>
  );
}
