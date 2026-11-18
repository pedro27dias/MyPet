"use client";

/* eslint-disable @next/next/no-img-element -- prévia local do recibo */
import { Camera, Plus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { newId } from "@/lib/onboarding";
import { fmtMoney } from "@/lib/money";
import { compressPhoto } from "@/lib/photo";
import { todayStr } from "@/lib/dates";
import type { Expense, ExpenseCategory } from "@/lib/types";
import { useApp } from "../app-provider";
import { Button } from "../ui/button";
import { TextField } from "../ui/fields";
import { Sheet } from "../ui/sheet";
import { useToast } from "../ui/toast";
import { EXPENSE_ORDER, expenseMeta } from "./expense-meta";
import { CampoData } from "../ui/campo-data";

/**
 * Lançar (ou corrigir) um gasto: valor, categoria (padrão ou criada), data, descrição, quem pagou
 * e foto do recibo. `preset` preenche quando o gasto vem de outro lugar (banho, consulta, exame).
 */
export function ExpenseSheet({
  open,
  expense,
  preset,
  onClose,
}: {
  open: boolean;
  expense?: Expense | null;
  preset?: Partial<Expense> | null;
  onClose: () => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} title={expense ? "Corrigir gasto" : "Novo gasto"}>
      {open && <ExpenseForm key={expense?.id ?? "novo"} expense={expense ?? null} preset={preset ?? null} onDone={onClose} />}
    </Sheet>
  );
}

function ExpenseForm({ expense, preset, onDone }: { expense: Expense | null; preset: Partial<Expense> | null; onDone: () => void }) {
  const { repo, pet, user, tutors, reloadData, reloadPets } = useApp();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const init = expense ?? preset;
  // valor guardado em centavos: digitar "4590" vira R$ 45,90 (rápido no teclado numérico)
  const [cents, setCents] = useState(init?.amount ? Math.round(init.amount * 100) : 0);
  const [category, setCategory] = useState<ExpenseCategory | null>(init?.category ?? null);
  const [date, setDate] = useState(init?.date ?? todayStr());
  const [paidBy, setPaidBy] = useState<string | null>(expense ? expense.paidBy : (preset?.paidBy ?? user.id));
  const [note, setNote] = useState(init?.note ?? "");
  const [receipt, setReceipt] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newCat, setNewCat] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!expense?.receipt) return;
    repo.photoUrls([expense.receipt]).then((u) => setPreview((p) => p ?? u[expense.receipt!] ?? null), () => {});
  }, [repo, expense?.receipt]);

  if (!pet) return null;
  const custom = (pet.expenseCategories ?? []).map((n) => `c:${n}` as ExpenseCategory);
  const categories: ExpenseCategory[] = [...EXPENSE_ORDER, ...custom];
  if (category && !categories.includes(category)) categories.push(category);

  async function addCategory() {
    if (!pet) return;
    const name = newCat.trim();
    if (!name) return;
    try {
      const list = [...new Set([...(pet.expenseCategories ?? []), name])];
      await repo.updatePet(pet.id, { expenseCategories: list });
      await reloadPets(pet.id);
      setCategory(`c:${name}`);
      setCreating(false);
      setNewCat("");
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function pick(file?: File) {
    if (!file) return;
    try {
      const b = await compressPhoto(file, 1200);
      setReceipt(b);
      setPreview(URL.createObjectURL(b));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function save() {
    if (!pet) return;
    if (cents <= 0) return setError("Coloque o valor.");
    if (!category) return setError("Escolha a categoria.");
    setBusy(true);
    setError(null);
    try {
      const path = receipt ? await repo.uploadFile(pet.id, receipt, "recibo", "jpg") : (expense?.receipt ?? null);
      await repo.saveExpense({
        id: expense?.id ?? newId(),
        petId: pet.id,
        amount: cents / 100,
        category,
        date,
        paidBy,
        note: note.trim() || null,
        receipt: preview ? path : null,
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
        <div className="grid grid-cols-4 gap-2">
          {categories.map((c) => {
            const m = expenseMeta(c);
            const sel = category === c;
            return (
              <button
                key={c}
                type="button"
                aria-pressed={sel}
                onClick={() => setCategory(c)}
                className={`flex flex-col items-center gap-1.5 rounded-2xl p-2 transition active:scale-95 ${sel ? "bg-forest text-pink" : "bg-card ring-2 ring-line"}`}
              >
                <span className={`grid size-9 place-items-center rounded-xl ${sel ? "bg-pink/20 text-pink" : `${m.bg} ${m.fg}`}`}>
                  <m.Icon size={18} strokeWidth={2.2} />
                </span>
                <span className={`line-clamp-2 text-center text-[11px] font-bold leading-tight ${sel ? "text-pink" : "text-forest"}`}>{m.label.split("/")[0]}</span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="flex flex-col items-center gap-1.5 rounded-2xl border-2 border-dashed border-line p-2 text-olive active:scale-95"
          >
            <span className="grid size-9 place-items-center rounded-xl bg-bg">
              <Plus size={18} />
            </span>
            <span className="text-[11px] font-bold leading-tight">Criar categoria</span>
          </button>
        </div>
        {creating && (
          <div className="mt-3 flex gap-2">
            <div className="flex-1">
              <TextField value={newCat} onChange={setNewCat} placeholder="Ex.: Creche, Adestramento" maxLength={24} />
            </div>
            <Button onClick={addCategory} disabled={!newCat.trim()}>
              Criar
            </Button>
          </div>
        )}
      </div>

      <div className="campos-2">
        <CampoData label="Data" value={date} max={todayStr()} onChange={(v) => v && setDate(v)} />
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

      {/* Recibo */}
      <div>
        <span className="mb-1 block px-1 text-sm font-bold text-muted">Recibo (opcional)</span>
        {preview ? (
          <div className="relative w-fit">
            <img src={preview} alt="Recibo" className="h-24 rounded-2xl object-cover" />
            <button
              type="button"
              aria-label="Tirar recibo"
              onClick={() => (setReceipt(null), setPreview(null))}
              className="absolute -right-2 -top-2 grid size-8 place-items-center rounded-full bg-forest text-pink"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line font-bold text-olive"
          >
            <Camera size={18} /> Foto do recibo
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
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
