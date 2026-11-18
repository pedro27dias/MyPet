/**
 * Coleira (cães e gatos): marcas comuns, duração, idade mínima e regras de segurança.
 * A duração e a idade mínima são pontos de partida editáveis: o app sempre pede para conferir
 * na embalagem.
 */
import type { Care, CareRecord, CollarTarget, Species } from "./types";
import { addMonths, ageInDays, daysBetween, startOfDay } from "./dates";
import { normalize } from "./breeds";

export interface CollarBrand {
  name: string;
  /** Duração em meses (null = a pessoa digita) */
  months: number | null;
  /** Idade mínima em semanas (null = não sabemos) */
  minWeeks: number | null;
}

export const DOG_BRANDS: CollarBrand[] = [
  { name: "Seresto", months: 8, minWeeks: 7 },
  { name: "Scalibor", months: 4, minWeeks: 7 },
  { name: "Leevre", months: null, minWeeks: null },
  { name: "EctoFend", months: null, minWeeks: null },
];

export const CAT_BRANDS: CollarBrand[] = [{ name: "Seresto", months: 8, minWeeks: 10 }];

export function brandsFor(species: Species): CollarBrand[] {
  return species === "gato" ? CAT_BRANDS : DOG_BRANDS;
}

export const TARGETS: { value: CollarTarget; label: string }[] = [
  { value: "leish", label: "Mosquito-palha / leishmaniose" },
  { value: "pulgas", label: "Pulgas" },
  { value: "carrapatos", label: "Carrapatos" },
];

export const LEISH_CAT_TEXT = "Coleiras contra mosquito-palha são de uso exclusivo em cães e podem ser tóxicas para gatos";
export const CAT_DANGER_TEXT = "Este produto é para cães e pode intoxicar gatos. Não use. Fale com seu veterinário.";
export const HOUSE_CAT_TEXT = "Você tem gato em casa. Converse com o vet sobre o contato do gato com o cachorro usando essa coleira.";
export const OVERLAP_TEXT = "Já existe uma coleira ativa. Confirme com o veterinário se pode usar os dois juntos.";
export const START_TEXT = "A proteção completa pode levar algumas semanas para começar. Confira na bula.";

/** Coleira de cão com deltametrina/permetrina (ou marca conhecida por isso): perigosa para gatos. */
export function isDogOnlyCollar(text: string | null | undefined): boolean {
  const n = normalize(text ?? "");
  return /scalibor|leevre|ectofend|deltametrin|permetrin/.test(n);
}

/** Data da última colocação (último "feito") ou o início do lembrete. */
export function lastPlaced(care: Care, records: CareRecord[]): Date {
  const done = records
    .filter((r) => r.careId === care.id && r.status === "feito")
    .map((r) => new Date(r.doneAt ?? r.occurrence))
    .sort((a, b) => b.getTime() - a.getTime())[0];
  return done ?? new Date(`${care.start}T09:00:00`);
}

export type CollarStatus = "ok" | "perto" | "vencida";

export interface CollarProgress {
  daysLeft: number;
  totalDays: number;
  /** 0..1 (quanto ainda resta) */
  remaining: number;
  status: CollarStatus;
}

export function collarProgress(care: Care, now = new Date()): CollarProgress | null {
  if (!care.nextAt) return null;
  const end = startOfDay(new Date(care.nextAt));
  // a contagem começa na colocação: próxima troca menos a duração
  const start = startOfDay(addMonths(end, -(care.freq === "anos" ? 12 : 1) * Math.max(1, care.interval)));
  const totalDays = Math.max(1, daysBetween(start, end));
  const daysLeft = daysBetween(startOfDay(now), end);
  const remaining = Math.min(1, Math.max(0, daysLeft / totalDays));
  const status: CollarStatus = daysLeft < 0 ? "vencida" : daysLeft < 15 ? "perto" : "ok";
  return { daysLeft, totalDays, remaining, status };
}

/** "troca em 23 dias" / "troca hoje" / "venceu há 3 dias" */
export function collarText(daysLeft: number): string {
  if (daysLeft > 1) return `troca em ${daysLeft} dias`;
  if (daysLeft === 1) return "troca amanhã";
  if (daysLeft === 0) return "troca hoje";
  return `venceu há ${-daysLeft} ${daysLeft === -1 ? "dia" : "dias"}`;
}

/** O pet é mais novo que a idade mínima da marca? */
export function tooYoung(birth: string | null, minWeeks: number | null | undefined): boolean {
  if (!minWeeks) return false;
  const days = ageInDays(birth);
  return days !== null && days < minWeeks * 7;
}

/** Coleiras ativas que protegem contra pulgas ou carrapatos. */
export function activeFleaCollars(cares: Care[], petId: string): Care[] {
  return cares.filter(
    (c) => c.petId === petId && c.type === "coleira" && c.active && (!c.protects?.length || c.protects.some((p) => p === "pulgas" || p === "carrapatos")),
  );
}
