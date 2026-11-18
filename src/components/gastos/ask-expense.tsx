"use client";

import { useState } from "react";
import { newId } from "@/lib/onboarding";
import { fmtMoney } from "@/lib/money";
import type { ExpenseCategory } from "@/lib/types";
import { useApp } from "../app-provider";
import { Button } from "../ui/button";
import { Sheet } from "../ui/sheet";
import { useToast } from "../ui/toast";
import { expenseMeta, ExpenseIcon } from "./expense-meta";

export interface ExpenseAsk {
  amount: number;
  category: ExpenseCategory;
  note: string | null;
  /** AAAA-MM-DD */
  date: string;
}

/** "Lançar R$ X em Gastos?" — sempre pergunta antes (banho/tosa, consultas, exames com valor). */
export function AskExpenseSheet({ ask, onClose }: { ask: ExpenseAsk | null; onClose: () => void }) {
  return (
    <Sheet open={!!ask} onClose={onClose} title="Lançar em Gastos?">
      {ask && <AskForm key={`${ask.note}${ask.amount}${ask.date}`} ask={ask} onDone={onClose} />}
    </Sheet>
  );
}

function AskForm({ ask, onDone }: { ask: ExpenseAsk; onDone: () => void }) {
  const { repo, pet, user, tutors, reloadData } = useApp();
  const toast = useToast();
  const [paidBy, setPaidBy] = useState<string>(user.id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const payers = tutors.length ? tutors : [{ userId: user.id, name: user.name, role: "principal" as const }];
  const m = expenseMeta(ask.category);

  async function launch() {
    if (!pet) return;
    setBusy(true);
    setError(null);
    try {
      await repo.saveExpense({ id: newId(), petId: pet.id, amount: ask.amount, category: ask.category, date: ask.date, paidBy, note: ask.note });
      await reloadData();
      toast(`${fmtMoney(ask.amount)} lançado em Gastos ✓`);
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5 pb-2">
      <div className="flex items-center gap-3 rounded-3xl bg-bg p-4">
        <ExpenseIcon category={ask.category} size={48} />
        <div className="min-w-0 flex-1">
          <p className="text-2xl font-bold text-forest">{fmtMoney(ask.amount)}</p>
          <p className="truncate text-sm text-muted">
            {m.label}
            {ask.note ? ` · ${ask.note}` : ""}
          </p>
        </div>
      </div>
      <div>
        <span className="mb-2 block px-1 text-sm font-bold text-muted">Quem pagou</span>
        <div className="flex flex-wrap gap-2">
          {payers.map((t) => (
            <button
              key={t.userId}
              type="button"
              aria-pressed={paidBy === t.userId}
              onClick={() => setPaidBy(t.userId)}
              className={`h-10 rounded-full px-4 text-sm font-bold transition active:scale-95 ${paidBy === t.userId ? "bg-forest text-pink" : "bg-card text-forest ring-2 ring-line"}`}
            >
              {t.userId === user.id ? "Eu" : t.name}
            </button>
          ))}
        </div>
      </div>
      {error && <p className="rounded-2xl bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">{error}</p>}
      <div className="grid grid-cols-2 gap-2">
        <Button variant="ghost" onClick={onDone}>
          Agora não
        </Button>
        <Button disabled={busy} onClick={launch}>
          {busy ? "Lançando..." : "Lançar"}
        </Button>
      </div>
    </div>
  );
}
