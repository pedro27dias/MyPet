"use client";

import { useState } from "react";
import { newId } from "@/lib/onboarding";
import { fmtMoney } from "@/lib/money";
import { todayStr } from "@/lib/dates";
import type { Expense, ExpenseCategory } from "@/lib/types";
import { useApp } from "../app-provider";
import { Button } from "../ui/button";
import { TextField } from "../ui/fields";
import { Sheet } from "../ui/sheet";
import { useToast } from "../ui/toast";
import { EXPENSE_META, EXPENSE_ORDER } from "./expense-meta";

/** Janela de lançar (ou corrigir) um gasto: valor, categoria, data, quem pagou. */
export function ExpenseSheet({ open, expense, onClose }: { open: boolean; expense?: Expense | null; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title={expense ? "Corrigir gasto" : "Novo gasto"}>
      {open && <ExpenseForm key={expense?.id ?? "novo"} expense={expense ?? null} onDone={onClose} />}
    </Sheet>
  );
}

function ExpenseForm({ expense, onDone }: { expense: Expense | null; onDone: () => void }) {
  const { repo, pet, user, tutors, reloadData } = useApp();
  const toast = useToast();
  // valor guardado em centavos: digitar "4590" vira R$ 45,90 (rápido no teclado numérico)
  const [cents, setCents] = useState(expense ? Math.round(expense.amount * 100) : 0);
  const [category, setCategory] = useState<ExpenseCategory | null>(expense?.category ?? null);
  const [date, setDate] = useState(expense?.date ?? todayStr());
  const [paidBy, setPaidBy] = useState<string | null>(expense ? expense.paidBy : user.id);
  const [note, setNote] = useState(expense?.note ?? "");
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!pet) return null;

  async function save() {
    if (!pet) return;
    if (cents <= 0) return setError("Coloque o valor.");
    if (!category) return setError("Escolha a categoria.");
    setBusy(true);
    setError(null);
    try {
      await repo.saveExpense({
        id: expense?.id ?? newId(),
        petId: pet.id,
        amount: cents / 100,
        category,
        date,
        paidBy,
        note: note.trim() || null,
      });
      await reloadData();
      toast(expense ? "Gasto corrigido ✓" : `${fmtMoney(cents / 100)} lançado ✓`);
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!expense) return;
    setBusy(true);
    try {
      await repo.deleteExpense(expense.id);
      await reloadData();
      toast("Gasto apagado.");
      onDone();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  const payers = tutors.length ? tutors : [{ userId: user.id, name: user.name, role: "principal" as const }];

  return (
    <div className="space-y-5 pb-2">
      {/* Valor */}
      <label className="block rounded-3xl bg-bg p-4 text-center">
        <span className="block text-sm font-bold text-muted">Valor</span>
        <input
          inputMode="numeric"
          autoFocus={!expense}
          aria-label="Valor em reais"
          value={fmtMoney(cents / 100)}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, "").slice(0, 9);
            setCents(Number(digits || 0));
          }}
          className={`w-full bg-transparent text-center text-4xl font-bold outline-none ${cents ? "text-forest" : "text-faint"}`}
        />
      </label>

      {/* Categoria */}
      <div>
        <span className="mb-2 block px-1 text-sm font-bold text-muted">Categoria</span>
        <div className="grid grid-cols-5 gap-2">
          {EXPENSE_ORDER.map((c) => {
            const m = EXPENSE_META[c];
            const sel = category === c;
            return (
              <button
                key={c}
                type="button"
                aria-pressed={sel}
                onClick={() => setCategory(c)}
                className={`flex flex-col items-center gap-1.5 rounded-2xl p-2 transition active:scale-95 ${sel ? "bg-forest text-pink" : "bg-card ring-2 ring-line"}`}
              >
                <span className={`grid size-10 place-items-center rounded-xl ${sel ? "bg-pink/20 text-pink" : `${m.bg} ${m.fg}`}`}>
                  <m.Icon size={20} strokeWidth={2.2} />
                </span>
                <span className={`text-[11px] font-bold leading-tight ${sel ? "text-pink" : "text-forest"}`}>{m.label.split(" ")[0]}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <TextField label="Data" type="date" value={date} max={todayStr()} onChange={(v) => v && setDate(v)} />
        <TextField label="Descrição (opcional)" value={note} onChange={setNote} placeholder="Ex.: saco 15 kg" />
      </div>

      {/* Quem pagou */}
      <div>
        <span className="mb-2 block px-1 text-sm font-bold text-muted">Quem pagou</span>
        <div className="flex flex-wrap gap-2">
          {payers.map((t) => {
            const sel = paidBy === t.userId;
            return (
              <button
                key={t.userId}
                type="button"
                aria-pressed={sel}
                onClick={() => setPaidBy(t.userId)}
                className={`h-10 rounded-full px-4 text-sm font-bold transition active:scale-95 ${sel ? "bg-forest text-pink" : "bg-card text-forest ring-2 ring-line"}`}
              >
                {t.userId === user.id ? "Eu" : t.name}
              </button>
            );
          })}
        </div>
      </div>

      {error && <p className="rounded-2xl bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">{error}</p>}
      <Button size="lg" className="w-full" disabled={busy} onClick={save}>
        {busy ? "Salvando..." : expense ? "Salvar" : "Lançar gasto"}
      </Button>
      {expense &&
        (confirmDelete ? (
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={() => setConfirmDelete(false)}>
              Cancelar
            </Button>
            <Button variant="danger" className="flex-1" disabled={busy} onClick={remove}>
              Apagar mesmo
            </Button>
          </div>
        ) : (
          <Button variant="ghost" className="w-full" onClick={() => setConfirmDelete(true)}>
            Apagar este gasto
          </Button>
        ))}
    </div>
  );
}
