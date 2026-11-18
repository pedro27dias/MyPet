"use client";

import { ChevronRight } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { collarProgress, collarText, lastPlaced, TARGETS, type CollarStatus } from "@/lib/collar";
import { fmtDate, fmtTimeShort } from "@/lib/dates";
import { nextAfter } from "@/lib/schedule";
import type { Care, CareRecord, Pet } from "@/lib/types";
import { useApp } from "../app-provider";
import { useToast } from "../ui/toast";

const RING: Record<CollarStatus, { stroke: string; text: string; bg: string }> = {
  ok: { stroke: "var(--forest)", text: "text-forest", bg: "bg-olive-soft" },
  perto: { stroke: "var(--pink-strong)", text: "text-pink-strong", bg: "bg-pink-soft" },
  vencida: { stroke: "var(--danger)", text: "text-danger", bg: "bg-danger-soft" },
};

/** Anel circular com os dias que faltam. */
export function CollarRing({ remaining, status, size = 92, children }: { remaining: number; status: CollarStatus; size?: number; children?: React.ReactNode }) {
  const stroke = size * 0.1;
  const r = (size - stroke) / 2;
  const len = 2 * Math.PI * r;
  return (
    <span className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={RING[status].stroke}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={len}
          initial={{ strokeDashoffset: len }}
          animate={{ strokeDashoffset: len * (1 - (status === "vencida" ? 1 : remaining)) }}
          transition={{ duration: 0.9, ease: [0.25, 0.8, 0.25, 1] }}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-center">{children}</span>
    </span>
  );
}

/** Card da coleira (aba Cuidados): anel, marca, proteção, quem trocou e "Troquei a coleira ✓". */
export function CollarCard({ care, records, onOpen }: { care: Care; records: CareRecord[]; onOpen: () => void }) {
  const { repo, reloadData, nameOf } = useApp();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const p = collarProgress(care);
  if (!p) return null;
  const s = RING[p.status];
  const last = records
    .filter((r) => r.careId === care.id && r.status === "feito")
    .sort((a, b) => (b.doneAt ?? b.occurrence).localeCompare(a.doneAt ?? a.occurrence))[0];
  const placed = lastPlaced(care, records);
  const targets = TARGETS.filter((t) => care.protects?.includes(t.value)).map((t) => (t.value === "leish" ? "Leishmaniose" : t.label));

  async function swap() {
    if (!care.nextAt) return;
    setBusy(true);
    try {
      const now = new Date();
      const res = await repo.complete({ care, occurrence: care.nextAt, status: "feito", doneAt: now.toISOString(), next: nextAfter(care, now) });
      if (!res.ok) {
        toast(`${res.already.byName} já trocou às ${fmtTimeShort(res.already.at)}.`, { tone: "info" });
      } else {
        repo.notifyDone(res.record.id).catch(() => {});
        toast("Coleira trocada ✓ Contagem reiniciada.");
      }
      await reloadData();
    } catch (e) {
      toast((e as Error).message, { tone: "erro" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-3xl bg-card p-4 shadow-card">
      <button type="button" onClick={onOpen} className="flex w-full items-center gap-4 text-left">
        <CollarRing remaining={p.remaining} status={p.status}>
          {p.status === "vencida" ? (
            <span className={`text-sm font-extrabold leading-tight ${s.text}`}>vencida</span>
          ) : (
            <span className="leading-none">
              <span className={`block text-2xl font-extrabold ${s.text}`}>{p.daysLeft}</span>
              <span className="text-[11px] font-bold text-muted">{p.daysLeft === 1 ? "dia" : "dias"}</span>
            </span>
          )}
        </CollarRing>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-lg font-bold text-forest">{care.title}</span>
          <span className={`block text-sm font-bold ${s.text}`}>
            {p.status === "vencida" ? collarText(p.daysLeft) : `faltam ${p.daysLeft} ${p.daysLeft === 1 ? "dia" : "dias"}`}
            <span className="font-normal text-muted"> · troca {fmtDate(care.nextAt!)}</span>
          </span>
          {targets.length > 0 && <span className="mt-0.5 block truncate text-xs text-muted">Contra {targets.join(", ").toLowerCase()}</span>}
          <span className="block truncate text-xs text-muted">
            Colocada em {fmtDate(placed)}
            {last?.by ? ` por ${nameOf(last.by)}` : ""}
          </span>
        </span>
        <ChevronRight size={18} className="shrink-0 text-faint" />
      </button>
      <motion.button
        type="button"
        whileTap={{ scale: 0.97 }}
        disabled={busy}
        onClick={swap}
        className={`mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-full font-bold transition disabled:opacity-60 ${
          p.status === "ok" ? "bg-bg text-forest ring-2 ring-line" : "bg-forest text-pink"
        }`}
      >
        {busy ? "Salvando..." : "Troquei a coleira ✓"}
      </motion.button>
    </div>
  );
}

/** Mini card do Início: "Coleira da Mimi: troca em 23 dias". */
export function CollarMini({ care, pet, onOpen }: { care: Care; pet: Pet; onOpen: () => void }) {
  const p = collarProgress(care);
  if (!p) return null;
  const s = RING[p.status];
  const de = pet.sex === "macho" ? "do" : pet.sex === "femea" ? "da" : "de";
  return (
    <button type="button" onClick={onOpen} className={`flex w-full items-center gap-3 rounded-3xl ${s.bg} p-3 text-left active:scale-[0.98]`}>
      <CollarRing remaining={p.remaining} status={p.status} size={44}>
        <span className={`text-xs font-extrabold ${s.text}`}>{p.status === "vencida" ? "!" : p.daysLeft}</span>
      </CollarRing>
      <span className="min-w-0 flex-1 font-bold text-forest">
        Coleira {de} {pet.name}: <span className={s.text}>{collarText(p.daysLeft)}</span>
      </span>
      <ChevronRight size={18} className="shrink-0 text-faint" />
    </button>
  );
}
