"use client";

/* eslint-disable @next/next/no-img-element -- recibos vêm de links temporários do Storage */
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight, Paperclip, Plus, SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { addMonths, fmtDate, monthLabel, parseDate, toDateStr, todayStr, weekdayLong } from "@/lib/dates";
import { fmtMoney, sumMoney } from "@/lib/money";
import type { Expense, ExpenseCategory } from "@/lib/types";
import { useApp } from "../app-provider";
import { TabShell } from "../shell/tab-shell";
import { Button } from "../ui/button";
import { ExpenseSheet } from "./expense-form";
import { expenseMeta, ExpenseIcon } from "./expense-meta";
import { CampoData } from "../ui/campo-data";

function firstOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/** Aba Gastos: total do período, rosca por categoria, quem pagou, lista por dia e filtros. */
export function GastosScreen() {
  const { repo, pet, tick, nameOf, tutors } = useApp();
  const [month, setMonth] = useState(() => firstOfMonth());
  const [custom, setCustom] = useState<{ from: string; to: string } | null>(null);
  const [list, setList] = useState<Expense[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [adding, setAdding] = useState(false);
  const [dir, setDir] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [catFilter, setCatFilter] = useState<ExpenseCategory | null>(null);
  const [payerFilter, setPayerFilter] = useState<string | null>(null);
  const [receipts, setReceipts] = useState<Record<string, string>>({});
  const [zoom, setZoom] = useState<string | null>(null);
  const [thisMonth] = useState(() => firstOfMonth().getTime());

  const from = custom?.from ?? toDateStr(month);
  const to = custom?.to ?? toDateStr(new Date(month.getFullYear(), month.getMonth() + 1, 0));

  useEffect(() => {
    if (!pet) return;
    let alive = true;
    repo.listExpenses(pet.id, from, to).then(
      (r) => {
        if (!alive) return;
        setList(r);
        setError(null);
      },
      (e: Error) => alive && setError(e.message),
    );
    return () => {
      alive = false;
    };
  }, [repo, pet, from, to, tick]);

  // Miniaturas dos recibos
  useEffect(() => {
    const paths = (list ?? []).map((e) => e.receipt).filter((p): p is string => !!p);
    if (paths.length) repo.photoUrls(paths).then(setReceipts, () => {});
  }, [repo, list]);

  const shown = useMemo(
    () => (list ?? []).filter((e) => (!catFilter || e.category === catFilter) && (!payerFilter || e.paidBy === payerFilter)),
    [list, catFilter, payerFilter],
  );
  const total = sumMoney(shown.map((e) => e.amount));
  const byCategory = useMemo(() => {
    const m = new Map<string, number[]>();
    for (const e of shown) m.set(e.category, [...(m.get(e.category) ?? []), e.amount]);
    return [...m.entries()].map(([c, v]) => ({ c: c as ExpenseCategory, v: sumMoney(v) })).sort((a, b) => b.v - a.v);
  }, [shown]);
  const byPayer = useMemo(() => {
    const m = new Map<string, number[]>();
    for (const e of shown) m.set(e.paidBy ?? "", [...(m.get(e.paidBy ?? "") ?? []), e.amount]);
    return [...m.entries()].map(([id, v]) => ({ id, v: sumMoney(v) })).sort((a, b) => b.v - a.v);
  }, [shown]);
  const byDay = useMemo(() => {
    const g: { day: string; items: Expense[] }[] = [];
    for (const e of shown) {
      const last = g[g.length - 1];
      if (last?.day === e.date) last.items.push(e);
      else g.push({ day: e.date, items: [e] });
    }
    return g;
  }, [shown]);

  if (!pet) return null;
  const canNext = month.getTime() < thisMonth;
  const go = (n: number) => {
    setDir(n);
    setMonth((m) => addMonths(m, n));
  };
  const allCats = [...new Set((list ?? []).map((e) => e.category))];
  const filtersOn = !!catFilter || !!payerFilter || !!custom;

  return (
    <TabShell
      title={
        <div className="flex items-end justify-between pb-5 pt-6">
          <h1 className="titulo text-4xl">Gastos</h1>
          <Button size="sm" onClick={() => setAdding(true)}>
            <Plus size={18} strokeWidth={2.75} /> Gasto
          </Button>
        </div>
      }
    >
      {/* Total do período */}
      <section className="overflow-hidden rounded-[24px] bg-forest p-5 text-pink-soft shadow-float">
        {custom ? (
          <p className="text-center text-sm font-bold text-pink/80">
            {fmtDate(custom.from)} a {fmtDate(custom.to)}
          </p>
        ) : (
          <div className="flex items-center justify-between">
            <button type="button" aria-label="Mês anterior" onClick={() => go(-1)} className="grid size-10 place-items-center rounded-full bg-pink/15 text-pink active:scale-95">
              <ChevronLeft size={20} />
            </button>
            <span className="titulo !text-pink text-xl">{monthLabel(month)}</span>
            <button
              type="button"
              aria-label="Próximo mês"
              onClick={() => canNext && go(1)}
              disabled={!canNext}
              className="grid size-10 place-items-center rounded-full bg-pink/15 text-pink active:scale-95 disabled:opacity-30"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}
        <AnimatePresence mode="popLayout" initial={false} custom={dir}>
          <motion.p
            key={`${from}${to}${total}`}
            custom={dir}
            initial={{ opacity: 0, x: dir * 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir * -30 }}
            className="mt-3 text-center text-[2.6rem] font-bold leading-none text-pink"
          >
            {fmtMoney(total)}
          </motion.p>
        </AnimatePresence>
        <p className="mt-1 text-center text-sm text-pink-soft/70">
          {shown.length} {shown.length === 1 ? "gasto" : "gastos"}
          {filtersOn ? " · com filtro" : ""}
        </p>
      </section>

      {/* Filtros */}
      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowFilters((v) => !v)}
          aria-expanded={showFilters}
          className={`flex h-10 items-center gap-2 rounded-full px-4 text-sm font-bold ${filtersOn ? "bg-forest text-pink" : "bg-card text-forest ring-2 ring-line"}`}
        >
          <SlidersHorizontal size={16} /> Filtros
        </button>
        {filtersOn && (
          <button type="button" onClick={() => (setCatFilter(null), setPayerFilter(null), setCustom(null))} className="text-sm font-bold text-olive underline">
            Limpar
          </button>
        )}
      </div>
      <AnimatePresence initial={false}>
        {showFilters && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="mt-3 space-y-4 rounded-3xl bg-card p-4 shadow-card">
              <FilterRow label="Período">
                <Chip sel={!custom} onClick={() => setCustom(null)}>
                  Por mês
                </Chip>
                <Chip sel={!!custom} onClick={() => setCustom(custom ?? { from: toDateStr(addMonths(new Date(), -3)), to: todayStr() })}>
                  Escolher período
                </Chip>
              </FilterRow>
              {custom && (
                <div className="campos-2">
                  <CampoData label="De" value={custom.from} max={custom.to} onChange={(v) => v && setCustom({ ...custom, from: v })} />
                  <CampoData label="Até" value={custom.to} min={custom.from} max={todayStr()} onChange={(v) => v && setCustom({ ...custom, to: v })} />
                </div>
              )}
              <FilterRow label="Categoria">
                <Chip sel={!catFilter} onClick={() => setCatFilter(null)}>
                  Todas
                </Chip>
                {allCats.map((c) => (
                  <Chip key={c} sel={catFilter === c} onClick={() => setCatFilter(c)}>
                    {expenseMeta(c).label}
                  </Chip>
                ))}
              </FilterRow>
              {tutors.length > 1 && (
                <FilterRow label="Quem pagou">
                  <Chip sel={!payerFilter} onClick={() => setPayerFilter(null)}>
                    Todos
                  </Chip>
                  {tutors.map((t) => (
                    <Chip key={t.userId} sel={payerFilter === t.userId} onClick={() => setPayerFilter(t.userId)}>
                      {nameOf(t.userId)}
                    </Chip>
                  ))}
                </FilterRow>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && <p className="mt-4 rounded-2xl bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">{error}</p>}

      {list === null && !error ? (
        <div className="mt-4 space-y-3">
          <div className="h-48 animate-pulse rounded-3xl bg-card" />
          <div className="h-20 animate-pulse rounded-3xl bg-card" />
        </div>
      ) : shown.length === 0 ? (
        <div className="mt-4 rounded-3xl bg-card p-6 text-center shadow-card">
          <p className="text-muted">Nenhum gasto {filtersOn ? "com esse filtro" : "neste mês"}.</p>
          <Button variant="soft" className="mt-4" onClick={() => setAdding(true)}>
            <Plus size={18} /> Lançar gasto
          </Button>
        </div>
      ) : (
        <>
          {/* Rosca por categoria */}
          <section className="mt-4 rounded-3xl bg-card p-5 shadow-card">
            <h2 className="titulo mb-4 text-xl">Por categoria</h2>
            <div className="flex flex-col items-center gap-5">
              <div className="relative">
                <Donut size={150} parts={byCategory.map((x) => ({ value: x.v, color: expenseMeta(x.c).chart }))} />
                <span className="absolute inset-0 grid place-items-center text-center">
                  <span>
                    <span className="block text-xs font-bold text-muted">{byCategory.length} {byCategory.length === 1 ? "categoria" : "categorias"}</span>
                    <span className="block text-lg font-extrabold text-forest">{fmtMoney(total)}</span>
                  </span>
                </span>
              </div>
              <ul className="w-full space-y-2">
                {byCategory.map(({ c, v }) => (
                  <li key={c} className="flex items-center gap-2 text-sm">
                    <span className="size-2.5 shrink-0 rounded-full" style={{ background: expenseMeta(c).chart }} />
                    <span className="min-w-0 flex-1 truncate font-semibold text-ink">{expenseMeta(c).label}</span>
                    <span className="shrink-0 text-right">
                      <span className="block font-bold text-forest">{fmtMoney(v)}</span>
                      <span className="block text-xs text-muted">{Math.round((v / total) * 100)}%</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Quem pagou */}
          <section className="mt-4 rounded-3xl bg-card p-5 shadow-card">
            <h2 className="titulo mb-3 text-xl">Quem pagou</h2>
            <ul className="space-y-3">
              {byPayer.map(({ id, v }) => (
                <li key={id || "ninguem"}>
                  <div className="flex items-center gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-peach-soft font-extrabold text-forest">
                      {(id ? nameOf(id) : "?").charAt(0).toUpperCase()}
                    </span>
                    <span className="flex-1 font-semibold text-ink">{id ? nameOf(id) : "Não informado"}</span>
                    <span className="font-bold text-forest">{fmtMoney(v)}</span>
                  </div>
                  <div className="ml-12 mt-1 h-1.5 overflow-hidden rounded-full bg-line">
                    <motion.div className="h-full rounded-full bg-olive" initial={{ width: 0 }} animate={{ width: `${(v / total) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* Lista por dia */}
          <div className="mt-6 space-y-5">
            {byDay.map((g) => (
              <section key={g.day}>
                <h3 className="mb-2 flex justify-between px-1 text-sm font-bold text-muted">
                  <span className="first-letter:uppercase">
                    {weekdayLong(parseDate(g.day))}, {fmtDate(g.day)}
                  </span>
                  <span>{fmtMoney(sumMoney(g.items.map((e) => e.amount)))}</span>
                </h3>
                <ul className="space-y-2">
                  {g.items.map((e) => (
                    <li key={e.id} className="flex items-center gap-3 rounded-3xl bg-card p-3 shadow-card">
                      <button type="button" onClick={() => setEditing(e)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                        <ExpenseIcon category={e.category} size={42} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-bold text-forest">{e.note || expenseMeta(e.category).label}</span>
                          <span className="block truncate text-xs text-muted">
                            {expenseMeta(e.category).label}
                            {e.paidBy ? ` · ${nameOf(e.paidBy)}` : ""}
                          </span>
                        </span>
                        <span className="shrink-0 font-bold text-forest">{fmtMoney(e.amount)}</span>
                      </button>
                      {e.receipt && receipts[e.receipt] && (
                        <button type="button" aria-label="Ver recibo" onClick={() => setZoom(receipts[e.receipt!])} className="relative shrink-0">
                          <img src={receipts[e.receipt]} alt="" className="size-10 rounded-xl object-cover" />
                          <Paperclip size={12} className="absolute -bottom-1 -right-1 rounded-full bg-forest p-0.5 text-pink" />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </>
      )}

      <ExpenseSheet open={adding || !!editing} expense={editing} onClose={() => (setAdding(false), setEditing(null))} />
      <AnimatePresence>
        {zoom && (
          <motion.button
            type="button"
            className="fixed inset-0 z-[70] grid place-items-center bg-forest/85 p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setZoom(null)}
            aria-label="Fechar recibo"
          >
            <img src={zoom} alt="Recibo" className="max-h-full max-w-full rounded-2xl" />
          </motion.button>
        )}
      </AnimatePresence>
    </TabShell>
  );
}

/** Gráfico de rosca (SVG). */
function Donut({ parts, size = 128 }: { parts: { value: number; color: string }[]; size?: number }) {
  const total = parts.reduce((t, p) => t + p.value, 0) || 1;
  const stroke = size * 0.16;
  const r = (size - stroke) / 2;
  const len = 2 * Math.PI * r;
  // início de cada fatia (fração acumulada antes dela)
  const starts = parts.map((_, i) => parts.slice(0, i).reduce((t, p) => t + p.value / total, 0));
  return (
    <svg width={size} height={size} className="shrink-0 -rotate-90" aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={stroke} />
      {parts.map((p, i) => {
        const frac = p.value / total;
        const dash = Math.max(0, frac * len - (parts.length > 1 ? 2 : 0));
        const offset = -starts[i] * len;
        return (
          <motion.circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={p.color}
            strokeWidth={stroke}
            strokeDashoffset={offset}
            initial={{ strokeDasharray: `0 ${len}` }}
            animate={{ strokeDasharray: `${dash} ${len - dash}` }}
            transition={{ duration: 0.7, delay: i * 0.05 }}
          />
        );
      })}
    </svg>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted">{label}</span>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Chip({ sel, onClick, children }: { sel: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={sel}
      onClick={onClick}
      className={`h-9 rounded-full px-3 text-sm font-bold transition active:scale-95 ${sel ? "bg-forest text-pink" : "bg-bg text-forest ring-2 ring-line"}`}
    >
      {children}
    </button>
  );
}
