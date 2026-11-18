"use client";

import { FileDown, Pencil, Search, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { normalize } from "@/lib/breeds";
import { atTime, fmtDate, fmtLongDate, fmtTime, fmtTimeShort, monthLabel, parseDate, toDateStr, todayStr } from "@/lib/dates";
import { fmtMoney } from "@/lib/money";
import type { Care, CareRecord, CareType, Expense, Pet } from "@/lib/types";
import { useApp } from "../app-provider";
import { CareIcon } from "../care/care-meta";
import { expenseMeta, ExpenseIcon } from "../gastos/expense-meta";
import { Button } from "../ui/button";
import { TextField } from "../ui/fields";
import { Sheet } from "../ui/sheet";
import { useToast } from "../ui/toast";

/*
 * Histórico (aba Cuidados): tudo o que já foi feito (ou pulado), do mais recente ao mais antigo,
 * por mês. Filtros, busca, detalhes com correção de horário/observação e PDF para o veterinário.
 */

type FilterKey = "todos" | "vacinas" | "remedios" | "vermifugo" | "antipulgas" | "consultas" | "banho" | "gastos";

const FILTERS: { key: FilterKey; label: string; types?: CareType[] }[] = [
  { key: "todos", label: "Todos" },
  { key: "vacinas", label: "Vacinas", types: ["vacina", "exame"] },
  { key: "remedios", label: "Remédios", types: ["remedio"] },
  { key: "vermifugo", label: "Vermífugo", types: ["vermifugo"] },
  { key: "antipulgas", label: "Antipulgas/Coleira", types: ["antipulgas", "coleira"] },
  { key: "consultas", label: "Consultas", types: ["consulta"] },
  { key: "banho", label: "Banho e tosa", types: ["banho"] },
  { key: "gastos", label: "Gastos" },
];

type Item =
  | { kind: "registro"; id: string; at: Date; record: CareRecord; care: Care }
  | { kind: "gasto"; id: string; at: Date; expense: Expense };

function itemTitle(care: Care) {
  return care.detail && care.type !== "remedio" && care.type !== "consulta" && !care.title.toLowerCase().includes(care.detail.toLowerCase())
    ? `${care.title} – ${care.detail}`
    : care.title;
}

export function HistoryTimeline({ pet, cares, records }: { pet: Pet; cares: Care[]; records: CareRecord[] }) {
  const { repo, tick, nameOf } = useApp();
  const [filter, setFilter] = useState<FilterKey>("todos");
  const [query, setQuery] = useState("");
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [open, setOpen] = useState<CareRecord | null>(null);
  const [exporting, setExporting] = useState(false);
  const [printItems, setPrintItems] = useState<{ items: Item[]; from: string; to: string } | null>(null);

  useEffect(() => {
    let alive = true;
    repo.listExpenses(pet.id, "2000-01-01", todayStr()).then(
      (e) => alive && setExpenses(e),
      () => alive && setExpenses([]),
    );
    return () => {
      alive = false;
    };
  }, [repo, pet.id, tick]);

  const all = useMemo<Item[]>(() => {
    const byId = new Map(cares.map((c) => [c.id, c]));
    const out: Item[] = [];
    for (const r of records) {
      const care = byId.get(r.careId);
      if (!care || (r.status !== "feito" && r.status !== "pulado")) continue;
      out.push({ kind: "registro", id: r.id, at: new Date(r.doneAt ?? r.occurrence), record: r, care });
    }
    for (const e of expenses) out.push({ kind: "gasto", id: `g-${e.id}`, at: atTime(e.date, "12:00"), expense: e });
    return out.sort((a, b) => b.at.getTime() - a.at.getTime());
  }, [cares, records, expenses]);

  const list = useMemo(() => {
    const f = FILTERS.find((x) => x.key === filter)!;
    const q = normalize(query.trim());
    return all.filter((it) => {
      if (filter === "gastos" && it.kind !== "gasto") return false;
      if (f.types && (it.kind !== "registro" || !f.types.includes(it.care.type))) return false;
      if (!q) return true;
      const text =
        it.kind === "registro"
          ? [it.care.title, it.care.detail, it.record.note, it.record.reason, it.care.note].join(" ")
          : [expenseMeta(it.expense.category).label, it.expense.note].join(" ");
      return normalize(text).includes(q);
    });
  }, [all, filter, query]);

  const groups = useMemo(() => {
    const g: { label: string; items: Item[] }[] = [];
    for (const it of list) {
      const label = monthLabel(it.at);
      const last = g[g.length - 1];
      if (last?.label === label) last.items.push(it);
      else g.push({ label, items: [it] });
    }
    return g;
  }, [list]);

  // Imprime depois que a versão de impressão aparece na tela
  useEffect(() => {
    if (!printItems) return;
    const t = setTimeout(() => window.print(), 250);
    const done = () => setPrintItems(null);
    window.addEventListener("afterprint", done, { once: true });
    return () => {
      clearTimeout(t);
      window.removeEventListener("afterprint", done);
    };
  }, [printItems]);

  return (
    <div>
      <label className="flex h-12 items-center gap-2 rounded-2xl border-2 border-line bg-card px-4 focus-within:border-forest">
        <Search size={18} className="text-muted" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar (ex.: furosemida)" className="h-full min-w-0 flex-1 bg-transparent outline-none" />
        {query && (
          <button type="button" aria-label="Limpar busca" onClick={() => setQuery("")} className="text-muted">
            <X size={18} />
          </button>
        )}
      </label>

      <div className="-mx-5 mt-3 flex gap-1.5 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            aria-pressed={filter === f.key}
            onClick={() => setFilter(f.key)}
            className={`h-9 shrink-0 rounded-full px-3.5 text-sm font-bold transition active:scale-95 ${
              filter === f.key ? "bg-forest text-pink" : "bg-card text-forest ring-2 ring-line"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <Button variant="soft" className="mt-3 w-full" onClick={() => setExporting(true)} disabled={!list.length}>
        <FileDown size={18} /> Exportar histórico (PDF)
      </Button>

      {groups.length === 0 ? (
        <p className="mt-6 rounded-3xl bg-card p-5 text-center text-muted shadow-card">
          {all.length ? "Nada encontrado com esse filtro." : "Ainda não há nada no histórico. O que for marcado como feito aparece aqui."}
        </p>
      ) : (
        <div className="mt-5 space-y-6">
          {groups.map((g) => (
            <section key={g.label}>
              <h3 className="titulo mb-2 px-1 text-xl">{g.label}</h3>
              <ol className="relative space-y-2 before:absolute before:bottom-3 before:left-[27px] before:top-3 before:w-0.5 before:bg-line">
                <AnimatePresence initial={false}>
                  {g.items.map((it) => (
                    <motion.li key={it.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="relative">
                      {it.kind === "registro" ? (
                        <RecordItem item={it} nameOf={nameOf} onOpen={() => setOpen(it.record)} />
                      ) : (
                        <ExpenseItem expense={it.expense} nameOf={nameOf} />
                      )}
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ol>
            </section>
          ))}
        </div>
      )}

      <RecordSheet record={open} care={open ? cares.find((c) => c.id === open.careId) ?? null : null} onClose={() => setOpen(null)} />
      <ExportSheet
        open={exporting}
        onClose={() => setExporting(false)}
        first={list.length ? toDateStr(list[list.length - 1].at) : todayStr()}
        onExport={(from, to) => {
          setExporting(false);
          const a = parseDate(from).getTime();
          const b = parseDate(to).getTime() + 86_400_000;
          setPrintItems({ items: list.filter((it) => it.at.getTime() >= a && it.at.getTime() < b), from, to });
        }}
      />
      {printItems && <PrintHistory pet={pet} {...printItems} nameOf={nameOf} filter={FILTERS.find((f) => f.key === filter)!.label} />}
    </div>
  );
}

function Who({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="grid size-5 place-items-center rounded-full bg-peach-soft text-[10px] font-extrabold text-forest">{name.charAt(0).toUpperCase()}</span>
      {name}
    </span>
  );
}

function RecordItem({ item, nameOf, onOpen }: { item: Extract<Item, { kind: "registro" }>; nameOf: (id: string | null) => string; onOpen: () => void }) {
  const { record: r, care } = item;
  const skipped = r.status === "pulado";
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`flex w-full items-start gap-3 rounded-3xl bg-card p-3 text-left shadow-card transition active:scale-[0.98] ${skipped ? "opacity-60 grayscale" : ""}`}
    >
      <span className="relative z-10">
        <CareIcon type={care.type} size={40} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-bold text-forest">{itemTitle(care)}</span>
        {care.type === "remedio" && care.detail && <span className="block truncate text-sm text-ink">Dose: {care.detail}</span>}
        {r.result && <span className="block text-sm font-bold text-forest">Resultado: {r.result}</span>}
        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
          <span className="font-semibold">
            {fmtDate(item.at)} · {fmtTimeShort(item.at)}
          </span>
          <Who name={nameOf(r.by)} />
        </span>
        {skipped && <span className="mt-1 block text-sm font-semibold text-muted">Pulado{r.reason ? `: ${r.reason}` : ""}</span>}
        {r.note && <span className="mt-1 block text-sm text-ink">“{r.note}”</span>}
        {r.editedBy && <span className="mt-0.5 block text-[11px] text-faint">editado por {nameOf(r.editedBy)}</span>}
      </span>
    </button>
  );
}

function ExpenseItem({ expense: e, nameOf }: { expense: Expense; nameOf: (id: string | null) => string }) {
  return (
    <div className="flex w-full items-start gap-3 rounded-3xl bg-card p-3 shadow-card">
      <span className="relative z-10">
        <ExpenseIcon category={e.category} size={40} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex justify-between gap-2">
          <span className="truncate font-bold text-forest">{expenseMeta(e.category).label}</span>
          <span className="shrink-0 font-extrabold text-forest">{fmtMoney(e.amount)}</span>
        </span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
          <span className="font-semibold">{fmtDate(e.date)}</span>
          {e.paidBy && <Who name={nameOf(e.paidBy)} />}
        </span>
        {e.note && <span className="mt-1 block text-sm text-ink">{e.note}</span>}
      </span>
    </div>
  );
}

/** Detalhes de um registro: corrigir horário e observação (grava "editado por"). */
function RecordSheet({ record, care, onClose }: { record: CareRecord | null; care: Care | null; onClose: () => void }) {
  return (
    <Sheet
      open={!!record && !!care}
      onClose={onClose}
      title={
        care && (
          <span className="flex items-center gap-3">
            <CareIcon type={care.type} size={36} />
            <span className="truncate">{itemTitle(care)}</span>
          </span>
        )
      }
    >
      {record && care && <RecordForm key={record.id} record={record} care={care} onDone={onClose} />}
    </Sheet>
  );
}

function RecordForm({ record, care, onDone }: { record: CareRecord; care: Care; onDone: () => void }) {
  const { repo, reloadData, nameOf } = useApp();
  const toast = useToast();
  const at = new Date(record.doneAt ?? record.occurrence);
  const [date, setDate] = useState(toDateStr(at));
  const [time, setTime] = useState(fmtTime(at));
  const [note, setNote] = useState(record.note ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const done = record.status === "feito";

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await repo.updateRecord(record.id, { ...(done ? { doneAt: atTime(date, time).toISOString() } : {}), note: note.trim() || null });
      await reloadData();
      toast("Registro corrigido ✓");
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 pb-2">
      <dl className="space-y-1 rounded-2xl bg-bg p-4 text-sm">
        <Row k="Situação" v={done ? "Feito" : `Pulado${record.reason ? ` (${record.reason})` : ""}`} />
        <Row k="Quando" v={`${fmtLongDate(at)} às ${fmtTimeShort(at)}`} />
        <Row k="Quem" v={nameOf(record.by)} />
        {care.detail && <Row k={care.type === "remedio" ? "Dose" : care.type === "consulta" ? "Local" : "Produto"} v={care.detail} />}
        {record.result && <Row k="Resultado" v={record.result} />}
        {record.clinic && <Row k="Clínica" v={record.clinic} />}
        {record.editedBy && <Row k="Editado por" v={`${nameOf(record.editedBy)}${record.editedAt ? ` em ${fmtDate(record.editedAt)}` : ""}`} />}
      </dl>
      {done && (
        <div className="grid grid-cols-[1fr_auto] gap-3">
          <TextField label="Data" type="date" value={date} max={todayStr()} onChange={(v) => v && setDate(v)} />
          <TextField label="Hora" type="time" value={time} onChange={(v) => v && setTime(v)} />
        </div>
      )}
      <TextField label="Observação" multiline value={note} onChange={setNote} placeholder="Ex.: comeu bem depois, sem reação" />
      {error && <p className="rounded-2xl bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">{error}</p>}
      <Button size="lg" className="w-full" disabled={busy} onClick={save}>
        <Pencil size={18} /> {busy ? "Salvando..." : "Salvar correção"}
      </Button>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{k}</dt>
      <dd className="text-right font-semibold text-ink">{v}</dd>
    </div>
  );
}

function ExportSheet({ open, onClose, first, onExport }: { open: boolean; onClose: () => void; first: string; onExport: (from: string, to: string) => void }) {
  const [from, setFrom] = useState(first);
  const [to, setTo] = useState(todayStr());
  return (
    <Sheet open={open} onClose={onClose} title="Exportar histórico">
      <div className="space-y-4 pb-2">
        <p className="text-muted">Resumo para levar ao veterinário. Usa o filtro e a busca escolhidos. Na tela de impressão, escolha “Salvar como PDF”.</p>
        <div className="grid grid-cols-2 gap-3">
          <TextField label="De" type="date" value={from} max={to} onChange={(v) => v && setFrom(v)} />
          <TextField label="Até" type="date" value={to} max={todayStr()} onChange={(v) => v && setTo(v)} />
        </div>
        <Button size="lg" className="w-full" onClick={() => onExport(from, to)}>
          <FileDown size={18} /> Gerar PDF
        </Button>
      </div>
    </Sheet>
  );
}

/** Versão para imprimir / salvar como PDF (escondida na tela). */
function PrintHistory({ pet, items, from, to, filter, nameOf }: { pet: Pet; items: Item[]; from: string; to: string; filter: string; nameOf: (id: string | null) => string }) {
  const cell = { borderBottom: "1px solid #ddd", padding: "5px 4px", verticalAlign: "top" as const };
  return (
    <div id="historico-impressao" className="hidden bg-white p-8 text-black">
      <h1 style={{ fontFamily: "var(--font-titulo)", fontStyle: "italic", fontSize: 30 }}>Histórico de cuidados · {pet.name}</h1>
      <p style={{ fontSize: 13 }}>
        {[pet.species === "gato" ? "Gato" : "Cachorro", pet.breed, pet.birth ? `nascimento ${fmtDate(pet.birth)}` : null].filter(Boolean).join(" · ")}
        <br />
        Período: {fmtDate(from)} a {fmtDate(to)} · {filter}
      </p>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginTop: 16 }}>
        <thead>
          <tr>
            {["Data", "O quê", "Detalhes", "Quem"].map((h) => (
              <th key={h} style={{ textAlign: "left", borderBottom: "1px solid #999", padding: "6px 4px" }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((it) =>
            it.kind === "registro" ? (
              <tr key={it.id}>
                <td style={cell}>
                  {fmtDate(it.at)} {fmtTimeShort(it.at)}
                </td>
                <td style={cell}>
                  {itemTitle(it.care)}
                  {it.record.status === "pulado" ? " (pulado)" : ""}
                </td>
                <td style={cell}>
                  {[
                    it.care.type === "remedio" && it.care.detail ? `Dose: ${it.care.detail}` : null,
                    it.record.result ? `Resultado: ${it.record.result}` : null,
                    it.record.reason,
                    it.record.note,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </td>
                <td style={cell}>{nameOf(it.record.by)}</td>
              </tr>
            ) : (
              <tr key={it.id}>
                <td style={cell}>{fmtDate(it.expense.date)}</td>
                <td style={cell}>Gasto: {expenseMeta(it.expense.category).label}</td>
                <td style={cell}>{[fmtMoney(it.expense.amount), it.expense.note].filter(Boolean).join(" · ")}</td>
                <td style={cell}>{it.expense.paidBy ? nameOf(it.expense.paidBy) : ""}</td>
              </tr>
            ),
          )}
        </tbody>
      </table>
      <p style={{ marginTop: 20, fontSize: 11 }}>Gerado pelo MyPet em {fmtDate(new Date())}. Informações registradas pelos tutores.</p>
    </div>
  );
}
