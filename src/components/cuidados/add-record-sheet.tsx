"use client";

/* eslint-disable @next/next/no-img-element -- prévia local da foto */
import { Camera, X } from "lucide-react";
import { useRef, useState } from "react";
import { addMonths, atTime, parseDate, toDateStr, todayStr } from "@/lib/dates";
import { compressPhoto } from "@/lib/photo";
import { vaccinesFor } from "@/lib/onboarding";
import type { Care, Pet } from "@/lib/types";
import type { CardSection } from "@/lib/vaccine-card";
import { useApp } from "../app-provider";
import { FleaSafetyNote } from "../care/flea-safety";
import { newCareFor } from "../care/care-form";
import { Button } from "../ui/button";
import { Pills, TextField } from "../ui/fields";
import { Sheet } from "../ui/sheet";
import { useToast } from "../ui/toast";

/** Tipos que entram no cartão. "exame" = testes (FeLV/FIV), só para gatos. */
type RecordType = "vacina" | "vermifugo" | "antipulgas" | "exame";

const TYPES: { value: RecordType; label: string }[] = [
  { value: "vacina", label: "Vacina" },
  { value: "vermifugo", label: "Vermífugo" },
  { value: "antipulgas", label: "Antipulgas" },
];
const CAT_TYPES: { value: RecordType; label: string }[] = [
  { value: "vacina", label: "Vacina" },
  { value: "exame", label: "Teste" },
  { value: "vermifugo", label: "Vermífugo" },
  { value: "antipulgas", label: "Antipulgas" },
];

const RESULTS = ["Negativo", "Positivo", "Inconclusivo"];

/** Registrar uma aplicação (ou teste) direto no cartão. `section` = página aberta no cartão. */
export function AddRecordSheet({ open, onClose, pet, section }: { open: boolean; onClose: () => void; pet: Pet; section?: CardSection }) {
  return (
    <Sheet open={open} onClose={onClose} title="Adicionar registro">
      {open && <Form key={section?.key ?? "vacina"} pet={pet} section={section} onDone={onClose} />}
    </Sheet>
  );
}

/** Próxima dose sugerida: o intervalo do lembrete (ou 1 ano para vacina, 3 meses para vermífugo, 1 mês antipulgas). Teste: nenhuma. */
function suggestNext(care: Care | null, type: RecordType, applied: string) {
  if (type === "exame" && !(care && care.active && care.nextAt)) return "";
  const months = care && (care.freq === "meses" || care.freq === "anos") ? (care.freq === "anos" ? 12 : 1) * care.interval : type === "vacina" ? 12 : type === "vermifugo" ? 3 : 1;
  return toDateStr(addMonths(parseDate(applied), months));
}

function Form({ pet, section, onDone }: { pet: Pet; section?: CardSection; onDone: () => void }) {
  const { repo, cares, reloadData } = useApp();
  const toast = useToast();
  const cat = pet.species === "gato";
  const fileRef = useRef<HTMLInputElement>(null);
  const initialType = (section?.type ?? "vacina") as RecordType;
  const [type, setType] = useState<RecordType>(initialType);
  const options = cares.filter((c) => c.type === type);
  // Abre na vacina da página aberta (ex.: página Antirrábica → antirrábica)
  const [careId, setCareId] = useState<string>(() => (section ? cares.find(section.match) : null)?.id ?? options[0]?.id ?? "novo");
  const [newName, setNewName] = useState(initialType === "exame" ? "Teste FeLV/FIV" : "");
  const [applied, setApplied] = useState(todayStr());
  const care = cares.find((c) => c.id === careId) ?? null;
  const [next, setNext] = useState(() => suggestNext(care, initialType, todayStr()));
  const [result, setResult] = useState<string | null>(null);
  const [clinic, setClinic] = useState(pet.vetName ?? "");
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const test = type === "exame";

  function changeType(t: RecordType) {
    setType(t);
    const first = cares.find((c) => c.type === t) ?? null;
    setCareId(first?.id ?? "novo");
    setNewName(t === "exame" ? "Teste FeLV/FIV" : "");
    setNext(suggestNext(first, t, applied));
  }

  function changeCare(id: string) {
    setCareId(id);
    setNext(suggestNext(cares.find((c) => c.id === id) ?? null, type, applied));
  }

  function changeApplied(d: string) {
    if (!d) return;
    setApplied(d);
    if (!test) setNext(suggestNext(care, type, d));
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
    if (test && !result) {
      setError("Escolha o resultado do teste.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      let target = care;
      if (!target) {
        const c = newCareFor(pet.id, type, pet.species);
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
      await repo.addRecord({ care: target, at, clinic: clinic.trim() || null, photo, next: moves ? nextIso : null, result: test ? result : null });
      await reloadData();
      toast("Registro adicionado ao cartão ✓");
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const vaccines = vaccinesFor(pet.species);

  return (
    <div className="space-y-4 pb-2">
      <Pills options={cat ? CAT_TYPES : TYPES} value={type} onChange={changeType} />

      <label className="block">
        <span className="mb-1 block px-1 text-sm font-bold text-muted">{type === "vacina" ? "Qual vacina" : test ? "Qual teste" : "Qual"}</span>
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
          <option value="novo">{type === "vacina" ? "Outra vacina..." : test ? "Outro teste..." : "Outro..."}</option>
        </select>
      </label>
      {careId === "novo" && (
        <>
          {type === "vacina" && (
            <Pills
              options={vaccines.filter((v) => !options.some((o) => o.title.toLowerCase().includes(v.label.toLowerCase().split(/[ ,]/)[0]))).map((v) => ({ value: v.label, label: v.label }))}
              value={newName}
              onChange={setNewName}
            />
          )}
          <TextField
            label="Nome"
            value={newName}
            onChange={setNewName}
            placeholder={type === "vacina" ? (cat ? "Ex.: V4" : "Ex.: Gripe canina") : test ? "Ex.: Teste FeLV/FIV" : "Nome do produto"}
          />
        </>
      )}

      {type === "antipulgas" && <FleaSafetyNote species={pet.species} />}

      {test && (
        <div>
          <span className="mb-2 block px-1 text-sm font-bold text-muted">Resultado</span>
          <Pills options={RESULTS.map((r) => ({ value: r, label: r }))} value={result} onChange={setResult} />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <TextField label={test ? "Feito em" : "Aplicada em"} type="date" value={applied} max={todayStr()} onChange={changeApplied} />
        <TextField label={test ? "Repetir em (opcional)" : "Próxima dose"} type="date" value={next} onChange={setNext} />
      </div>
      <TextField label="Clínica / veterinário" value={clinic} onChange={setClinic} placeholder="Ex.: Clínica Patas" />

      <div>
        <span className="mb-1 block px-1 text-sm font-bold text-muted">{test ? "Foto do resultado (opcional)" : "Foto da etiqueta / lote (opcional)"}</span>
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
