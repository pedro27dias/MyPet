/**
 * Cartão de Vacina: junta as aplicações registradas (feito) de vacinas, vermífugo e antipulgas.
 * Toda vacina marcada como feita (cadastro, botão +, "Feito ✓" ou direto no cartão) entra sozinha.
 */
import type { Care, CareRecord, CareType, Pet } from "./types";
import { fmtDate } from "./dates";
import { normalize } from "./breeds";

export type CardSectionKey = "vacina" | "vermifugo" | "antipulgas";

export const CARD_SECTIONS: { key: CardSectionKey; title: string; empty: string }[] = [
  { key: "vacina", title: "Vacinas", empty: "Nenhuma vacina registrada ainda." },
  { key: "vermifugo", title: "Vermífugo", empty: "Nenhum vermífugo registrado ainda." },
  { key: "antipulgas", title: "Pulgas e carrapatos", empty: "Nenhuma proteção registrada ainda." },
];

export interface CardRow {
  id: string;
  care: Care;
  /** Nome curto (ex.: "V8/V10", "Antirrábica") */
  name: string;
  /** Data da aplicação (ISO) — null = ainda não aplicada (só a próxima dose) */
  appliedAt: string | null;
  /** Próxima dose (ISO), só na aplicação mais recente de cada cuidado */
  nextAt: string | null;
  clinic: string | null;
  labelPhoto: string | null;
}

/** Ordem das vacinas no cartão (as outras vêm depois, por nome). */
const VACCINE_ORDER = ["v8", "v10", "antirrab", "raiva", "gripe", "giard", "leish"];

function vaccineRank(title: string) {
  const n = normalize(title);
  const i = VACCINE_ORDER.findIndex((k) => n.includes(k));
  return i < 0 ? 99 : i;
}

/** Tira o "Vacina " do começo para caber na tabela. */
export function shortName(care: Care): string {
  return care.type === "vacina" ? care.title.replace(/^vacina\s+/i, "").replace(/^\w/, (c) => c.toUpperCase()) : care.title;
}

export function cardRows(cares: Care[], records: CareRecord[], section: CardSectionKey): CardRow[] {
  const sectionCares = cares.filter((c) => c.type === section);
  const rows: CardRow[] = [];
  for (const care of sectionCares) {
    const done = records
      .filter((r) => r.careId === care.id && r.status === "feito")
      .sort((a, b) => (a.doneAt ?? a.occurrence).localeCompare(b.doneAt ?? b.occurrence));
    done.forEach((r, i) => {
      const last = i === done.length - 1;
      rows.push({
        id: r.id,
        care,
        name: shortName(care),
        appliedAt: r.doneAt ?? r.occurrence,
        nextAt: last && care.active ? care.nextAt : null,
        clinic: r.clinic ?? null,
        labelPhoto: r.labelPhoto ?? null,
      });
    });
    // Ainda sem aplicação registrada, mas com próxima dose marcada
    if (!done.length && care.active && care.nextAt) {
      rows.push({ id: `prox-${care.id}`, care, name: shortName(care), appliedAt: null, nextAt: care.nextAt, clinic: null, labelPhoto: null });
    }
  }
  return rows.sort((a, b) => {
    if (section === "vacina") {
      const r = vaccineRank(a.care.title) - vaccineRank(b.care.title);
      if (r) return r;
      if (a.care.id !== b.care.id) return a.name.localeCompare(b.name);
    }
    return (a.appliedAt ?? "9999").localeCompare(b.appliedAt ?? "9999");
  });
}

export interface CardPage {
  kind: "id" | "section";
  section?: (typeof CARD_SECTIONS)[number];
  rows?: CardRow[];
  /** "Vacinas (2/3)" quando a seção ocupa mais de uma página */
  part?: string;
}

const ROWS_PER_PAGE = 6;

/** Páginas do livreto: identificação + cada seção (quebrando em várias se tiver muitas linhas). */
export function cardPages(cares: Care[], records: CareRecord[]): CardPage[] {
  const pages: CardPage[] = [{ kind: "id" }];
  for (const s of CARD_SECTIONS) {
    const rows = cardRows(cares, records, s.key);
    const chunks = Math.max(1, Math.ceil(rows.length / ROWS_PER_PAGE));
    for (let i = 0; i < chunks; i++) {
      pages.push({
        kind: "section",
        section: s,
        rows: rows.slice(i * ROWS_PER_PAGE, (i + 1) * ROWS_PER_PAGE),
        part: chunks > 1 ? `${i + 1}/${chunks}` : undefined,
      });
    }
  }
  return pages;
}

export const CARD_TYPES: CareType[] = ["vacina", "vermifugo", "antipulgas"];

// ---------------------------------------------------------------------------------------------
// Exportar como imagem (para mandar ao veterinário)
// ---------------------------------------------------------------------------------------------

function cssVar(name: string, fallback: string) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

/** Desenha o cartão inteiro numa imagem PNG (1080 px de largura). */
export async function cardImage(pet: Pet, cares: Care[], records: CareRecord[]): Promise<Blob> {
  await document.fonts.ready;
  const forest = cssVar("--forest", "#2b4321");
  const pink = cssVar("--pink", "#feb6c6");
  const paper = cssVar("--paper", "#fbf6ea");
  const line = cssVar("--paper-line", "#e9dfc8");
  const ink = cssVar("--paper-ink", "#4a4636");
  const serif = cssVar("--font-titulo", "serif");
  const sans = cssVar("--font-app", "sans-serif");

  const W = 1080;
  const sections = CARD_SECTIONS.map((s) => ({ s, rows: cardRows(cares, records, s.key) }));
  const rowH = 64;
  const H = 300 + sections.reduce((t, x) => t + 130 + Math.max(1, x.rows.length) * rowH, 0) + 90;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext("2d")!;

  g.fillStyle = paper;
  g.fillRect(0, 0, W, H);
  g.fillStyle = forest;
  g.fillRect(0, 0, W, 240);
  g.fillStyle = pink;
  g.font = `italic 500 64px ${serif}`;
  g.fillText("Cartão de Vacina", 64, 120);
  g.font = `600 36px ${sans}`;
  const sub = [pet.name, pet.breed].filter(Boolean).join(" · ");
  g.fillText(sub, 64, 185);

  const cols = [64, 400, 620, 830];
  let y = 300;
  for (const { s, rows } of sections) {
    g.fillStyle = forest;
    g.font = `italic 500 44px ${serif}`;
    g.fillText(s.title, 64, y);
    y += 50;
    g.fillStyle = ink;
    g.font = `700 24px ${sans}`;
    ["Nome", "Aplicação", "Próxima", "Clínica"].forEach((h, i) => g.fillText(h.toUpperCase(), cols[i], y));
    y += 16;
    g.strokeStyle = line;
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(64, y);
    g.lineTo(W - 64, y);
    g.stroke();
    if (!rows.length) {
      y += 46;
      g.font = `400 28px ${sans}`;
      g.fillText(s.empty, 64, y);
      y += rowH - 46;
    }
    for (const r of rows) {
      y += 46;
      g.fillStyle = ink;
      g.font = `600 28px ${sans}`;
      g.fillText(fit(g, r.name, 320), cols[0], y);
      g.font = `400 28px ${sans}`;
      g.fillText(r.appliedAt ? fmtDate(r.appliedAt) : "—", cols[1], y);
      g.fillText(r.nextAt ? fmtDate(r.nextAt) : "—", cols[2], y);
      g.fillText(fit(g, r.clinic ?? "—", W - 64 - cols[3]), cols[3], y);
      y += rowH - 46;
      g.beginPath();
      g.moveTo(64, y);
      g.lineTo(W - 64, y);
      g.stroke();
    }
    y += 80;
  }
  g.fillStyle = ink;
  g.font = `400 22px ${sans}`;
  g.fillText(`Gerado pelo MyPet em ${fmtDate(new Date())}. Confira sempre com o veterinário.`, 64, H - 40);

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Não foi possível gerar a imagem."))), "image/png"));
}

function fit(g: CanvasRenderingContext2D, text: string, max: number) {
  if (g.measureText(text).width <= max) return text;
  let t = text;
  while (t.length > 1 && g.measureText(`${t}…`).width > max) t = t.slice(0, -1);
  return `${t}…`;
}
