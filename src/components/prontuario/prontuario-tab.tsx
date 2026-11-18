"use client";

/* eslint-disable @next/next/no-img-element -- anexos vêm de links temporários do Storage */
import { Download, FileText, Pencil, Plus, Search, Share2, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { normalize } from "@/lib/breeds";
import { fmtDate, fmtLongDate, monthLabel, parseDate } from "@/lib/dates";
import { fmtMoney } from "@/lib/money";
import type { Attachment, MedicalKind, MedicalRecord, Pet } from "@/lib/types";
import { useApp } from "../app-provider";
import { Button } from "../ui/button";
import { Sheet } from "../ui/sheet";
import { useToast } from "../ui/toast";
import { MedicalFormSheet, newMedical } from "./medical-form";
import { MEDICAL_META, MEDICAL_ORDER, MedicalIcon } from "./medical-meta";

/** Prontuário (aba Cuidados): registros clínicos em linha do tempo, com anexos, filtros e busca. */
export function ProntuarioTab({ pet }: { pet: Pet }) {
  const { repo, tick, nameOf } = useApp();
  const [list, setList] = useState<MedicalRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<MedicalKind | null>(null);
  const [query, setQuery] = useState("");
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [open, setOpen] = useState<MedicalRecord | null>(null);
  const [editing, setEditing] = useState<MedicalRecord | null>(null);

  useEffect(() => {
    let alive = true;
    repo.listMedical(pet.id).then(
      (r) => {
        if (!alive) return;
        setList(r);
        setError(null);
      },
      (e: Error) => alive && setError(e.message),
    );
    return () => {
      alive = false;
    };
  }, [repo, pet.id, tick]);

  // Links das miniaturas
  useEffect(() => {
    const paths = (list ?? []).flatMap((m) => m.attachments.map((a) => a.path));
    if (paths.length) repo.photoUrls(paths).then(setUrls, () => {});
  }, [repo, list]);

  const shown = useMemo(() => {
    const q = normalize(query.trim());
    return (list ?? []).filter(
      (m) => (!filter || m.kind === filter) && (!q || normalize([m.title, m.clinic, m.summary, m.tags.join(" "), MEDICAL_META[m.kind].label].join(" ")).includes(q)),
    );
  }, [list, filter, query]);

  const groups = useMemo(() => {
    const g: { label: string; items: MedicalRecord[] }[] = [];
    for (const m of shown) {
      const label = monthLabel(parseDate(m.date));
      const last = g[g.length - 1];
      if (last?.label === label) last.items.push(m);
      else g.push({ label, items: [m] });
    }
    return g;
  }, [shown]);

  return (
    <div>
      <Button className="w-full" onClick={() => setEditing(newMedical(pet.id))}>
        <Plus size={18} strokeWidth={2.75} /> Registro clínico / exame
      </Button>

      <label className="mt-3 flex h-12 items-center gap-2 rounded-2xl border-2 border-line bg-card px-4 focus-within:border-forest">
        <Search size={18} className="text-muted" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar (ex.: hemograma, rim)" className="h-full min-w-0 flex-1 bg-transparent outline-none" />
        {query && (
          <button type="button" aria-label="Limpar busca" onClick={() => setQuery("")} className="text-muted">
            <X size={18} />
          </button>
        )}
      </label>
      <div className="-mx-5 mt-3 flex gap-1.5 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
        <FilterChip sel={!filter} onClick={() => setFilter(null)}>
          Todos
        </FilterChip>
        {MEDICAL_ORDER.map((k) => (
          <FilterChip key={k} sel={filter === k} onClick={() => setFilter(k)}>
            {MEDICAL_META[k].plural}
          </FilterChip>
        ))}
      </div>

      {error && <p className="mt-4 rounded-2xl bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">{error}</p>}
      {list === null && !error ? (
        <div className="mt-4 space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-3xl bg-card" />
          ))}
        </div>
      ) : groups.length === 0 && !error ? (
        <p className="mt-6 rounded-3xl bg-card p-5 text-center text-muted shadow-card">
          {list?.length ? "Nada encontrado com esse filtro." : "Guarde aqui consultas, exames, testes, cirurgias, diagnósticos e receitas, com fotos e PDFs."}
        </p>
      ) : (
        <div className="mt-5 space-y-6">
          {groups.map((g) => (
            <section key={g.label}>
              <h3 className="titulo mb-2 px-1 text-xl">{g.label}</h3>
              <ol className="relative space-y-2 before:absolute before:bottom-4 before:left-[29px] before:top-4 before:w-0.5 before:bg-line">
                {g.items.map((m) => (
                  <motion.li key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="relative">
                    <button type="button" onClick={() => setOpen(m)} className="flex w-full items-start gap-3 rounded-3xl bg-card p-3 text-left shadow-card active:scale-[0.98]">
                      <span className="relative z-10">
                        <MedicalIcon kind={m.kind} size={44} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-bold text-forest">{m.title}</span>
                        <span className="block truncate text-xs text-muted">
                          {MEDICAL_META[m.kind].label} · {fmtDate(m.date)}
                          {m.clinic ? ` · ${m.clinic}` : ""}
                        </span>
                        {m.summary && <span className="mt-1 line-clamp-2 block text-sm text-ink">{m.summary}</span>}
                        {m.tags.length > 0 && (
                          <span className="mt-1 flex flex-wrap gap-1">
                            {m.tags.map((t) => (
                              <span key={t} className="rounded-full bg-olive-soft px-2 py-0.5 text-[11px] font-bold text-forest">
                                #{t}
                              </span>
                            ))}
                          </span>
                        )}
                        {m.attachments.length > 0 && (
                          <span className="mt-2 flex gap-1.5">
                            {m.attachments.slice(0, 4).map((a) => (
                              <MiniThumb key={a.path} a={a} url={urls[a.path]} />
                            ))}
                            {m.attachments.length > 4 && <span className="grid size-10 place-items-center rounded-lg bg-bg text-xs font-bold text-muted">+{m.attachments.length - 4}</span>}
                          </span>
                        )}
                        <span className="mt-1 block text-[11px] text-faint">registrado por {nameOf(m.by)}</span>
                      </span>
                    </button>
                  </motion.li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}

      <RecordDetail record={open} urls={urls} onClose={() => setOpen(null)} onEdit={(m) => (setOpen(null), setEditing(m))} />
      <MedicalFormSheet record={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

function FilterChip({ sel, onClick, children }: { sel: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={sel}
      onClick={onClick}
      className={`h-9 shrink-0 rounded-full px-3.5 text-sm font-bold transition active:scale-95 ${sel ? "bg-forest text-pink" : "bg-card text-forest ring-2 ring-line"}`}
    >
      {children}
    </button>
  );
}

function MiniThumb({ a, url }: { a: Attachment; url?: string }) {
  if (a.type.startsWith("image/") && url) return <img src={url} alt="" className="size-10 rounded-lg object-cover" />;
  return (
    <span className="grid size-10 place-items-center rounded-lg bg-danger-soft text-danger">
      <FileText size={18} />
    </span>
  );
}

function RecordDetail({ record, urls, onClose, onEdit }: { record: MedicalRecord | null; urls: Record<string, string>; onClose: () => void; onEdit: (m: MedicalRecord) => void }) {
  const { nameOf } = useApp();
  const [view, setView] = useState<Attachment | null>(null);
  return (
    <>
      <Sheet
        open={!!record}
        onClose={onClose}
        title={
          record && (
            <span className="flex items-center gap-3">
              <MedicalIcon kind={record.kind} size={36} />
              <span className="truncate">{record.title}</span>
            </span>
          )
        }
      >
        {record && (
          <div className="space-y-4 pb-2">
            <dl className="space-y-1 rounded-2xl bg-bg p-4 text-sm">
              <Row k="Tipo" v={MEDICAL_META[record.kind].label} />
              <Row k="Data" v={fmtLongDate(record.date)} />
              {record.clinic && <Row k="Clínica / vet" v={record.clinic} />}
              {record.price ? <Row k="Valor" v={fmtMoney(record.price)} /> : null}
              <Row k="Registrado por" v={nameOf(record.by)} />
            </dl>
            {record.summary && <p className="whitespace-pre-line rounded-2xl bg-card p-4 text-[15px] leading-snug text-ink ring-2 ring-line">{record.summary}</p>}
            {record.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {record.tags.map((t) => (
                  <span key={t} className="rounded-full bg-olive-soft px-2.5 py-1 text-xs font-bold text-forest">
                    #{t}
                  </span>
                ))}
              </div>
            )}
            {record.attachments.length > 0 && (
              <div>
                <h4 className="mb-2 px-1 text-sm font-bold text-muted">Anexos</h4>
                <div className="grid grid-cols-3 gap-2">
                  {record.attachments.map((a) => (
                    <button key={a.path} type="button" onClick={() => setView(a)} className="overflow-hidden rounded-2xl bg-bg active:scale-95">
                      {a.type.startsWith("image/") && urls[a.path] ? (
                        <img src={urls[a.path]} alt={a.name} className="aspect-square w-full object-cover" />
                      ) : (
                        <span className="flex aspect-square flex-col items-center justify-center gap-1 p-2 text-danger">
                          <FileText size={28} />
                          <span className="line-clamp-2 text-center text-[10px] font-bold text-ink">{a.name}</span>
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <Button variant="soft" className="w-full" onClick={() => onEdit(record)}>
              <Pencil size={16} /> Editar registro
            </Button>
          </div>
        )}
      </Sheet>
      <AttachmentViewer a={view} url={view ? urls[view.path] : undefined} onClose={() => setView(null)} />
    </>
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

/** Tela cheia: foto (ou PDF) com baixar e compartilhar. */
function AttachmentViewer({ a, url, onClose }: { a: Attachment | null; url?: string; onClose: () => void }) {
  const toast = useToast();

  async function share() {
    if (!a || !url) return;
    try {
      const blob = await (await fetch(url)).blob();
      const file = new File([blob], a.name, { type: a.type });
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: a.name });
      else download();
    } catch (e) {
      if ((e as Error).name !== "AbortError") toast("Não foi possível compartilhar. Tente baixar.", { tone: "erro" });
    }
  }

  function download() {
    if (!a || !url) return;
    const link = document.createElement("a");
    link.href = url;
    link.download = a.name;
    link.target = "_blank";
    link.rel = "noopener";
    link.click();
  }

  return (
    <AnimatePresence>
      {a && (
        <motion.div className="fixed inset-0 z-[80] flex flex-col bg-forest/95" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="pt-safe flex items-center gap-2 px-4 py-3 text-pink">
            <span className="flex-1 truncate font-bold">{a.name}</span>
            <button type="button" aria-label="Compartilhar" onClick={share} className="grid size-10 place-items-center rounded-full bg-pink/15">
              <Share2 size={18} />
            </button>
            <button type="button" aria-label="Baixar" onClick={download} className="grid size-10 place-items-center rounded-full bg-pink/15">
              <Download size={18} />
            </button>
            <button type="button" aria-label="Fechar" onClick={onClose} className="grid size-10 place-items-center rounded-full bg-pink text-forest">
              <X size={20} />
            </button>
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center p-4">
            {!url ? (
              <p className="text-pink-soft">Carregando...</p>
            ) : a.type.startsWith("image/") ? (
              <img src={url} alt={a.name} className="max-h-full max-w-full rounded-2xl object-contain" />
            ) : (
              <iframe src={url} title={a.name} className="h-full w-full rounded-2xl bg-white" />
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
