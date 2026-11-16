/* eslint-disable @next/next/no-img-element -- foto vem de link temporário do Storage ou do aparelho */
import { Dog } from "lucide-react";

/** Foto do pet em círculo (ou um cachorrinho, se não tiver foto). */
export function PetAvatar({ url, size = 48, ring = false }: { url: string | null; size?: number; ring?: boolean }) {
  return (
    <span
      className={`grid shrink-0 place-items-center overflow-hidden rounded-full bg-peach-soft text-peach ${ring ? "ring-4 ring-card" : ""}`}
      style={{ width: size, height: size }}
    >
      {url ? <img src={url} alt="" className="size-full object-cover" /> : <Dog size={size * 0.52} strokeWidth={2} />}
    </span>
  );
}
