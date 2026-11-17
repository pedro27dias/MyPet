"use client";

import { Cat, TriangleAlert } from "lucide-react";
import { FLEA_CAT_NOTE } from "@/lib/onboarding";
import type { Species } from "@/lib/types";
import { useApp } from "../app-provider";

/**
 * Aviso de segurança do antipulgas:
 * - gato: "Use apenas produto indicado para gatos";
 * - cachorro numa conta que também tem gato: risco do produto de cachorro (permetrina) para o gato.
 */
export function FleaSafetyNote({ species }: { species: Species }) {
  const { pets } = useApp();
  if (species === "gato") {
    return (
      <p className="flex items-start gap-2 rounded-2xl bg-olive-soft px-4 py-3 text-sm font-semibold text-forest">
        <Cat size={18} className="mt-0.5 shrink-0 text-olive" />
        {FLEA_CAT_NOTE} Produto de cachorro pode intoxicar gatos.
      </p>
    );
  }
  if (!pets.some((p) => p.species === "gato")) return null;
  return (
    <p role="alert" className="flex items-start gap-2 rounded-2xl bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">
      <TriangleAlert size={18} className="mt-0.5 shrink-0" />
      Você tem gato em casa. Confirme com o vet se o produto do cachorro é seguro para o gato (evite permetrina).
    </p>
  );
}
