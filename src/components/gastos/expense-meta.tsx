import { CircleEllipsis, Pill, ShowerHead, Stethoscope, Utensils, type LucideIcon } from "lucide-react";
import type { ExpenseCategory } from "@/lib/types";

/** Nome, ícone e cor de cada categoria de gasto. */
export const EXPENSE_META: Record<ExpenseCategory, { label: string; Icon: LucideIcon; fg: string; bg: string; bar: string }> = {
  racao: { label: "Ração", Icon: Utensils, fg: "text-olive", bg: "bg-olive-soft", bar: "bg-olive" },
  vet: { label: "Veterinário", Icon: Stethoscope, fg: "text-t-consulta", bg: "bg-t-consulta-soft", bar: "bg-t-consulta" },
  remedio: { label: "Remédio", Icon: Pill, fg: "text-t-remedio", bg: "bg-t-remedio-soft", bar: "bg-t-remedio" },
  banho: { label: "Banho e tosa", Icon: ShowerHead, fg: "text-t-vacina", bg: "bg-t-vacina-soft", bar: "bg-forest" },
  outros: { label: "Outros", Icon: CircleEllipsis, fg: "text-t-outro", bg: "bg-t-outro-soft", bar: "bg-t-outro" },
};

export const EXPENSE_ORDER: ExpenseCategory[] = ["racao", "vet", "remedio", "banho", "outros"];

export function ExpenseIcon({ category, size = 44 }: { category: ExpenseCategory; size?: number }) {
  const m = EXPENSE_META[category];
  return (
    <span className={`grid shrink-0 place-items-center rounded-2xl ${m.bg} ${m.fg}`} style={{ width: size, height: size }} aria-hidden>
      <m.Icon size={size * 0.5} strokeWidth={2.2} />
    </span>
  );
}
