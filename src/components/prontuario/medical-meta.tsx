import { ClipboardList, FileHeart, FlaskConical, Microscope, Scissors, Stethoscope, type LucideIcon } from "lucide-react";
import type { ExpenseCategory, MedicalKind } from "@/lib/types";

/** Tipos do prontuário: nome, ícone, cor e sugestões de título. */
export const MEDICAL_META: Record<MedicalKind, { label: string; plural: string; Icon: LucideIcon; fg: string; bg: string; examples: string[]; expense: ExpenseCategory }> = {
  consulta: { label: "Consulta", plural: "Consultas", Icon: Stethoscope, fg: "text-t-consulta", bg: "bg-t-consulta-soft", examples: ["Consulta de rotina", "Retorno"], expense: "vet" },
  exame: {
    label: "Exame",
    plural: "Exames",
    Icon: Microscope,
    fg: "text-pink-strong",
    bg: "bg-pink-soft",
    examples: ["Hemograma", "Bioquímico", "Ultrassom", "Raio-x", "Urina", "Fezes"],
    expense: "exames",
  },
  teste: { label: "Teste", plural: "Testes", Icon: FlaskConical, fg: "text-t-vacina", bg: "bg-t-vacina-soft", examples: ["Teste FeLV/FIV", "Teste de leishmaniose", "Teste de cinomose"], expense: "exames" },
  cirurgia: { label: "Cirurgia/procedimento", plural: "Cirurgias e procedimentos", Icon: Scissors, fg: "text-t-remedio", bg: "bg-t-remedio-soft", examples: ["Castração", "Limpeza de tártaro", "Retirada de pontos"], expense: "vet" },
  diagnostico: { label: "Diagnóstico", plural: "Diagnósticos", Icon: FileHeart, fg: "text-danger", bg: "bg-danger-soft", examples: ["Dermatite", "Otite", "Doença renal"], expense: "vet" },
  receita: { label: "Receita", plural: "Receitas", Icon: ClipboardList, fg: "text-t-vermifugo", bg: "bg-t-vermifugo-soft", examples: ["Receita"], expense: "remedio" },
};

export const MEDICAL_ORDER: MedicalKind[] = ["consulta", "exame", "teste", "cirurgia", "diagnostico", "receita"];

export function MedicalIcon({ kind, size = 44 }: { kind: MedicalKind; size?: number }) {
  const m = MEDICAL_META[kind];
  return (
    <span className={`grid shrink-0 place-items-center rounded-2xl ${m.bg} ${m.fg}`} style={{ width: size, height: size }} aria-hidden>
      <m.Icon size={size * 0.5} strokeWidth={2.2} />
    </span>
  );
}
