/**
 * Anamnese (cadastro do cachorro) e a agenda sugerida a partir das respostas.
 * As sugestões são pontos de partida comuns; tudo é editável e o app sempre lembra de
 * seguir a orientação do veterinário.
 */
import type { Care, CareType, Freq, Origin, PetFields, Sex, Size } from "./types";
import { addDays, addMonths, ageInDays, atTime, birthFromAge, parseDate, startOfDay, toDateStr, todayStr } from "./dates";

export type VaccineKey = "v10" | "raiva" | "gripe" | "giardia" | "leish";

export const VACCINES: { key: VaccineKey; label: string; hint: string }[] = [
  { key: "v10", label: "V8 / V10", hint: "Polivalente" },
  { key: "raiva", label: "Antirrábica", hint: "Raiva" },
  { key: "gripe", label: "Gripe canina", hint: "Tosse dos canis" },
  { key: "giardia", label: "Giárdia", hint: "" },
  { key: "leish", label: "Leishmaniose", hint: "" },
];

export type FleaMethod = "coleira" | "comprimido" | "pipeta" | "nenhuma";

export interface MedAnswer {
  name: string;
  dose: string;
  freq: Freq;
  interval: number;
  times: string[];
  start: string;
  end: string;
}

export interface Answers {
  name: string;
  photo: Blob | null;
  photoPreview: string | null;
  breed: string | null;
  sex: Sex | null;
  birthMode: "data" | "idade";
  birth: string;
  ageYears: number;
  ageMonths: number;
  /** a pessoa respondeu a idade (anos/meses), mesmo que 0 anos */
  ageAnswered: boolean;
  size: Size | null;
  origin: Origin | null;
  neutered: "sim" | "nao" | "naosei" | null;
  hasDisease: boolean | null;
  disease: string;
  hasAllergy: boolean | null;
  allergy: string;
  usesMed: boolean | null;
  med: MedAnswer;
  vaccines: Record<VaccineKey, { done: boolean; last: string }>;
  dewormer: { last: string; product: string };
  flea: { method: FleaMethod | null; last: string };
  food: { brand: string; amount: string };
  vet: { name: string; phone: string };
  inviteTutor: boolean | null;
}

export function emptyAnswers(): Answers {
  return {
    name: "",
    photo: null,
    photoPreview: null,
    breed: null,
    sex: null,
    birthMode: "data",
    birth: "",
    ageYears: 0,
    ageMonths: 0,
    ageAnswered: false,
    size: null,
    origin: null,
    neutered: null,
    hasDisease: null,
    disease: "",
    hasAllergy: null,
    allergy: "",
    usesMed: null,
    med: { name: "", dose: "", freq: "diaria", interval: 1, times: ["08:00"], start: todayStr(), end: "" },
    vaccines: {
      v10: { done: false, last: "" },
      raiva: { done: false, last: "" },
      gripe: { done: false, last: "" },
      giardia: { done: false, last: "" },
      leish: { done: false, last: "" },
    },
    dewormer: { last: "", product: "" },
    flea: { method: null, last: "" },
    food: { brand: "", amount: "" },
    vet: { name: "", phone: "" },
    inviteTutor: null,
  };
}

const clean = (s: string) => (s.trim() ? s.trim() : null);

export function answersBirth(a: Answers): { birth: string | null; approx: boolean } {
  if (a.birthMode === "data") return { birth: a.birth || null, approx: false };
  if (!a.ageAnswered) return { birth: null, approx: false };
  return { birth: birthFromAge(a.ageYears, a.ageMonths), approx: true };
}

export function toPetFields(a: Answers): PetFields {
  const { birth, approx } = answersBirth(a);
  return {
    name: a.name.trim(),
    breed: a.breed,
    sex: a.sex,
    birth,
    birthApprox: approx,
    size: a.size,
    origin: a.origin,
    neutered: a.neutered === "sim" ? true : a.neutered === "nao" ? false : null,
    diseases: a.hasDisease ? clean(a.disease) ?? "Sim" : null,
    allergies: a.hasAllergy ? clean(a.allergy) ?? "Sim" : null,
    foodBrand: clean(a.food.brand),
    foodAmount: clean(a.food.amount),
    vetName: clean(a.vet.name),
    vetPhone: clean(a.vet.phone),
  };
}

export interface Suggestion {
  care: Care;
  /** Por que o app sugeriu esta data. */
  reason: string;
  enabled: boolean;
  /** Última vez informada na anamnese (vira histórico). */
  lastDone: string | null;
}

let idCounter = 0;
export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  idCounter++;
  return `00000000-0000-4000-8000-${String(Date.now() + idCounter).padStart(12, "0").slice(-12)}`;
}

export function blankCare(petId: string, type: CareType, title: string): Care {
  return {
    id: newId(),
    petId,
    type,
    title,
    detail: null,
    note: null,
    freq: "unica",
    interval: 1,
    times: ["09:00"],
    start: todayStr(),
    end: null,
    nextAt: atTime(todayStr(), "09:00").toISOString(),
    notifyBeforeMin: null,
    active: true,
    createdAt: new Date().toISOString(),
  };
}

const DAY = (d: Date) => toDateStr(d);

/** Usa a data calculada, mas nunca no passado: o que já venceu vai para hoje (e avisa). */
function notBefore(date: Date, today: Date): { date: Date; late: boolean } {
  return date < today ? { date: today, late: true } : { date, late: false };
}

function datedCare(petId: string, type: CareType, title: string, freq: Freq, interval: number, day: Date): Care {
  const c = blankCare(petId, type, title);
  c.freq = freq;
  c.interval = interval;
  c.nextAt = atTime(DAY(day), "09:00").toISOString();
  return c;
}

/** Monta a agenda sugerida. petId pode ser provisório (o app gera o id antes de gravar). */
export function suggestCares(a: Answers, petId: string): Suggestion[] {
  const today = startOfDay(new Date());
  const { birth } = answersBirth(a);
  const ageDays = ageInDays(birth);
  const puppy = ageDays !== null && ageDays < 120; // até ~4 meses: fase das primeiras doses
  const young = ageDays !== null && ageDays < 183; // até 6 meses
  const senior = ageDays !== null && ageDays >= 7 * 365;
  const out: Suggestion[] = [];

  // Vacinas: V8/V10 e antirrábica sempre; as outras se já foram feitas antes.
  for (const v of VACCINES) {
    const ans = a.vaccines[v.key];
    const essential = v.key === "v10" || v.key === "raiva";
    if (!essential && !ans.done) continue;
    const last = ans.done && ans.last ? parseDate(ans.last) : null;
    let date: Date;
    let reason: string;
    if (puppy && v.key === "v10") {
      date = last ? addDays(last, 21) : birth ? addDays(parseDate(birth), 45) : today;
      reason = last
        ? "Filhote: próxima dose da série cerca de 3 semanas depois da última."
        : "Filhote: a série costuma começar por volta de 45 dias de vida.";
    } else if (puppy && v.key === "raiva") {
      date = birth ? addDays(parseDate(birth), 84) : addDays(today, 30);
      reason = "A antirrábica costuma ser dada a partir de 12 semanas de vida.";
    } else if (last) {
      date = addMonths(last, 12);
      reason = "Reforço uma vez por ano, a partir da última dose.";
    } else {
      date = addDays(today, 7);
      reason = ans.done
        ? "Sem a data da última dose: confirme com o veterinário."
        : "Não sabemos de dose anterior: vale marcar com o veterinário.";
    }
    const { date: d, late } = notBefore(date, today);
    const care = datedCare(petId, "vacina", v.key === "v10" ? "Vacina V8/V10" : `Vacina ${v.label.toLowerCase()}`, "anos", 1, d);
    if (puppy && v.key === "v10") care.note = "Filhote: reforços a cada 3–4 semanas até ~16 semanas. Ajuste com o veterinário.";
    out.push({ care, reason: late ? `Já venceu. ${reason}` : reason, enabled: true, lastDone: ans.done && ans.last ? ans.last : null });
  }

  // Vermífugo
  {
    const interval = young ? 1 : 3;
    const last = a.dewormer.last ? parseDate(a.dewormer.last) : null;
    const date = last ? addMonths(last, interval) : addDays(today, 3);
    const { date: d, late } = notBefore(date, today);
    const care = datedCare(petId, "vermifugo", "Vermífugo", "meses", interval, d);
    care.detail = clean(a.dewormer.product);
    const base = young ? "Filhote: todo mês até os 6 meses." : "Adulto: a cada 3 meses é o mais comum.";
    out.push({
      care,
      reason: late ? `Já venceu. ${base}` : last ? base : `Sem data do último. ${base}`,
      enabled: true,
      lastDone: a.dewormer.last || null,
    });
  }

  // Pulgas e carrapatos
  if (a.flea.method && a.flea.method !== "nenhuma") {
    const months = a.flea.method === "coleira" ? 6 : 1;
    const last = a.flea.last ? parseDate(a.flea.last) : null;
    const date = last ? addMonths(last, months) : addDays(today, 3);
    const { date: d, late } = notBefore(date, today);
    const title = a.flea.method === "coleira" ? "Trocar coleira antipulgas" : a.flea.method === "comprimido" ? "Comprimido antipulgas" : "Pipeta antipulgas";
    const care = datedCare(petId, "antipulgas", title, "meses", months, d);
    out.push({
      care,
      reason: `${late ? "Já venceu. " : ""}${months === 1 ? "Todo mês" : `A cada ${months} meses`}: confira na embalagem quanto tempo protege.`,
      enabled: true,
      lastDone: a.flea.last || null,
    });
  } else if (a.flea.method === "nenhuma") {
    const care = datedCare(petId, "antipulgas", "Proteção contra pulgas e carrapatos", "meses", 1, addDays(today, 7));
    out.push({ care, reason: "Sem proteção hoje: vale escolher uma com o veterinário.", enabled: false, lastDone: null });
  }

  // Remédio contínuo
  if (a.usesMed && a.med.name.trim()) {
    const c = blankCare(petId, "remedio", a.med.name.trim());
    c.detail = clean(a.med.dose);
    c.freq = a.med.freq;
    c.interval = Math.max(1, a.med.interval || 1);
    c.times = a.med.times.length ? a.med.times : ["08:00"];
    c.start = a.med.start || todayStr();
    c.end = a.med.end || null;
    c.nextAt = a.med.freq === "unica" ? atTime(c.start, c.times[0]).toISOString() : null;
    out.push({ care: c, reason: "Remédio contínuo informado no cadastro.", enabled: true, lastDone: null });
  }

  // Check-up
  if (!puppy) {
    const care = datedCare(petId, "consulta", "Check-up no veterinário", senior ? "meses" : "anos", senior ? 6 : 1, addDays(today, 30));
    out.push({
      care,
      reason: senior ? "A partir dos 7 anos, o comum é um check-up a cada 6 meses." : "Uma consulta de rotina por ano ajuda a prevenir problemas.",
      enabled: true,
      lastDone: null,
    });
  }

  return out;
}
