/** Datas sempre no horário do celular. Dias em texto AAAA-MM-DD. */

const pad = (n: number) => String(n).padStart(2, "0");

export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** "AAAA-MM-DD" → meia-noite local (evita o erro de fuso do new Date("AAAA-MM-DD")). */
export function parseDate(s: string): Date {
  const [y, m, d] = s.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function todayStr(): string {
  return toDateStr(new Date());
}

/** Dia + "HH:MM" → data local. */
export function atTime(day: string | Date, time: string): Date {
  const d = typeof day === "string" ? parseDate(day) : new Date(day);
  const [h, m] = (time || "09:00").split(":").map(Number);
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}

export function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

/** Soma meses sem pular para o mês seguinte (31/01 + 1 mês = 28/02). */
export function addMonths(d: Date, n: number): Date {
  const r = new Date(d);
  const day = r.getDate();
  r.setDate(1);
  r.setMonth(r.getMonth() + n);
  const last = new Date(r.getFullYear(), r.getMonth() + 1, 0).getDate();
  r.setDate(Math.min(day, last));
  return r;
}

/** Segunda-feira da semana. */
export function startOfWeek(d: Date): Date {
  const r = startOfDay(d);
  const dow = (r.getDay() + 6) % 7;
  return addDays(r, -dow);
}

export function daysBetween(a: Date, b: Date): number {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / 86_400_000);
}

export function sameDay(a: Date, b: Date): boolean {
  return toDateStr(a) === toDateStr(b);
}

export function fmtTime(d: Date | string): string {
  const x = typeof d === "string" ? new Date(d) : d;
  return `${pad(x.getHours())}:${pad(x.getMinutes())}`;
}

/** "08:00" → "8h", "07:40" → "7h40" */
export function fmtTimeShort(d: Date | string): string {
  const x = typeof d === "string" ? new Date(d) : d;
  const m = x.getMinutes();
  return `${x.getHours()}h${m ? pad(m) : ""}`;
}

const WEEKDAYS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
const WEEKDAYS_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export function weekdayShort(d: Date): string {
  return WEEKDAYS_SHORT[d.getDay()];
}

export function weekdayLong(d: Date): string {
  return WEEKDAYS[d.getDay()];
}

/** "18 nov" ou "18 nov 2027" se for outro ano. */
export function fmtDate(d: Date | string): string {
  const x = typeof d === "string" ? (d.length === 10 ? parseDate(d) : new Date(d)) : d;
  const year = x.getFullYear() !== new Date().getFullYear() ? ` ${x.getFullYear()}` : "";
  return `${x.getDate()} ${MONTHS[x.getMonth()]}${year}`;
}

/** "hoje", "amanhã", "ontem", "em 3 dias", "há 2 dias", ou a data. */
export function fmtRelativeDay(d: Date | string): string {
  const x = typeof d === "string" ? new Date(d) : d;
  const n = daysBetween(new Date(), x);
  if (n === 0) return "hoje";
  if (n === 1) return "amanhã";
  if (n === -1) return "ontem";
  if (n > 1 && n <= 6) return `${weekdayLong(x)}`;
  if (n < -1 && n >= -30) return `há ${-n} dias`;
  return fmtDate(x);
}

/** Idade: "2 anos e 3 meses", "5 meses", "3 semanas". */
export function ageText(birth: string | null): string | null {
  if (!birth) return null;
  const b = parseDate(birth);
  const now = new Date();
  let months = (now.getFullYear() - b.getFullYear()) * 12 + (now.getMonth() - b.getMonth());
  if (now.getDate() < b.getDate()) months--;
  if (months < 0) return null;
  if (months < 2) {
    const w = Math.max(0, Math.floor(daysBetween(b, now) / 7));
    return w === 1 ? "1 semana" : `${w} semanas`;
  }
  const y = Math.floor(months / 12);
  const m = months % 12;
  const ys = y === 1 ? "1 ano" : `${y} anos`;
  const ms = m === 1 ? "1 mês" : `${m} meses`;
  if (y === 0) return ms;
  return m ? `${ys} e ${ms}` : ys;
}

export function ageInDays(birth: string | null): number | null {
  if (!birth) return null;
  return daysBetween(parseDate(birth), new Date());
}

/** Data de nascimento a partir da idade aproximada. */
export function birthFromAge(years: number, months: number): string {
  return toDateStr(addMonths(startOfDay(new Date()), -(years * 12 + months)));
}

export function greeting(d = new Date()): string {
  const h = d.getHours();
  if (h < 5) return "Boa noite";
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

const MONTHS_LONG = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

/** "17 de fevereiro de 2027 (quarta)" */
export function fmtLongDate(d: Date | string): string {
  const x = typeof d === "string" ? (d.length === 10 ? parseDate(d) : new Date(d)) : d;
  return `${x.getDate()} de ${MONTHS_LONG[x.getMonth()]} de ${x.getFullYear()} (${weekdayLong(x)})`;
}

/** "Novembro 2026" */
export function monthLabel(d: Date): string {
  const m = MONTHS_LONG[d.getMonth()];
  return `${m.charAt(0).toUpperCase()}${m.slice(1)} ${d.getFullYear()}`;
}

export type PeriodUnit = "dias" | "semanas" | "meses" | "anos";

/** Data + N dias/semanas/meses/anos. */
export function addPeriod(d: Date, n: number, unit: PeriodUnit): Date {
  if (unit === "dias") return addDays(d, n);
  if (unit === "semanas") return addDays(d, 7 * n);
  if (unit === "meses") return addMonths(d, n);
  return addMonths(d, 12 * n);
}
