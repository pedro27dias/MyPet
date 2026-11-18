import { Bell, Bug, Microscope, Pill, ShieldCheck, ShowerHead, Stethoscope, Syringe, Tablets, type LucideIcon } from "lucide-react";
import type { CareType } from "@/lib/types";

/** Nome, ícone e cor de cada tipo de cuidado (iguais em todas as telas). */
export const CARE_META: Record<CareType, { label: string; plural: string; Icon: LucideIcon; fg: string; bg: string }> = {
  remedio: { label: "Remédio", plural: "Remédios", Icon: Pill, fg: "text-t-remedio", bg: "bg-t-remedio-soft" },
  vacina: { label: "Vacina", plural: "Vacinas", Icon: Syringe, fg: "text-t-vacina", bg: "bg-t-vacina-soft" },
  vermifugo: { label: "Vermífugo", plural: "Vermífugo", Icon: Tablets, fg: "text-t-vermifugo", bg: "bg-t-vermifugo-soft" },
  antipulgas: { label: "Antipulgas", plural: "Pulgas e carrapatos", Icon: Bug, fg: "text-t-antipulgas", bg: "bg-t-antipulgas-soft" },
  coleira: { label: "Coleira", plural: "Coleiras", Icon: ShieldCheck, fg: "text-forest", bg: "bg-pink-soft" },
  banho: { label: "Banho e tosa", plural: "Banho e tosa", Icon: ShowerHead, fg: "text-t-banho", bg: "bg-t-banho-soft" },
  consulta: { label: "Consulta", plural: "Consultas e procedimentos", Icon: Stethoscope, fg: "text-t-consulta", bg: "bg-t-consulta-soft" },
  exame: { label: "Teste", plural: "Testes e exames", Icon: Microscope, fg: "text-olive", bg: "bg-olive-soft" },
  outro: { label: "Lembrete", plural: "Outros", Icon: Bell, fg: "text-t-outro", bg: "bg-t-outro-soft" },
};

export function CareIcon({ type, size = 48 }: { type: CareType; size?: number }) {
  const m = CARE_META[type];
  return (
    <span className={`grid shrink-0 place-items-center rounded-2xl ${m.bg} ${m.fg}`} style={{ width: size, height: size }} aria-hidden>
      <m.Icon size={size * 0.5} strokeWidth={2.2} />
    </span>
  );
}
