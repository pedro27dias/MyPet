/**
 * Agenda: transforma os cuidados (regras) + registros (o que foi feito) em tarefas com dia e hora.
 * Nada disso é guardado: é sempre calculado.
 *
 * - Horários fixos (horas/diaria/semanal/dias): cada horário da regra é uma tarefa. Doses
 *   esquecidas de dias anteriores NÃO viram atraso (só as de hoje).
 * - Contados a partir da última vez (meses/anos) e "uma vez" (unica): a tarefa é "proxima_em".
 *   Se passou do dia, fica atrasada até alguém resolver.
 */
import type { Care, CareRecord, CareType } from "./types";
import { addDays, addMonths, atTime, daysBetween, parseDate, startOfDay } from "./dates";

/** Tolerância antes de uma tarefa de hoje virar "atrasada". */
export const LATE_AFTER_MIN = 30;

const ANCHORED = new Set(["horas", "diaria", "semanal", "dias"]);

export function isAnchored(care: Pick<Care, "freq">): boolean {
  return ANCHORED.has(care.freq);
}

export type OccurrenceState = "pendente" | "atrasada" | "feito" | "pulado";

export interface Occurrence {
  /** careId|ms — identifica a tarefa na tela */
  id: string;
  care: Care;
  /** Horário original da regra (ISO): é a "ocorrência" gravada no registro. */
  key: string;
  /** Quando deve ser feita (horário original ou adiado). */
  due: Date;
  snoozed: boolean;
  state: OccurrenceState;
  /** Registro que resolveu (feito/pulado). */
  record: CareRecord | null;
}

/** Horários de uma regra fixa dentro de [from, to). */
export function slotsBetween(care: Care, from: Date, to: Date): Date[] {
  if (!care.active || !isAnchored(care)) return [];
  const start = parseDate(care.start);
  const endLimit = care.end ? addDays(parseDate(care.end), 1) : null;
  const limit = endLimit && endLimit < to ? endLimit : to;
  const out: Date[] = [];
  const times = care.times.length ? [...care.times].sort() : ["09:00"];

  if (care.freq === "horas") {
    const base = atTime(start, times[0]).getTime();
    const step = Math.max(1, care.interval) * 3_600_000;
    let k = Math.max(0, Math.ceil((from.getTime() - base) / step));
    for (let t = base + k * step; t < limit.getTime(); t = base + ++k * step) out.push(new Date(t));
    return out;
  }

  const every = care.freq === "semanal" ? 7 * Math.max(1, care.interval) : care.freq === "dias" ? Math.max(1, care.interval) : 1;
  for (let day = startOfDay(from); day < limit; day = addDays(day, 1)) {
    const n = daysBetween(start, day);
    if (n < 0 || n % every !== 0) continue;
    for (const t of times) {
      const slot = atTime(day, t);
      if (slot >= from && slot < limit) out.push(slot);
    }
  }
  return out;
}

function groupRecords(records: CareRecord[]) {
  const map = new Map<string, CareRecord[]>();
  for (const r of records) {
    const k = `${r.careId}|${new Date(r.occurrence).getTime()}`;
    const list = map.get(k);
    if (list) list.push(r);
    else map.set(k, [r]);
  }
  return map;
}

function latest(list: CareRecord[] | undefined, pred: (r: CareRecord) => boolean) {
  let best: CareRecord | null = null;
  for (const r of list ?? []) if (pred(r) && (!best || r.createdAt > best.createdAt)) best = r;
  return best;
}

function build(care: Care, key: Date, recs: CareRecord[] | undefined, now: Date): Occurrence {
  const record = latest(recs, (r) => r.status === "feito" || r.status === "pulado");
  const snooze = latest(recs, (r) => r.status === "adiado" && !!r.snoozedTo);
  const due = snooze?.snoozedTo ? new Date(snooze.snoozedTo) : key;
  let state: OccurrenceState = record ? (record.status as "feito" | "pulado") : "pendente";
  if (state === "pendente" && due.getTime() < now.getTime() - LATE_AFTER_MIN * 60_000) state = "atrasada";
  return {
    id: `${care.id}|${key.getTime()}`,
    care,
    key: key.toISOString(),
    due,
    snoozed: !!snooze,
    state,
    record,
  };
}

/** Todas as tarefas cujo dia cai em [from, to). */
export function occurrencesBetween(
  cares: Care[],
  records: CareRecord[],
  from: Date,
  to: Date,
  now = new Date(),
): Occurrence[] {
  const byKey = groupRecords(records);
  const out: Occurrence[] = [];
  for (const care of cares) {
    if (isAnchored(care)) {
      const born = care.createdAt ? new Date(care.createdAt).getTime() : 0;
      for (const slot of slotsBetween(care, from, to)) {
        if (slot.getTime() < born) continue; // horário anterior ao cadastro do lembrete
        out.push(build(care, slot, byKey.get(`${care.id}|${slot.getTime()}`), now));
      }
      continue;
    }
    const keys = new Map<number, Date>();
    if (care.active && care.nextAt) keys.set(new Date(care.nextAt).getTime(), new Date(care.nextAt));
    // Já resolvidas neste período (a próxima data andou, mas a tarefa feita continua aparecendo).
    for (const r of records) {
      if (r.careId !== care.id || r.status === "adiado") continue;
      const when = new Date(r.doneAt ?? r.occurrence);
      if (when >= from && when < to) keys.set(new Date(r.occurrence).getTime(), new Date(r.occurrence));
    }
    for (const key of keys.values()) {
      const occ = build(care, key, byKey.get(`${care.id}|${key.getTime()}`), now);
      const when = occ.record ? new Date(occ.record.doneAt ?? occ.key) : occ.due;
      if (when >= from && when < to) out.push(occ);
    }
  }
  return out.sort((a, b) => sortTime(a) - sortTime(b));
}

function sortTime(o: Occurrence) {
  return o.record?.doneAt ? new Date(o.record.doneAt).getTime() : o.due.getTime();
}

export function dayOccurrences(cares: Care[], records: CareRecord[], day: Date, now = new Date()) {
  const from = startOfDay(day);
  return occurrencesBetween(cares, records, from, addDays(from, 1), now);
}

/**
 * Atrasadas: de hoje, passadas da tolerância; e as de data (vacina, vermífugo...) que venceram
 * em qualquer dia anterior e ninguém resolveu.
 */
export function overdueOccurrences(cares: Care[], records: CareRecord[], now = new Date()): Occurrence[] {
  const byKey = groupRecords(records);
  const today = dayOccurrences(cares, records, now, now).filter((o) => o.state === "atrasada");
  const older: Occurrence[] = [];
  for (const care of cares) {
    if (isAnchored(care) || !care.active || !care.nextAt) continue;
    const key = new Date(care.nextAt);
    const occ = build(care, key, byKey.get(`${care.id}|${key.getTime()}`), now);
    if (occ.state === "atrasada" && occ.due < startOfDay(now)) older.push(occ);
  }
  return [...older.sort((a, b) => a.due.getTime() - b.due.getTime()), ...today];
}

const APPOINTMENT_TYPES: CareType[] = ["consulta", "vacina"];

/** Próximo compromisso (consulta, cirurgia, exame ou vacina) que ainda vai acontecer. */
export function nextAppointment(cares: Care[], records: CareRecord[], now = new Date()): Occurrence | null {
  const byKey = groupRecords(records);
  let best: Occurrence | null = null;
  for (const care of cares) {
    if (!APPOINTMENT_TYPES.includes(care.type) || isAnchored(care) || !care.active || !care.nextAt) continue;
    const key = new Date(care.nextAt);
    const occ = build(care, key, byKey.get(`${care.id}|${key.getTime()}`), now);
    if (occ.state !== "pendente") continue;
    if (!best || occ.due < best.due) best = occ;
  }
  return best;
}

/**
 * Próxima data depois de resolver uma tarefa contada a partir da última vez.
 * Feito: a partir do dia em que foi feito. Pulado: a partir da data que estava marcada.
 */
export function nextAfter(care: Care, base: Date): string | null {
  if (care.freq !== "meses" && care.freq !== "anos") return null;
  const months = care.freq === "anos" ? 12 * care.interval : care.interval;
  return atTime(addMonths(startOfDay(base), months), care.times[0] ?? "09:00").toISOString();
}

/** Texto da frequência: "Todo dia às 8h e 20h", "A cada 3 meses"... */
export function freqText(care: Pick<Care, "freq" | "interval" | "times">): string {
  const times = care.times.map((t) => t.replace(/^0/, "").replace(":00", "h").replace(":", "h"));
  const at = times.length ? ` às ${times.join(" e ")}` : "";
  const n = care.interval;
  switch (care.freq) {
    case "unica":
      return "Uma vez";
    case "horas":
      return `A cada ${n} ${n === 1 ? "hora" : "horas"}`;
    case "diaria":
      return `Todo dia${at}`;
    case "semanal":
      return n === 1 ? `Toda semana${at}` : `A cada ${n} semanas${at}`;
    case "dias":
      return n === 1 ? `Todo dia${at}` : `A cada ${n} dias${at}`;
    case "meses":
      return n === 1 ? "Todo mês" : `A cada ${n} meses`;
    case "anos":
      return n === 1 ? "Uma vez por ano" : `A cada ${n} anos`;
  }
}

/** Próxima vez de um cuidado a partir de agora (para listas). */
export function nextDue(care: Care, records: CareRecord[], now = new Date()): Date | null {
  if (!care.active) return null;
  if (!isAnchored(care)) return care.nextAt ? new Date(care.nextAt) : null;
  const occ = occurrencesBetween([care], records, startOfDay(now), addDays(startOfDay(now), 60), now);
  const pending = occ.find((o) => o.state === "pendente" || o.state === "atrasada");
  return pending?.due ?? null;
}
