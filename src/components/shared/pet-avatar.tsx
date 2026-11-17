/* eslint-disable @next/next/no-img-element -- foto vem de link temporário do Storage ou do aparelho */
import { Cat, Dog } from "lucide-react";
import type { Species } from "@/lib/types";

/** Foto do pet em círculo (ou um cachorrinho/gatinho, se não tiver foto). */
export function PetAvatar({ url, size = 48, ring = false, species }: { url: string | null; size?: number; ring?: boolean; species?: Species | null }) {
  const Icon = species === "gato" ? Cat : Dog;
  return (
    <span
      className={`grid shrink-0 place-items-center overflow-hidden rounded-full bg-peach-soft text-peach ${ring ? "ring-4 ring-card" : ""}`}
      style={{ width: size, height: size }}
    >
      {url ? <img src={url} alt="" className="size-full object-cover" /> : <Icon size={size * 0.52} strokeWidth={2} />}
    </span>
  );
}
