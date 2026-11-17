"use client";

import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { addMonths, fmtDate, toDateStr } from "@/lib/dates";
import { fmtMoney, sumMoney } from "@/lib/money";
import type { Expense } from "@/lib/types";
import { useApp } from "../app-provider";
import { Button } from "../ui/button";
import { ExpenseSheet } from "./expense-form";
import { EXPENSE_META, EXPENSE_ORDER, ExpenseIcon } from "./expense-meta";

const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

function firstOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/** Gastos do mês: total, por categoria, quem pagou e a lista (tocar corrige). */
export function ExpensesPanel() {
  const { repo, pet, tick, nameOf } = useApp();
  const [month, setMonth] = useState(() => firstOfMonth());
  const [list, setList] = useState<Expense[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [adding, setAdding] = useState(false);
  const [dir, setDir] = useState(1);
  const [thisMonth] = useState(() => firstOfMonth().getTime());

  const key = `${month.getFullYear()}-${month.getMonth()}`;
  useEffect(() => {
    if (!pet) return;
    let alive = true;
    const from = toDateStr(month);
    const to = toDateStr(new Date(month.getFullYear(), month.getMonth() + 1, 0));
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
  }, [repo, pet, month, tick]);

  const total = useMemo(() => sumMoney((list ?? []).map((e) => e.amount)), [list]);
  const byCategory = useMemo(
    () =>
      EXPENSE_ORDER.map((c) => ({ c, v: sumMoney((list ?? []).filter((e) => e.category === c).map((e) => e.amount)) }))
        .filter((x) => x.v > 0)
        .sort((a, b) => b.v - a.v),
    [list],
  );
  const byPayer = useMemo(() => {
    const m = new Map<string, number[]>();
    for (const e of list ?? []) {
      const k = e.paidBy ?? "";
      m.set(k, [...(m.get(k) ?? []), e.amount]);
    }
    return [...m.entries()].map(([who, vals]) => ({ who, v: sumMoney(vals) })).sort((a, b) => b.v - a.v);
  }, [list]);

  const go = (n: number) => {
    setDir(n);
    setList(null);
    setMonth((m) => addMonths(m, n));
  };
  const isCurrent = month.getTime() === thisMonth;

  return (
    <div>
      {/* Mês */}
      <div className="mb-3 flex items-center justify-between">
        <button type="button" aria-label="Mês anterior" onClick={() => go(-1)} className="grid size-10 place-items-center rounded-full bg-card text-forest shadow-card">
          <ChevronLeft size={20} />
        </button>
        <p className="titulo text-2xl capitalize">
          {MONTHS[month.getMonth()]}
          {month.getFullYear() !== new Date(thisMonth).getFullYear() && <span className="text-lg"> {month.getFullYear()}</span>}
        </p>
        <button
          type="button"
          aria-label="Próximo mês"
          onClick={() => go(1)}
          disabled={isCurrent}
          className="grid size-10 place-items-center rounded-full bg-card text-forest shadow-card disabled:opacity-30"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {error ? (
        <p className="rounded-3xl bg-danger-soft p-4 text-sm font-semibold text-danger">{error}</p>
      ) : (
        <AnimatePresence mode="wait" initial={false} custom={dir}>
          <motion.div
            key={key}
            custom={dir}
            initial={{ opacity: 0, x: dir * 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir * -30 }}
            transition={{ duration: 0.22 }}
          >
            {/* Total */}
            <section className="rounded-[24px] bg-forest p-5 shadow-float">
              <p className="text-sm font-semibold text-pink/70">Total do mês</p>
              <p className="mt-1 text-4xl font-bold tracking-tight text-pink">{list ? fmtMoney(total) : "—"}</p>
              {byCategory.length > 0 && (
                <div className="mt-4 space-y-2.5">
                  {byCategory.map(({ c, v }) => (
                    <div key={c}>
                      <div className="flex justify-between text-sm text-pink-soft">
                        <span>{EXPENSE_META[c].label}</span>
                        <span className="font-semibold">{fmtMoney(v)}</span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-pink/15">
                        <motion.div
                          className="h-full rounded-full bg-pink"
                          initial={{ width: 0 }}
                          animate={{ width: `${(v / total) * 100}%` }}
                          transition={{ duration: 0.6, ease: "easeOut" }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {byPayer.length > 1 && (
                <div className="mt-4 flex flex-wrap gap-2 border-t border-pink/15 pt-3">
                  {byPayer.map(({ who, v }) => (
                    <span key={who} className="rounded-full bg-pink/15 px-3 py-1 text-xs font-semibold text-pink-soft">
                      {who ? nameOf(who) : "Sem nome"}: {fmtMoney(v)}
                    </span>
                  ))}
                </div>
              )}
            </section>

            {/* Lista */}
            {!list ? (
              <div className="mt-4 space-y-2">
                {[0, 1].map((i) => (
                  <div key={i} className="h-16 animate-pulse rounded-3xl bg-card" />
                ))}
              </div>
            ) : list.length === 0 ? (
              <p className="mt-4 rounded-3xl bg-card p-5 text-center text-muted shadow-card">
                Nenhum gasto em {MONTHS[month.getMonth()]}.
              </p>
            ) : (
              <ul className="mt-4 space-y-2">
                {list.map((e, i) => (
                  <motion.li key={e.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 * i }}>
                    <button
                      type="button"
                      onClick={() => setEditing(e)}
                      className="flex w-full items-center gap-3 rounded-3xl bg-card p-3 text-left shadow-card active:scale-[0.98]"
                    >
                      <ExpenseIcon category={e.category} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-bold text-forest">{e.note || EXPENSE_META[e.category].label}</span>
                        <span className="block truncate text-sm text-muted">
                          {fmtDate(e.date)}
                          {e.paidBy ? ` · pago por ${nameOf(e.paidBy) === "Você" ? "você" : nameOf(e.paidBy)}` : ""}
                        </span>
                      </span>
                      <span className="shrink-0 font-bold text-forest">{fmtMoney(e.amount)}</span>
                    </button>
                  </motion.li>
                ))}
              </ul>
            )}
          </motion.div>
        </AnimatePresence>
      )}

      <Button size="lg" className="mt-5 w-full" onClick={() => setAdding(true)}>
        <Plus size={20} strokeWidth={2.75} /> Lançar gasto
      </Button>

      <ExpenseSheet open={adding || !!editing} expense={editing} onClose={() => (setAdding(false), setEditing(null))} />
    </div>
  );
}
