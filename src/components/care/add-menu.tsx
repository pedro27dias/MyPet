"use client";

import { motion } from "motion/react";
import { Wallet } from "lucide-react";
import { useState } from "react";
import type { Care, CareType } from "@/lib/types";
import { useApp } from "../app-provider";
import { Sheet } from "../ui/sheet";
import { ExpenseSheet } from "../gastos/expense-form";
import { CARE_META } from "./care-meta";
import { CareFormSheet, newCareFor } from "./care-form";

const OPTIONS: { type: CareType; label: string }[] = [
  { type: "remedio", label: "Remédio" },
  { type: "vacina", label: "Vacina" },
  { type: "vermifugo", label: "Vermífugo" },
  { type: "antipulgas", label: "Antipulgas" },
  { type: "consulta", label: "Consulta, cirurgia ou exame" },
  { type: "outro", label: "Lembrete livre" },
];

/** Botão "+": escolhe o que adicionar. */
export function AddMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { pet } = useApp();
  const [draft, setDraft] = useState<Care | null>(null);
  const [expenseOpen, setExpenseOpen] = useState(false);

  return (
    <>
      <Sheet open={open} onClose={onClose} title="Adicionar">
        <div className="grid grid-cols-2 gap-3 pb-2">
          {OPTIONS.map((o, i) => {
            const m = CARE_META[o.type];
            return (
              <motion.button
                key={o.type}
                type="button"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.03 * i }}
                onClick={() => {
                  if (!pet) return;
                  onClose();
                  setDraft(newCareFor(pet.id, o.type, pet.species));
                }}
                className={`flex min-h-28 flex-col items-start justify-between rounded-3xl p-4 text-left active:scale-[0.97] ${m.bg}`}
              >
                <m.Icon size={30} className={m.fg} strokeWidth={2.2} />
                <span className="font-extrabold leading-tight">{o.label}</span>
              </motion.button>
            );
          })}
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.03 * OPTIONS.length }}
            onClick={() => {
              if (!pet) return;
              onClose();
              setExpenseOpen(true);
            }}
            className="col-span-2 flex items-center gap-3 rounded-3xl bg-forest p-4 text-left active:scale-[0.98]"
          >
            <Wallet size={26} className="text-pink" />
            <span className="font-extrabold text-pink">Gasto</span>
            <span className="ml-auto text-sm text-pink/70">ração, vet, banho...</span>
          </motion.button>
        </div>
      </Sheet>
      <CareFormSheet care={draft} open={!!draft} onClose={() => setDraft(null)} />
      <ExpenseSheet open={expenseOpen} onClose={() => setExpenseOpen(false)} />
    </>
  );
}
