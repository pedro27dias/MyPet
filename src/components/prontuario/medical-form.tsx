"use client";

/* eslint-disable @next/next/no-img-element -- prévias locais e links temporários */
import { Camera, FileText, ImagePlus, Pill, Plus, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { addDays, atTime, toDateStr, todayStr } from "@/lib/dates";
import { blankCare, newId } from "@/lib/onboarding";
import { fmtMoney } from "@/lib/money";
import { compressPhoto } from "@/lib/photo";
import type { Attachment, MedicalKind, MedicalRecord } from "@/lib/types";
import { useApp } from "../app-provider";
import { AskExpenseSheet, type ExpenseAsk } from "../gastos/ask-expense";
import { Button } from "../ui/button";
import { Pills, TextField } from "../ui/fields";
import { Sheet } from "../ui/sheet";
import { useToast } from "../ui/toast";
import { MEDICAL_META, MEDICAL_ORDER, MedicalIcon } from "./medical-meta";

const MAX_PDF = 10 * 1024 * 1024;

export function newMedical(petId: string, kind: MedicalKind = "consulta"): MedicalRecord {
  return { id: newId(), petId, kind, date: todayStr(), title: "", clinic: null, summary: null, tags: [], attachments: [], price: null, by: null, createdAt: new Date().toISOString() };
}

/** Novo registro clínico (ou editar): tipo, data, título, clínica, resumo, tags, valor e anexos. */
export function MedicalFormSheet({ record, onClose }: { record: MedicalRecord | null; onClose: () => void }) {
  const [after, setAfter] = useState<{ ask: ExpenseAsk | null; prescription: boolean } | null>(null);
  return (
    <>
      <Sheet open={!!record} onClose={onClose} title={record?.title ? "Editar registro" : "Registro clínico / exame"}>
        {record && (
          <MedicalForm
            key={record.id}
            initial={record}
            onDone={(next) => {
              onClose();
              if (next) setAfter(next);
            }}
          />
        )}
      </Sheet>
      <PrescriptionSheet open={!!after?.prescription} onClose={() => setAfter((a) => (a ? { ...a, prescription: false } : null))} />
      <AskExpenseSheet ask={after && !after.prescription ? after.ask : null} onClose={() => setAfter(null)} />
    </>
  );
}

interface PendingFile {
  id: string;
  file: Blob;
  name: string;
  type: string;
  preview: string | null;
}

function MedicalForm({ initial, onDone }: { initial: MedicalRecord; onDone: (next?: { ask: ExpenseAsk | null; prescription: boolean }) => void }) {
  const { repo, pet, user, reloadData } = useApp();
  const toast = useToast();
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [m, setM] = useState<MedicalRecord>(initial);
  const [tagText, setTagText] = useState("");
  const [pending, setPending] = useState<PendingFile[]>([]);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [withPrescription, setWithPrescription] = useState(initial.kind === "receita");
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isNew = !initial.title;
  const set = (patch: Partial<MedicalRecord>) => setM((p) => ({ ...p, ...patch }));
  const meta = MEDICAL_META[m.kind];

  useEffect(() => {
    const paths = initial.attachments.filter((a) => a.type.startsWith("image/")).map((a) => a.path);
    if (paths.length) repo.photoUrls(paths).then(setThumbs, () => {});
  }, [repo, initial.attachments]);

  async function addFiles(list: FileList | null) {
    if (!list) return;
    setError(null);
    for (const f of Array.from(list)) {
      try {
        if (f.type === "application/pdf") {
          if (f.size > MAX_PDF) throw new Error(`${f.name}: PDF grande demais (máximo 10 MB).`);
          setPending((p) => [...p, { id: newId(), file: f, name: f.name, type: f.type, preview: null }]);
        } else if (f.type.startsWith("image/")) {
          const b = await compressPhoto(f, 1600);
          setPending((p) => [...p, { id: newId(), file: b, name: f.name || "foto.jpg", type: "image/jpeg", preview: URL.createObjectURL(b) }]);
        } else throw new Error(`${f.name}: envie foto ou PDF.`);
      } catch (e) {
        setError((e as Error).message);
      }
    }
  }

  function addTag() {
    const t = tagText.trim().replace(/^#/, "");
    if (t && !m.tags.includes(t)) set({ tags: [...m.tags, t] });
    setTagText("");
  }

  async function save() {
    if (!pet) return;
    if (!m.title.trim()) return setError("Coloque um título (ex.: Hemograma).");
    setBusy(true);
    setError(null);
    try {
      const uploaded: Attachment[] = [];
      for (const p of pending) {
        const path = await repo.uploadFile(pet.id, p.file, "prontuario/anexo", p.type === "application/pdf" ? "pdf" : "jpg");
        uploaded.push({ path, name: p.name, type: p.type });
      }
      const out: MedicalRecord = {
        ...m,
        title: m.title.trim(),
        clinic: m.clinic?.trim() || null,
        summary: m.summary?.trim() || null,
        attachments: [...m.attachments, ...uploaded],
        by: m.by ?? user.id,
      };
      await repo.saveMedical(out);
      await reloadData();
      toast(isNew ? "Registro salvo no prontuário ✓" : "Registro atualizado ✓");
      const ask: ExpenseAsk | null =
        isNew && out.price ? { amount: out.price, category: meta.expense, note: out.title, date: out.date } : null;
      const prescription = isNew && withPrescription && (out.kind === "consulta" || out.kind === "receita");
      onDone(ask || prescription ? { ask, prescription } : undefined);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await repo.deleteMedical(m.id);
      await reloadData();
      toast("Registro apagado.");
      onDone();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 pb-2">
      <div className="grid grid-cols-3 gap-2">
        {MEDICAL_ORDER.map((k) => {
          const mm = MEDICAL_META[k];
          const sel = m.kind === k;
          return (
            <button
              key={k}
              type="button"
              aria-pressed={sel}
              onClick={() => (set({ kind: k }), k === "receita" && setWithPrescription(true))}
              className={`flex flex-col items-center gap-1 rounded-2xl p-2 transition active:scale-95 ${sel ? "bg-forest text-pink" : "bg-card ring-2 ring-line"}`}
            >
              <span className={`grid size-9 place-items-center rounded-xl ${sel ? "bg-pink/20 text-pink" : `${mm.bg} ${mm.fg}`}`}>
                <mm.Icon size={18} />
              </span>
              <span className={`text-center text-[11px] font-bold leading-tight ${sel ? "text-pink" : "text-forest"}`}>{mm.label.split("/")[0]}</span>
            </button>
          );
        })}
      </div>

      <div>
        <TextField label="Título" value={m.title} onChange={(v) => set({ title: v })} placeholder={`Ex.: ${meta.examples[0]}`} />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {meta.examples.map((ex) => (
            <button key={ex} type="button" onClick={() => set({ title: ex })} className="h-8 rounded-full bg-bg px-3 text-xs font-bold text-forest ring-2 ring-line active:scale-95">
              {ex}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <TextField label="Data" type="date" value={m.date} max={todayStr()} onChange={(v) => v && set({ date: v })} />
        <TextField
          label="Valor (opcional)"
          inputMode="numeric"
          value={m.price ? fmtMoney(m.price) : ""}
          onChange={(v) => {
            const cents = Number(v.replace(/\D/g, "").slice(0, 8) || 0);
            set({ price: cents ? cents / 100 : null });
          }}
          placeholder="R$ 0,00"
        />
      </div>
      <TextField label="Clínica / veterinário" value={m.clinic ?? ""} onChange={(v) => set({ clinic: v })} placeholder={pet?.vetName ?? "Ex.: Clínica Patas"} />
      <TextField
        label="Resultado / resumo"
        multiline
        value={m.summary ?? ""}
        onChange={(v) => set({ summary: v })}
        placeholder="Ex.: plaquetas um pouco baixas, repetir em 30 dias"
      />

      <div>
        <span className="mb-1 block px-1 text-sm font-bold text-muted">Tags</span>
        <div className="flex flex-wrap items-center gap-1.5">
          {m.tags.map((t) => (
            <span key={t} className="flex h-8 items-center gap-1 rounded-full bg-olive-soft pl-3 pr-1 text-xs font-bold text-forest">
              #{t}
              <button type="button" aria-label={`Tirar ${t}`} onClick={() => set({ tags: m.tags.filter((x) => x !== t) })} className="grid size-6 place-items-center rounded-full">
                <X size={12} />
              </button>
            </span>
          ))}
          <input
            value={tagText}
            onChange={(e) => setTagText(e.target.value)}
            onKeyDown={(e) => (e.key === "Enter" || e.key === ",") && (e.preventDefault(), addTag())}
            onBlur={addTag}
            placeholder="+ tag (ex.: rim)"
            className="h-8 min-w-24 flex-1 rounded-full bg-bg px-3 text-xs font-bold outline-none ring-2 ring-line focus:ring-forest"
          />
        </div>
      </div>

      {/* Anexos */}
      <div>
        <span className="mb-2 block px-1 text-sm font-bold text-muted">Anexos (fotos e PDFs)</span>
        <div className="flex flex-wrap gap-2">
          {m.attachments.map((a) => (
            <Thumb key={a.path} name={a.name} pdf={a.type === "application/pdf"} src={thumbs[a.path]} onRemove={() => set({ attachments: m.attachments.filter((x) => x.path !== a.path) })} />
          ))}
          {pending.map((p) => (
            <Thumb key={p.id} name={p.name} pdf={p.type === "application/pdf"} src={p.preview ?? undefined} onRemove={() => setPending((l) => l.filter((x) => x.id !== p.id))} />
          ))}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => cameraRef.current?.click()} className="flex h-12 items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line font-bold text-olive">
            <Camera size={18} /> Câmera
          </button>
          <button type="button" onClick={() => fileRef.current?.click()} className="flex h-12 items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line font-bold text-olive">
            <ImagePlus size={18} /> Galeria / PDF
          </button>
        </div>
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => (addFiles(e.target.files), (e.target.value = ""))} />
        <input ref={fileRef} type="file" accept="image/*,application/pdf" multiple className="hidden" onChange={(e) => (addFiles(e.target.files), (e.target.value = ""))} />
      </div>

      {isNew && (m.kind === "consulta" || m.kind === "receita") && (
        <button
          type="button"
          role="switch"
          aria-checked={withPrescription}
          onClick={() => setWithPrescription((v) => !v)}
          className="flex w-full items-center gap-3 rounded-2xl border-2 border-line bg-card px-4 py-3 text-left font-bold text-forest"
        >
          <Pill size={18} className="text-t-remedio" />
          <span className="flex-1">Teve receita? Criar lembretes dos remédios depois</span>
          <span className={`relative h-7 w-12 shrink-0 rounded-full transition ${withPrescription ? "bg-forest" : "bg-line"}`}>
            <span className={`absolute top-1 size-5 rounded-full bg-white shadow transition-all ${withPrescription ? "left-6" : "left-1"}`} />
          </span>
        </button>
      )}

      {error && <p className="rounded-2xl bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">{error}</p>}
      <Button size="lg" className="w-full" disabled={busy} onClick={save}>
        {busy ? "Salvando..." : isNew ? "Salvar no prontuário" : "Salvar"}
      </Button>
      {!isNew &&
        (confirmDelete ? (
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={() => setConfirmDelete(false)}>
              Cancelar
            </Button>
            <Button variant="danger" className="flex-1" disabled={busy} onClick={remove}>
              Apagar mesmo
            </Button>
          </div>
        ) : (
          <Button variant="ghost" className="w-full" onClick={() => setConfirmDelete(true)}>
            <Trash2 size={16} /> Apagar registro
          </Button>
        ))}
    </div>
  );
}

function Thumb({ name, pdf, src, onRemove }: { name: string; pdf: boolean; src?: string; onRemove: () => void }) {
  return (
    <span className="relative">
      {pdf || !src ? (
        <span className="grid size-16 place-items-center rounded-xl bg-danger-soft text-danger" title={name}>
          <FileText size={24} />
        </span>
      ) : (
        <img src={src} alt={name} className="size-16 rounded-xl object-cover" />
      )}
      <button type="button" aria-label={`Tirar ${name}`} onClick={onRemove} className="absolute -right-1.5 -top-1.5 grid size-6 place-items-center rounded-full bg-forest text-pink">
        <X size={12} />
      </button>
    </span>
  );
}

// ---------------------------------------------------------------------------------------------
// "Criar lembretes dos remédios desta receita"
// ---------------------------------------------------------------------------------------------

interface MedRow {
  id: string;
  name: string;
  dose: string;
  every: string; // horas: "8" | "12" | "24"
  days: string; // "" = contínuo
  first: string; // HH:MM
}

const EVERY = [
  { value: "8", label: "8 em 8h" },
  { value: "12", label: "12 em 12h" },
  { value: "24", label: "1x ao dia" },
];

function newRow(): MedRow {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return { id: newId(), name: "", dose: "", every: "12", days: "7", first: `${String(d.getHours()).padStart(2, "0")}:00` };
}

export function PrescriptionSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="Remédios da receita">
      {open && <PrescriptionForm onDone={onClose} />}
    </Sheet>
  );
}

function PrescriptionForm({ onDone }: { onDone: () => void }) {
  const { repo, pet, reloadData } = useApp();
  const toast = useToast();
  const [rows, setRows] = useState<MedRow[]>([newRow()]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setRow = (id: string, patch: Partial<MedRow>) => setRows((l) => l.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  async function create() {
    if (!pet) return;
    const valid = rows.filter((r) => r.name.trim());
    if (!valid.length) return setError("Escreva o nome de pelo menos um remédio.");
    setBusy(true);
    setError(null);
    try {
      const start = todayStr();
      for (const r of valid) {
        const c = blankCare(pet.id, "remedio", r.name.trim());
        c.detail = r.dose.trim() || null;
        c.freq = r.every === "24" ? "diaria" : "horas";
        c.interval = r.every === "24" ? 1 : Number(r.every);
        c.times = [r.first];
        c.start = start;
        c.end = Number(r.days) > 0 ? toDateStr(addDays(atTime(start, "00:00"), Number(r.days) - 1)) : null;
        c.nextAt = null;
        c.note = "Da receita do prontuário.";
        await repo.saveCare(c);
      }
      await reloadData();
      toast(`${valid.length} ${valid.length === 1 ? "lembrete criado" : "lembretes criados"} ✓`);
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 pb-2">
      <p className="text-muted">Copie da receita. Cada remédio vira um lembrete no Início (dá para ajustar depois).</p>
      {rows.map((r, i) => (
        <div key={r.id} className="space-y-3 rounded-3xl bg-bg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-muted">Remédio {i + 1}</span>
            {rows.length > 1 && (
              <button type="button" aria-label="Tirar remédio" onClick={() => setRows((l) => l.filter((x) => x.id !== r.id))} className="text-muted">
                <X size={18} />
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <TextField label="Nome" value={r.name} onChange={(v) => setRow(r.id, { name: v })} placeholder="Ex.: Amoxicilina" />
            <TextField label="Dose" value={r.dose} onChange={(v) => setRow(r.id, { dose: v })} placeholder="Ex.: 1 comp." />
          </div>
          <Pills options={EVERY} value={r.every} onChange={(v) => setRow(r.id, { every: v })} />
          <div className="grid grid-cols-2 gap-2">
            <TextField label="Primeira dose" type="time" value={r.first} onChange={(v) => v && setRow(r.id, { first: v })} />
            <TextField label="Por quantos dias" inputMode="numeric" value={r.days} onChange={(v) => setRow(r.id, { days: v.replace(/\D/g, "") })} placeholder="vazio = contínuo" />
          </div>
        </div>
      ))}
      <Button variant="soft" className="w-full" onClick={() => setRows((l) => [...l, newRow()])}>
        <Plus size={18} /> Outro remédio
      </Button>
      {error && <p className="rounded-2xl bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">{error}</p>}
      <Button size="lg" className="w-full" disabled={busy} onClick={create}>
        {busy ? "Criando..." : "Criar lembretes"}
      </Button>
    </div>
  );
}

export { MedicalIcon };
