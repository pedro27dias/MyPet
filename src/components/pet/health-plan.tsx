"use client";

import { FileText, Pencil, Phone, ShieldPlus, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { fmtDate } from "@/lib/dates";
import type { HealthPlan, Pet } from "@/lib/types";
import { useApp } from "../app-provider";
import { Button } from "../ui/button";
import { TextField } from "../ui/fields";
import { Sheet } from "../ui/sheet";
import { useToast } from "../ui/toast";

export const EMPTY_PLAN: HealthPlan = {
  operator: null,
  name: null,
  card: null,
  validUntil: null,
  phone: null,
  waiting: null,
  coverage: null,
  notes: null,
  pdf: null,
};

export const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;

/** Card "Plano de saúde" no perfil: dados, Ver PDF e Ligar para a central. */
export function HealthPlanCard({ pet }: { pet: Pet }) {
  const { repo } = useApp();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const plan = pet.plan;

  async function openPdf() {
    if (!plan?.pdf) return;
    try {
      const urls = await repo.photoUrls([plan.pdf]);
      const url = urls[plan.pdf];
      if (url) window.open(url, "_blank", "noopener");
    } catch (e) {
      toast((e as Error).message, { tone: "erro" });
    }
  }

  return (
    <section className="rounded-3xl bg-card p-5 shadow-card">
      <h2 className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-2xl bg-t-plano-soft text-t-plano">
          <ShieldPlus size={22} />
        </span>
        <span className="flex-1 text-lg font-bold text-forest">Plano de saúde</span>
        {plan && (
          <button type="button" aria-label="Editar plano" onClick={() => setEditing(true)} className="grid size-9 place-items-center rounded-full bg-bg text-forest">
            <Pencil size={16} />
          </button>
        )}
      </h2>
      {plan ? (
        <>
          <dl className="mt-3 space-y-1.5 text-sm">
            <Row k="Operadora" v={plan.operator} />
            <Row k="Plano" v={plan.name} />
            <Row k="Carteirinha" v={plan.card} />
            <Row k="Validade" v={plan.validUntil ? fmtDate(plan.validUntil) : null} />
            <Row k="Carências" v={plan.waiting} />
            <Row k="Coberturas" v={plan.coverage} />
            <Row k="Observações" v={plan.notes} />
          </dl>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button variant="soft" disabled={!plan.pdf} onClick={openPdf}>
              <FileText size={18} /> Ver PDF
            </Button>
            {plan.phone ? (
              <a href={telHref(plan.phone)} className="flex h-12 items-center justify-center gap-2 rounded-full bg-forest font-bold text-pink active:scale-95">
                <Phone size={18} /> Central
              </a>
            ) : (
              <Button variant="soft" disabled>
                <Phone size={18} /> Sem telefone
              </Button>
            )}
          </div>
        </>
      ) : (
        <>
          <p className="mt-2 text-sm text-muted">Guarde os dados e o PDF do plano para ter tudo à mão, inclusive na tela SOS.</p>
          <Button variant="soft" className="mt-4 w-full" onClick={() => setEditing(true)}>
            Adicionar plano de saúde
          </Button>
        </>
      )}
      <HealthPlanSheet open={editing} onClose={() => setEditing(false)} pet={pet} />
    </section>
  );
}

function Row({ k, v }: { k: string; v: string | null }) {
  if (!v) return null;
  return (
    <div className="flex justify-between gap-4">
      <dt className="shrink-0 text-muted">{k}</dt>
      <dd className="whitespace-pre-line text-right font-semibold text-ink">{v}</dd>
    </div>
  );
}

export function HealthPlanSheet({ open, onClose, pet }: { open: boolean; onClose: () => void; pet: Pet }) {
  return (
    <Sheet open={open} onClose={onClose} title="Plano de saúde">
      {open && <PlanForm pet={pet} onDone={onClose} />}
    </Sheet>
  );
}

const FIELDS: { key: Exclude<keyof HealthPlan, "pdf">; label: string; placeholder?: string; multiline?: boolean; type?: string }[] = [
  { key: "operator", label: "Operadora", placeholder: "Ex.: nome da empresa" },
  { key: "name", label: "Nome do plano" },
  { key: "card", label: "Número da carteirinha" },
  { key: "validUntil", label: "Validade", type: "date" },
  { key: "phone", label: "Telefone/WhatsApp da central", type: "tel" },
  { key: "waiting", label: "Carências", multiline: true },
  { key: "coverage", label: "Coberturas principais", multiline: true },
  { key: "notes", label: "Observações", multiline: true },
];

/** Formulário do plano: campos à mão + PDF/foto do contrato ou carteirinha (para "Ver PDF"). */
function PlanForm({ pet, onDone }: { pet: Pet; onDone: () => void }) {
  const { repo, reloadPets } = useApp();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [plan, setPlan] = useState<HealthPlan>(pet.plan ?? EMPTY_PLAN);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof HealthPlan, v: string) => setPlan((p) => ({ ...p, [k]: v || null }));

  function pick(f?: File) {
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) return setError("Arquivo grande demais (máximo 10 MB).");
    setError(null);
    setFile(f);
  }

  async function save(remove = false) {
    setBusy(true);
    setError(null);
    try {
      let pdf = plan.pdf;
      if (file && !remove) pdf = await repo.uploadFile(pet.id, file, "plano", file.type === "application/pdf" ? "pdf" : "jpg");
      await repo.updatePet(pet.id, { plan: remove ? null : { ...plan, pdf } });
      await reloadPets(pet.id);
      toast(remove ? "Plano removido." : "Plano salvo ✓");
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 pb-2">
      {FIELDS.map((f) => (
        <TextField
          key={f.key}
          label={f.label}
          type={f.type}
          multiline={f.multiline}
          value={plan[f.key] ?? ""}
          onChange={(v) => set(f.key, v)}
          placeholder={f.placeholder}
          inputMode={f.type === "tel" ? "tel" : undefined}
        />
      ))}

      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="flex w-full items-center gap-3 rounded-3xl border-2 border-dashed border-olive/50 bg-olive-soft p-4 text-left active:scale-[0.98]"
      >
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-card text-olive">
          <Upload size={22} />
        </span>
        <span className="min-w-0">
          <span className="block truncate font-bold text-forest">{file ? file.name : plan.pdf ? "Trocar o PDF do contrato/carteirinha" : "Guardar PDF do contrato ou carteirinha"}</span>
          <span className="block text-sm text-muted">Opcional. PDF ou foto, até 10 MB.</span>
        </span>
      </button>
      <input ref={fileRef} type="file" accept="application/pdf,image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />

      {error && <p className="rounded-2xl bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">{error}</p>}
      <Button size="lg" className="w-full" disabled={busy} onClick={() => save()}>
        {busy ? "Salvando..." : "Salvar plano"}
      </Button>
      {pet.plan && (
        <Button variant="ghost" className="w-full" disabled={busy} onClick={() => save(true)}>
          Remover plano
        </Button>
      )}
    </div>
  );
}
