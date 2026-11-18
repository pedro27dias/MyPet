import { Bone, Bug, CircleEllipsis, Cookie, Microscope, Pill, ShieldPlus, ShowerHead, Stethoscope, Syringe, Tag, Utensils, type LucideIcon } from "lucide-react";
import type { ExpenseCategory } from "@/lib/types";

/** Nome, ícone e cores de cada categoria de gasto. `chart` = cor do gráfico (variável CSS). */
export interface ExpenseMeta {
  label: string;
  Icon: LucideIcon;
  fg: string;
  bg: string;
  bar: string;
  chart: string;
}

export const EXPENSE_META: Record<Exclude<ExpenseCategory, `c:${string}`>, ExpenseMeta> = {
  racao: { label: "Ração", Icon: Utensils, fg: "text-olive", bg: "bg-olive-soft", bar: "bg-olive", chart: "var(--olive)" },
  petiscos: { label: "Petiscos", Icon: Cookie, fg: "text-t-petisco", bg: "bg-t-petisco-soft", bar: "bg-t-petisco", chart: "var(--t-petisco)" },
  vet: { label: "Consultas", Icon: Stethoscope, fg: "text-t-consulta", bg: "bg-t-consulta-soft", bar: "bg-t-consulta", chart: "var(--t-consulta)" },
  exames: { label: "Exames", Icon: Microscope, fg: "text-pink-strong", bg: "bg-pink-soft", bar: "bg-pink-strong", chart: "var(--pink-strong)" },
  remedio: { label: "Remédios", Icon: Pill, fg: "text-t-remedio", bg: "bg-t-remedio-soft", bar: "bg-t-remedio", chart: "var(--t-remedio)" },
  vacinas: { label: "Vacinas", Icon: Syringe, fg: "text-t-vacina", bg: "bg-t-vacina-soft", bar: "bg-t-vacina", chart: "var(--forest-2)" },
  antipulgas: { label: "Antipulgas/Coleira", Icon: Bug, fg: "text-t-vermifugo", bg: "bg-t-vermifugo-soft", bar: "bg-t-vermifugo", chart: "var(--t-vermifugo)" },
  banho: { label: "Banho e tosa", Icon: ShowerHead, fg: "text-t-banho", bg: "bg-t-banho-soft", bar: "bg-t-banho", chart: "var(--t-banho)" },
  plano: { label: "Plano de saúde", Icon: ShieldPlus, fg: "text-t-plano", bg: "bg-t-plano-soft", bar: "bg-t-plano", chart: "var(--t-plano)" },
  acessorios: { label: "Acessórios/brinquedos", Icon: Bone, fg: "text-t-brinquedo", bg: "bg-t-brinquedo-soft", bar: "bg-t-brinquedo", chart: "var(--t-brinquedo)" },
  outros: { label: "Outros", Icon: CircleEllipsis, fg: "text-t-outro", bg: "bg-t-outro-soft", bar: "bg-t-outro", chart: "var(--t-outro)" },
};

export const EXPENSE_ORDER: Exclude<ExpenseCategory, `c:${string}`>[] = [
  "racao",
  "petiscos",
  "vet",
  "exames",
  "remedio",
  "vacinas",
  "antipulgas",
  "banho",
  "plano",
  "acessorios",
  "outros",
];

const CUSTOM_CHART = ["var(--danger)", "var(--warn)", "var(--t-antipulgas)", "var(--muted)"];

/** Categoria padrão ou criada pelos tutores ("c:Nome"). */
export function expenseMeta(category: ExpenseCategory | string): ExpenseMeta {
  if (category.startsWith("c:")) {
    const name = category.slice(2);
    const i = [...name].reduce((t, ch) => t + ch.charCodeAt(0), 0) % CUSTOM_CHART.length;
    return { label: name, Icon: Tag, fg: "text-t-outro", bg: "bg-t-outro-soft", bar: "bg-t-outro", chart: CUSTOM_CHART[i] };
  }
  return EXPENSE_META[category as keyof typeof EXPENSE_META] ?? EXPENSE_META.outros;
}

export function ExpenseIcon({ category, size = 44 }: { category: ExpenseCategory; size?: number }) {
  const m = expenseMeta(category);
  return (
    <span className={`grid shrink-0 place-items-center rounded-2xl ${m.bg} ${m.fg}`} style={{ width: size, height: size }} aria-hidden>
      <m.Icon size={size * 0.5} strokeWidth={2.2} />
    </span>
  );
}
