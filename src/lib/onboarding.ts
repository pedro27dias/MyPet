/**
 * Anamnese (cadastro do cachorro) e a agenda sugerida a partir das respostas.
 * As sugestões são pontos de partida comuns; tudo é editável e o app sempre lembra de
 * seguir a orientação do veterinário.
 */
import type { Care, CareType, FelvTest, FoodType, Freq, Lifestyle, Origin, OtherAnimal, PetFields, Sex, Size, Species } from "./types";
import { addDays, addMonths, ageInDays, atTime, birthFromAge, parseDate, startOfDay, toDateStr, todayStr } from "./dates";

export type VaccineKey = "v10" | "raiva" | "gripe" | "giardia" | "leish";

export const VACCINES: { key: VaccineKey; label: string; hint: string }[] = [
  { key: "v10", label: "V8 / V10", hint: "Polivalente" },
  { key: "raiva", label: "Antirrábica", hint: "Raiva" },
  { key: "gripe", label: "Gripe canina", hint: "Tosse dos canis" },
  { key: "giardia", label: "Giárdia", hint: "" },
  { key: "leish", label: "Leishmaniose", hint: "" },
];

export type CatVaccineKey = "polivalente" | "raiva" | "felv";

/** Vacinas de gato (a antirrábica usa a mesma chave "raiva" do cachorro). */
export const CAT_VACCINES: { key: CatVaccineKey; label: string; hint: string }[] = [
  { key: "polivalente", label: "V3, V4 ou V5", hint: "Polivalente" },
  { key: "raiva", label: "Antirrábica", hint: "Raiva" },
  { key: "felv", label: "FeLV", hint: "Leucemia felina (dose isolada)" },
];

export function vaccinesFor(species: Species | null | undefined): { key: VaccineKey | CatVaccineKey; label: string; hint: string }[] {
  return species === "gato" ? CAT_VACCINES : VACCINES;
}

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
  /** null = ainda não respondeu (pular = cachorro) */
  species: Species | null;
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
  vaccines: Record<VaccineKey | CatVaccineKey, { done: boolean; last: string }>;
  dewormer: { last: string; product: string };
  flea: { method: FleaMethod | null; last: string };
  food: { brand: string; amount: string; type: FoodType | null };
  // Só gatos
  lifestyle: Lifestyle | null;
  otherAnimals: OtherAnimal[];
  felv: { test: FelvTest | null; date: string };
  /** Plano de saúde (pergunta opcional no fim) */
  plan: { has: boolean | null; operator: string; name: string; card: string; phone: string };
  vet: { name: string; phone: string };
  inviteTutor: boolean | null;
}

export function emptyAnswers(): Answers {
  return {
    species: null,
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
      polivalente: { done: false, last: "" },
      felv: { done: false, last: "" },
    },
    dewormer: { last: "", product: "" },
    flea: { method: null, last: "" },
    food: { brand: "", amount: "", type: null },
    vet: { name: "", phone: "" },
    inviteTutor: null,
    lifestyle: null,
    otherAnimals: [],
    felv: { test: null, date: "" },
    plan: { has: null, operator: "", name: "", card: "", phone: "" },
  };
}

export const isCat = (a: Pick<Answers, "species">) => a.species === "gato";

const clean = (s: string) => (s.trim() ? s.trim() : null);

export function answersBirth(a: Answers): { birth: string | null; approx: boolean } {
  if (a.birthMode === "data") return { birth: a.birth || null, approx: false };
  if (!a.ageAnswered) return { birth: null, approx: false };
  return { birth: birthFromAge(a.ageYears, a.ageMonths), approx: true };
}

export function toPetFields(a: Answers): PetFields {
  const { birth, approx } = answersBirth(a);
  const cat = isCat(a);
  return {
    species: cat ? "gato" : "cachorro",
    lifestyle: cat ? a.lifestyle : null,
    otherAnimals: cat && a.otherAnimals.length ? a.otherAnimals : null,
    felvTest: cat ? a.felv.test : null,
    foodType: cat ? a.food.type : null,
    name: a.name.trim(),
    breed: a.breed,
    sex: a.sex,
    birth,
    birthApprox: approx,
    size: cat ? null : a.size,
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
  if (isCat(a)) return suggestCatCares(a, petId);
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
    const title = a.flea.method === "coleira" ? "Coleira" : a.flea.method === "comprimido" ? "Comprimido antipulgas" : "Pipeta antipulgas";
    const care = datedCare(petId, a.flea.method === "coleira" ? "coleira" : "antipulgas", title, "meses", months, d);
    if (a.flea.method === "coleira") Object.assign(care, { protects: ["pulgas", "carrapatos"], notifyBeforeMin: 7 * 1440 });
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

  const med = medSuggestion(a, petId);
  if (med) out.push(med);

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

/** Remédio contínuo informado no cadastro (cachorro ou gato). */
function medSuggestion(a: Answers, petId: string): Suggestion | null {
  if (!a.usesMed || !a.med.name.trim()) return null;
  const c = blankCare(petId, "remedio", a.med.name.trim());
  c.detail = clean(a.med.dose);
  c.freq = a.med.freq;
  c.interval = Math.max(1, a.med.interval || 1);
  c.times = a.med.times.length ? a.med.times : ["08:00"];
  c.start = a.med.start || todayStr();
  c.end = a.med.end || null;
  c.nextAt = a.med.freq === "unica" ? atTime(c.start, c.times[0]).toISOString() : null;
  return { care: c, reason: "Remédio contínuo informado no cadastro.", enabled: true, lastDone: null };
}

// ---------------------------------------------------------------------------------------------
// Gatos (pontos de partida das diretrizes WSAVA, AAHA/AAFP e ESCCAP; tudo editável)
// ---------------------------------------------------------------------------------------------

/** Gato sênior a partir de 10 anos. */
export const CAT_SENIOR_YEARS = 10;

export const FLEA_CAT_NOTE = "Use apenas produto indicado para gatos.";

function suggestCatCares(a: Answers, petId: string): Suggestion[] {
  const today = startOfDay(new Date());
  const { birth } = answersBirth(a);
  const born = birth ? parseDate(birth) : null;
  const ageDays = ageInDays(birth);
  const kitten = ageDays !== null && ageDays < 120; // até ~16 semanas: série de vacinas
  const young = ageDays !== null && ageDays < 183; // até 6 meses
  const weaning = ageDays !== null && ageDays < 56; // até ~8 semanas
  const senior = ageDays !== null && ageDays >= CAT_SENIOR_YEARS * 365;
  const goesOut = a.lifestyle === "as_vezes" || a.lifestyle === "sempre";
  const out: Suggestion[] = [];
  const push = (care: Care, reason: string, late: boolean, lastDone: string | null, enabled = true) =>
    out.push({ care, reason: late ? `Já venceu. ${reason}` : reason, enabled, lastDone });

  // Polivalente (V3/V4/V5): sempre
  {
    const ans = a.vaccines.polivalente;
    const last = ans.done && ans.last ? parseDate(ans.last) : null;
    let date: Date;
    let reason: string;
    if (kitten) {
      date = last ? addDays(last, 21) : born ? addDays(born, 56) : today;
      reason = last
        ? "Filhote: próxima dose da série 3 a 4 semanas depois da última, até 16 semanas ou mais."
        : "Filhote: a série começa entre 6 e 8 semanas de vida.";
    } else if (last) {
      date = addMonths(last, 12);
      reason = "Reforço a partir da última dose. O veterinário pode espaçar conforme o risco.";
    } else {
      date = addDays(today, 7);
      reason = ans.done ? "Sem a data da última dose: confirme com o veterinário." : "Não sabemos de dose anterior: vale marcar com o veterinário.";
    }
    const { date: d, late } = notBefore(date, today);
    const care = datedCare(petId, "vacina", "Vacina polivalente", "anos", 1, d);
    care.detail = "V3, V4 ou V5";
    if (kitten) care.note = "Filhote: doses a cada 3–4 semanas até 16 semanas ou mais, e um reforço por volta dos 6 meses. Ajuste com o veterinário.";
    push(care, reason, late, ans.done && ans.last ? ans.last : null);

    // Reforço por volta dos 6 meses (filhote com data de nascimento)
    if (kitten && born) {
      const r = datedCare(petId, "vacina", "Vacina polivalente (reforço dos 6 meses)", "unica", 1, addMonths(born, 6));
      r.detail = "V3, V4 ou V5";
      push(r, "Reforço da polivalente por volta dos 6 meses de vida.", false, null);
    }
  }

  // Antirrábica: sempre (a partir de 12 semanas; depois anual)
  {
    const ans = a.vaccines.raiva;
    const last = ans.done && ans.last ? parseDate(ans.last) : null;
    let date: Date;
    let reason: string;
    if (kitten && !last) {
      date = born ? addDays(born, 84) : addDays(today, 30);
      reason = "A antirrábica é dada a partir de 12 semanas de vida.";
    } else if (last) {
      date = addMonths(last, 12);
      reason = "Reforço uma vez por ano, a partir da última dose.";
    } else {
      date = addDays(today, 7);
      reason = ans.done ? "Sem a data da última dose: confirme com o veterinário." : "Não sabemos de dose anterior: vale marcar com o veterinário.";
    }
    const { date: d, late } = notBefore(date, today);
    push(datedCare(petId, "vacina", "Vacina antirrábica", "anos", 1, d), reason, late, ans.done && ans.last ? ans.last : null);
  }

  // FeLV isolada: só se já foi feita
  if (a.vaccines.felv.done) {
    const ans = a.vaccines.felv;
    const last = ans.last ? parseDate(ans.last) : null;
    const date = last ? addMonths(last, 12) : addDays(today, 7);
    const { date: d, late } = notBefore(date, today);
    push(
      datedCare(petId, "vacina", "Vacina FeLV", "anos", 1, d),
      last ? "Reforço conforme o veterinário (mais importante para quem sai de casa ou convive com outros gatos)." : "Sem a data da última dose: confirme com o veterinário.",
      late,
      ans.last || null,
    );
  }

  // Teste FeLV/FIV: se não fez (ou não sabe), conversar com o vet
  if (a.felv.test === "nao_fez" || a.felv.test === "nao_sei") {
    const care = datedCare(petId, "consulta", "Conversar com o vet sobre teste FeLV/FIV", "unica", 1, addDays(today, 14));
    push(care, "O teste mostra se o gato tem FeLV ou FIV, doenças que passam entre gatos.", false, null);
  }

  // Vermífugo
  {
    const last = a.dewormer.last ? parseDate(a.dewormer.last) : null;
    let interval: number;
    let base: string;
    let first: Date;
    if (weaning) {
      interval = 1;
      base = "Filhote: a partir de 3 semanas, a cada 2 semanas até o desmame; depois, todo mês até os 6 meses.";
      first = last ? addDays(last, 14) : born ? addDays(born, 21) : addDays(today, 3);
    } else if (young) {
      interval = 1;
      base = "Filhote: todo mês até os 6 meses.";
      first = last ? addMonths(last, 1) : addDays(today, 3);
    } else if (a.lifestyle === "dentro") {
      interval = 6;
      base = "Só dentro de casa: 1 a 2 vezes por ano costuma bastar.";
      first = last ? addMonths(last, 6) : addDays(today, 3);
    } else {
      interval = 3;
      base = goesOut ? "Sai para a rua ou caça: a cada 1 a 3 meses." : "A cada 3 meses é um bom começo; ajuste com o veterinário.";
      first = last ? addMonths(last, 3) : addDays(today, 3);
    }
    const { date: d, late } = notBefore(first, today);
    const care = datedCare(petId, "vermifugo", "Vermífugo", "meses", interval, d);
    care.detail = clean(a.dewormer.product);
    if (weaning) care.note = "Até o desmame (~8 semanas), o comum é a cada 2 semanas. Ajuste com o veterinário.";
    push(care, last || late ? base : `Sem data do último. ${base}`, late, a.dewormer.last || null);
  }

  // Pulgas (sempre produto para gatos)
  if (a.flea.method && a.flea.method !== "nenhuma") {
    const months = a.flea.method === "coleira" ? 6 : 1;
    const last = a.flea.last ? parseDate(a.flea.last) : null;
    const date = last ? addMonths(last, months) : addDays(today, 3);
    const { date: d, late } = notBefore(date, today);
    const title = a.flea.method === "coleira" ? "Coleira" : a.flea.method === "comprimido" ? "Comprimido antipulgas" : "Pipeta antipulgas";
    const care = datedCare(petId, a.flea.method === "coleira" ? "coleira" : "antipulgas", title, "meses", months, d);
    if (a.flea.method === "coleira") Object.assign(care, { protects: ["pulgas"], notifyBeforeMin: 7 * 1440 });
    care.note = FLEA_CAT_NOTE;
    push(care, `${months === 1 ? "Todo mês" : `A cada ${months} meses`}: confira na embalagem. ${FLEA_CAT_NOTE}`, late, a.flea.last || null);
  } else if (a.flea.method === "nenhuma") {
    const care = datedCare(petId, "antipulgas", "Proteção contra pulgas", "meses", 1, addDays(today, 7));
    care.note = FLEA_CAT_NOTE;
    push(care, `Sem proteção hoje: escolha com o veterinário. ${FLEA_CAT_NOTE}`, false, null, goesOut);
  }

  const med = medSuggestion(a, petId);
  if (med) out.push(med);

  // Check-up: anual; a cada 6 meses a partir de 10 anos
  if (!kitten) {
    const care = datedCare(petId, "consulta", "Check-up no veterinário", senior ? "meses" : "anos", senior ? 6 : 1, addDays(today, 30));
    push(
      care,
      senior ? "A partir dos 10 anos, o comum é um check-up a cada 6 meses, com exames de rotina." : "Uma consulta de rotina por ano ajuda a prevenir problemas.",
      false,
      null,
    );
  }

  return out;
}

/** Teste FeLV/FIV já feito: vira um registro no cartão (seção Testes), com o resultado. */
export function felvTestRecord(a: Answers, petId: string): { care: Care; at: string; result: string } | null {
  if (!isCat(a) || (a.felv.test !== "negativo" && a.felv.test !== "positivo")) return null;
  const care = blankCare(petId, "exame", "Teste FeLV/FIV");
  care.nextAt = null;
  care.active = false;
  const day = a.felv.date || todayStr();
  return { care, at: atTime(day, "09:00").toISOString(), result: a.felv.test === "negativo" ? "Negativo" : "Positivo" };
}
