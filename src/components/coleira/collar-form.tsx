"use client";

/* eslint-disable @next/next/no-img-element -- prévia local da foto */
import { Camera, Check, Info, ShieldAlert, TriangleAlert, X } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  brandsFor,
  CAT_DANGER_TEXT,
  HOUSE_CAT_TEXT,
  isDogOnlyCollar,
  lastPlaced,
  LEISH_CAT_TEXT,
  OVERLAP_TEXT,
  START_TEXT,
  TARGETS,
  tooYoung,
} from "@/lib/collar";
import { addMonths, atTime, fmtLongDate, parseDate, toDateStr, todayStr } from "@/lib/dates";
import { normalize } from "@/lib/breeds";
import { compressPhoto } from "@/lib/photo";
import type { Care, CollarTarget } from "@/lib/types";
import { useApp } from "../app-provider";
import { AnimatedCheck } from "../shared/animated-check";
import { Button } from "../ui/button";
import { Pills, Stepper, TextField } from "../ui/fields";
import { useToast } from "../ui/toast";

const OUTRA = "__outra__";

/** Cadastro (ou edição) da coleira: uma tela só. */
export function CollarForm({ initial, onDone }: { initial: Care; onDone: () => void }) {
  const { repo, cares, records, pets, reloadData } = useApp();
  const toast = useToast();
  const pet = pets.find((p) => p.id === initial.petId) ?? null;
  const species = pet?.species ?? "cachorro";
  const cat = species === "gato";
  const brands = brandsFor(species);
  const isNew = !cares.some((c) => c.id === initial.id);
  const fileRef = useRef<HTMLInputElement>(null);

  const knownBrand = brands.find((b) => normalize(b.name) === normalize(initial.detail ?? ""));
  const [protects, setProtects] = useState<CollarTarget[]>((initial.protects ?? []).filter((t) => !(cat && t === "leish")));
  const [brandChoice, setBrandChoice] = useState<string>(knownBrand?.name ?? (initial.detail ? OUTRA : brands[0].name));
  const [otherBrand, setOtherBrand] = useState(knownBrand ? "" : (initial.detail ?? ""));
  const [placed, setPlaced] = useState(() => (isNew ? todayStr() : toDateStr(lastPlaced(initial, records))));
  const [months, setMonths] = useState(initial.interval || knownBrand?.months || brands[0].months || 6);
  const [notifyDays, setNotifyDays] = useState(String(initial.notifyBeforeMin ? Math.round(initial.notifyBeforeMin / 1440) : isNew ? 7 : 0));
  const [minWeeks, setMinWeeks] = useState<number | null>(initial.minAgeWeeks ?? knownBrand?.minWeeks ?? (isNew ? brands[0].minWeeks : null));
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Foto da embalagem já guardada
  useEffect(() => {
    if (!initial.photo) return;
    repo.photoUrls([initial.photo]).then((u) => setPreview((p) => p ?? u[initial.photo!] ?? null), () => {});
  }, [repo, initial.photo]);

  const brand = brandChoice === OUTRA ? otherBrand.trim() : brandChoice;
  const dogOnly = isDogOnlyCollar(brand);
  const catDanger = cat && dogOnly;
  const houseCat = !cat && (dogOnly || protects.includes("leish")) && pets.some((p) => p.species === "gato");
  const young = tooYoung(pet?.birth ?? null, minWeeks);
  const otherFlea = cares.some((c) => c.petId === initial.petId && c.type === "antipulgas" && c.active);
  const nextDate = addMonths(parseDate(placed), months);

  function chooseBrand(name: string) {
    setBrandChoice(name);
    const b = brands.find((x) => x.name === name);
    if (b?.months) setMonths(b.months);
    setMinWeeks(b ? b.minWeeks : null);
  }

  function toggle(t: CollarTarget) {
    if (cat && t === "leish") return;
    setProtects((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }

  async function pick(file?: File) {
    if (!file) return;
    try {
      const b = await compressPhoto(file, 1000);
      setPhoto(b);
      setPreview(URL.createObjectURL(b));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function save(active = true) {
    if (!pet) return;
    if (catDanger && active) return setError("Este produto não é para gatos. Escolha outra coleira.");
    if (!protects.length && active) return setError("Marque contra o que a coleira protege.");
    if (brandChoice === OUTRA && !brand && active) return setError("Escreva a marca da coleira.");
    setBusy(true);
    setError(null);
    try {
      const path = photo ? await repo.uploadPhoto(pet.id, photo, "coleira") : (initial.photo ?? null);
      const care: Care = {
        ...initial,
        type: "coleira",
        title: brand ? `Coleira ${brand}` : "Coleira",
        detail: brand || null,
        protects,
        freq: "meses",
        interval: months,
        start: placed,
        nextAt: atTime(nextDate, initial.times[0] ?? "09:00").toISOString(),
        notifyBeforeMin: Number(notifyDays) ? Number(notifyDays) * 1440 : null,
        minAgeWeeks: minWeeks,
        photo: path,
        active,
      };
      await repo.saveCare(care);
      // Colocar a coleira já é a primeira "troca" (entra no histórico e no cartão)
      if (isNew) await repo.addRecord({ care, at: atTime(placed, "09:00").toISOString() });
      await reloadData();
      if (isNew) setSaved(true);
      else {
        toast(active ? "Coleira atualizada ✓" : "Coleira parada.");
        onDone();
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (saved) {
    return (
      <div className="flex flex-col items-center pb-2 pt-2 text-center">
        <AnimatedCheck size={72} />
        <p className="mt-4 titulo text-2xl">Coleira cadastrada!</p>
        <p className="mt-1 text-muted">
          Troca em <b className="text-forest">{fmtLongDate(nextDate)}</b>.
        </p>
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-5 flex items-start gap-2 rounded-2xl bg-olive-soft px-4 py-3 text-left text-sm font-semibold text-forest"
        >
          <Info size={18} className="mt-0.5 shrink-0 text-olive" />
          {START_TEXT}
        </motion.p>
        <Button size="lg" className="mt-6 w-full" onClick={onDone}>
          Entendi
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-2">
      <Field label="Protege contra">
        <div className="space-y-2">
          {TARGETS.map((t) => {
            const disabled = cat && t.value === "leish";
            const sel = protects.includes(t.value);
            return (
              <div key={t.value}>
                <button
                  type="button"
                  disabled={disabled}
                  aria-pressed={sel}
                  onClick={() => toggle(t.value)}
                  className={`flex w-full items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left font-bold transition active:scale-[0.98] disabled:opacity-45 ${
                    sel ? "border-forest bg-olive-soft text-forest" : "border-line bg-card"
                  }`}
                >
                  <span className={`grid size-6 shrink-0 place-items-center rounded-md ${sel ? "bg-forest text-pink" : "border-2 border-line"}`}>
                    {sel && <Check size={15} strokeWidth={3} />}
                  </span>
                  {t.label}
                </button>
                {disabled && <p className="mt-1 px-1 text-xs font-semibold text-danger">{LEISH_CAT_TEXT}</p>}
              </div>
            );
          })}
        </div>
      </Field>

      <Field label="Marca">
        <Pills options={[...brands.map((b) => ({ value: b.name, label: b.name })), { value: OUTRA, label: "Outra" }]} value={brandChoice} onChange={chooseBrand} />
        {brandChoice === OUTRA && (
          <div className="mt-3">
            <TextField value={otherBrand} onChange={setOtherBrand} placeholder="Nome da coleira ou princípio ativo" autoFocus={isNew} />
          </div>
        )}
      </Field>

      {catDanger && (
        <Alert tone="danger" icon={<ShieldAlert size={22} />}>
          {CAT_DANGER_TEXT}
        </Alert>
      )}
      {houseCat && <Alert tone="warn">{HOUSE_CAT_TEXT}</Alert>}
      {otherFlea && isNew && <Alert tone="warn">{OVERLAP_TEXT}</Alert>}

      <label className="block">
        <span className="mb-1 block px-1 text-sm font-bold text-muted">Colocou em</span>
        <input
          type="date"
          value={placed}
          max={todayStr()}
          onChange={(e) => e.target.value && setPlaced(e.target.value)}
          className="h-13 w-full rounded-2xl border-2 border-line bg-card px-4 font-bold text-fg outline-none focus:border-primary"
        />
      </label>

      <Field label="Duração">
        <Stepper label={months === 1 ? "mês" : "meses"} value={months} min={1} max={12} onChange={setMonths} />
        <p className="mt-1.5 px-1 text-sm text-muted">Confira a duração na embalagem.</p>
        <p className="px-1 text-sm font-semibold text-olive">→ Troca em {fmtLongDate(nextDate)}</p>
      </Field>

      <Field label="Avisar antes da troca">
        <Pills
          options={[
            { value: "7", label: "7 dias antes" },
            { value: "3", label: "3 dias antes" },
            { value: "0", label: "No dia" },
          ]}
          value={notifyDays}
          onChange={setNotifyDays}
        />
      </Field>

      {brandChoice === OUTRA && (
        <TextField
          label="Idade mínima da embalagem (semanas, opcional)"
          type="number"
          inputMode="numeric"
          value={minWeeks ? String(minWeeks) : ""}
          onChange={(v) => setMinWeeks(Number(v.replace(/\D/g, "")) || null)}
          placeholder="Ex.: 10"
        />
      )}
      {young && (
        <Alert tone="warn">
          {pet?.name} ainda não tem a idade mínima desta coleira ({minWeeks} semanas). Fale com o veterinário antes de usar.
        </Alert>
      )}

      <div>
        <span className="mb-1 block px-1 text-sm font-bold text-muted">Foto da embalagem (opcional)</span>
        {preview ? (
          <div className="relative w-fit">
            <img src={preview} alt="Embalagem da coleira" className="h-28 rounded-2xl object-cover" />
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
      <Button size="lg" className="w-full" disabled={busy || catDanger} onClick={() => save(true)}>
        {busy ? "Salvando..." : isNew ? "Cadastrar coleira" : "Salvar"}
      </Button>
      {!isNew && initial.active && (
        <Button variant="ghost" className="w-full" disabled={busy} onClick={() => save(false)}>
          Parar esta coleira
        </Button>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <span className="mb-2 block px-1 text-sm font-bold text-muted">{label}</span>
      {children}
    </div>
  );
}

function Alert({ tone, icon, children }: { tone: "danger" | "warn"; icon?: ReactNode; children: ReactNode }) {
  return (
    <motion.p
      role="alert"
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`flex items-start gap-2 rounded-2xl px-4 py-3 text-sm font-bold ${
        tone === "danger" ? "border-2 border-danger bg-danger-soft text-danger" : "bg-warn-soft text-warn"
      }`}
    >
      <span className="mt-0.5 shrink-0">{icon ?? <TriangleAlert size={18} />}</span>
      {children}
    </motion.p>
  );
}
