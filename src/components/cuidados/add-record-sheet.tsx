"use client";

/* eslint-disable @next/next/no-img-element -- prévia local da foto */
import { Camera, X } from "lucide-react";
import { useRef, useState } from "react";
import { addMonths, atTime, parseDate, toDateStr, todayStr } from "@/lib/dates";
import { compressPhoto } from "@/lib/photo";
import { VACCINES } from "@/lib/onboarding";
import type { Care, Pet } from "@/lib/types";
import type { CardSectionKey } from "@/lib/vaccine-card";
import { useApp } from "../app-provider";
import { newCareFor } from "../care/care-form";
import { Button } from "../ui/button";
import { Pills, TextField } from "../ui/fields";
import { Sheet } from "../ui/sheet";
import { useToast } from "../ui/toast";

const TYPES: { value: CardSectionKey; label: string }[] = [
  { value: "vacina", label: "Vacina" },
  { value: "vermifugo", label: "Vermífugo" },
  { value: "antipulgas", label: "Antipulgas" },
];

/** Registrar uma aplicação direto no cartão (vacina, vermífugo ou antipulgas já feitos). */
export function AddRecordSheet({ open, onClose, pet, section }: { open: boolean; onClose: () => void; pet: Pet; section: CardSectionKey }) {
  return (
    <Sheet open={open} onClose={onClose} title="Adicionar registro">
      {open && <Form key={section} pet={pet} initialType={section} onDone={onClose} />}
    </Sheet>
  );
}

/** Próxima dose sugerida: o intervalo do lembrete (ou 1 ano para vacina, 3 meses para vermífugo, 1 mês antipulgas). */
function suggestNext(care: Care | null, type: CardSectionKey, applied: string) {
  const months = care && (care.freq === "meses" || care.freq === "anos") ? (care.freq === "anos" ? 12 : 1) * care.interval : type === "vacina" ? 12 : type === "vermifugo" ? 3 : 1;
  return toDateStr(addMonths(parseDate(applied), months));
}

function Form({ pet, initialType, onDone }: { pet: Pet; initialType: CardSectionKey; onDone: () => void }) {
  const { repo, cares, reloadData } = useApp();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [type, setType] = useState<CardSectionKey>(initialType);
  const options = cares.filter((c) => c.type === type);
  const [careId, setCareId] = useState<string>(options[0]?.id ?? "novo");
  const [newName, setNewName] = useState("");
  const [applied, setApplied] = useState(todayStr());
  const care = cares.find((c) => c.id === careId) ?? null;
  const [next, setNext] = useState(() => suggestNext(care, initialType, todayStr()));
  const [clinic, setClinic] = useState(pet.vetName ?? "");
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function changeType(t: CardSectionKey) {
    setType(t);
    const first = cares.find((c) => c.type === t) ?? null;
    setCareId(first?.id ?? "novo");
    setNext(suggestNext(first, t, applied));
  }

  function changeCare(id: string) {
    setCareId(id);
    setNext(suggestNext(cares.find((c) => c.id === id) ?? null, type, applied));
  }

  function changeApplied(d: string) {
    if (!d) return;
    setApplied(d);
    setNext(suggestNext(care, type, d));
  }

  async function pick(file?: File) {
    if (!file) return;
    try {
      const b = await compressPhoto(file, 1000);
      if (preview) URL.revokeObjectURL(preview);
      setPhoto(b);
      setPreview(URL.createObjectURL(b));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function save() {
    const name = newName.trim();
    if (careId === "novo" && !name) {
      setError("Escreva o nome.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      let target = care;
      if (!target) {
        const c = newCareFor(pet.id, type);
        c.title = type === "vacina" && !/^vacina/i.test(name) ? `Vacina ${name}` : name;
        c.nextAt = next ? atTime(next, "09:00").toISOString() : null;
        c.active = Boolean(next);
        await repo.saveCare(c);
        target = c;
      }
      const at = atTime(applied, "09:00").toISOString();
      // A próxima data do lembrete só anda para a frente (registrar uma dose antiga não estraga a agenda)
      const nextIso = next ? atTime(next, target.times[0] ?? "09:00").toISOString() : null;
      const moves = !!nextIso && (!care || !target.nextAt || new Date(nextIso) > new Date(target.nextAt));
      await repo.addRecord({ care: target, at, clinic: clinic.trim() || null, photo, next: moves ? nextIso : null });
      await reloadData();
      toast("Registro adicionado ao cartão ✓");
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 pb-2">
      <Pills options={TYPES} value={type} onChange={changeType} />

      <label className="block">
        <span className="mb-1 block px-1 text-sm font-bold text-muted">{type === "vacina" ? "Qual vacina" : "Qual"}</span>
        <select
          value={careId}
          onChange={(e) => changeCare(e.target.value)}
          className="h-13 w-full rounded-2xl border-2 border-line bg-card px-4 font-bold text-forest outline-none focus:border-forest"
        >
          {options.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
          <option value="novo">{type === "vacina" ? "Outra vacina..." : "Outro..."}</option>
        </select>
      </label>
      {careId === "novo" && (
        <>
          {type === "vacina" && (
            <Pills
              options={VACCINES.filter((v) => !options.some((o) => o.title.toLowerCase().includes(v.label.toLowerCase().split(" ")[0]))).map((v) => ({ value: v.label, label: v.label }))}
              value={newName}
              onChange={setNewName}
            />
          )}
          <TextField label="Nome" value={newName} onChange={setNewName} placeholder={type === "vacina" ? "Ex.: Gripe canina" : "Ex.: Drontal"} />
        </>
      )}

      <div className="grid grid-cols-2 gap-3">
        <TextField label="Aplicada em" type="date" value={applied} max={todayStr()} onChange={changeApplied} />
        <TextField label="Próxima dose" type="date" value={next} onChange={setNext} />
      </div>
      <TextField label="Clínica / veterinário" value={clinic} onChange={setClinic} placeholder="Ex.: Clínica Patas" />

      <div>
        <span className="mb-1 block px-1 text-sm font-bold text-muted">Foto da etiqueta / lote (opcional)</span>
        {preview ? (
          <div className="relative w-fit">
            <img src={preview} alt="Etiqueta" className="h-28 rounded-2xl object-cover" />
            <button
              type="button"
              aria-label="Tirar foto"
              onClick={() => (setPhoto(null), setPreview(null))}
              className="absolute -right-2 -top-2 grid size-8 place-items-center rounded-full bg-forest text-pink"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line font-bold text-olive"
          >
            <Camera size={20} /> Tirar ou escolher foto
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
      </div>

      {error && <p className="rounded-2xl bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">{error}</p>}
      <Button size="lg" className="w-full" disabled={busy} onClick={save}>
        {busy ? "Salvando..." : "Salvar no cartão"}
      </Button>
    </div>
  );
}
