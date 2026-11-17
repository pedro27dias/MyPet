import type { Species } from "@/lib/types";
import { LogoMark } from "../shell/logo-mark";

/** Silhueta de gato sentado (com rabo), na cor do texto. */
export function CatSilhouette({ size = 40, className = "" }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} fill="currentColor" aria-hidden>
      <path d="M31 24 L33 5 L45 16 Q50 14.5 55 16 L67 5 L69 24 Q75 33 70 42 Q65 49.5 57 51 Q73 59 75 79 Q76.5 92 69 96 L31 96 Q23.5 92 25 79 Q27 59 43 51 Q35 49.5 30 42 Q25 33 31 24 Z" />
      <path d="M67 95 Q91 96 91 76 Q91 66 83 66 Q80 66 80 69 Q85 70 85 77 Q85 89 67 88 Z" />
    </svg>
  );
}

/** Ícone do pet conforme a espécie: cachorro correndo (logo) ou gato sentado. */
export function PetMark({ species, size = 40, className = "" }: { species?: Species | null; size?: number; className?: string }) {
  if (species === "gato") return <CatSilhouette size={size} className={className} />;
  return <LogoMark plain size={size} className={className} />;
}

/** "cachorro" / "gato" */
export function speciesWord(species?: Species | null) {
  return species === "gato" ? "gato" : "cachorro";
}
