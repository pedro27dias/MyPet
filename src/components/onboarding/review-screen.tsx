"use client";

import { motion } from "motion/react";
import { ArrowLeft, Info, Pencil } from "lucide-react";
import { useState } from "react";
import { answersBirth, type Answers, type Suggestion } from "@/lib/onboarding";
import { ageText, atTime, fmtDate, toDateStr } from "@/lib/dates";
import { freqText, isAnchored } from "@/lib/schedule";
import { DISCLAIMER, DISCLAIMER_CAT } from "@/lib/guide";
import { CareIcon } from "../care/care-meta";
import { PetAvatar } from "../shared/pet-avatar";
import { Button } from "../ui/button";
import { TextField } from "../ui/fields";
import { CampoData } from "../ui/campo-data";

const SIZE_LABEL = { pequeno: "Pequeno", medio: "Médio", grande: "Grande", gigante: "Gigante" };
const LIFESTYLE_LABEL = { dentro: "Só dentro de casa", as_vezes: "Sai às vezes", sempre: "Sai sempre" };

/** Resumo das respostas + agenda sugerida (tudo editável) antes de criar. */
export function ReviewScreen({
  a,
  suggestions,
  onChange,
  onBack,
  onCreate,
  busy,
  error,
}: {
  a: Answers;
  suggestions: Suggestion[];
  onChange: (s: Suggestion[]) => void;
  onBack: () => void;
  onCreate: () => void;
  busy: boolean;
  error: string | null;
}) {
  const cat = a.species === "gato";
  const name = a.name.trim() || (cat ? "seu gato" : "seu cachorro");
  const { birth } = answersBirth(a);
  const chips = [
    a.breed,
    a.sex === "femea" ? "Fêmea" : a.sex === "macho" ? "Macho" : null,
    ageText(birth),
    !cat && a.size ? SIZE_LABEL[a.size] : null,
    cat && a.lifestyle ? LIFESTYLE_LABEL[a.lifestyle] : null,
    a.neutered === "sim" ? (a.sex === "femea" ? "Castrada" : "Castrado") : null,
    a.hasDisease ? "Doença de base" : null,
    a.hasAllergy ? "Alergia" : null,
  ].filter(Boolean) as string[];
  const update = (k: number, s: Suggestion) => onChange(suggestions.map((x, j) => (j === k ? s : x)));
  const count = suggestions.filter((s) => s.enabled).length;

  return (
    <main className="pt-safe mx-auto min-h-dvh max-w-md px-5 pb-36">
      <header className="flex items-center gap-3 py-3">
        <button type="button" aria-label="Voltar" onClick={onBack} className="grid size-11 place-items-center rounded-full bg-card shadow-card">
          <ArrowLeft size={20} />
        </button>
        <span className="font-bold text-muted">Resumo</span>
      </header>

      <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-2 flex items-center gap-4 rounded-3xl bg-card p-4 shadow-card">
        <PetAvatar url={a.photoPreview} size={72} species={a.species} />
        <div className="min-w-0">
          <h1 className="truncate titulo text-3xl">{a.name.trim() || (cat ? "Meu gato" : "Meu cachorro")}</h1>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {chips.length ? (
              chips.map((c) => (
                <span key={c} className="rounded-full bg-bg px-2.5 py-1 text-xs font-bold text-muted">
                  {c}
                </span>
              ))
            ) : (
              <span className="text-sm text-muted">Dá para completar o perfil depois.</span>
            )}
          </div>
        </div>
      </motion.section>

      <h2 className="mt-8 titulo text-2xl">Agenda sugerida para {name}</h2>
      <p className="mt-1 text-sm text-muted">Baseada nas respostas e na idade. Toque para ajustar ou desmarque o que não quiser.</p>

      <div className="mt-4 space-y-3">
        {suggestions.map((s, k) => (
          <SuggestionCard key={s.care.id} s={s} index={k} onChange={(n) => update(k, n)} />
        ))}
        {suggestions.length === 0 && <p className="rounded-3xl bg-card p-4 text-muted">Nada a sugerir agora. Você pode adicionar cuidados pelo botão +.</p>}
      </div>

      <p className="mt-6 flex gap-2 rounded-3xl bg-peach-soft p-4 text-sm">
        <Info size={18} className="mt-0.5 shrink-0 text-peach" />
        {cat ? DISCLAIMER_CAT : DISCLAIMER}
      </p>

      <footer className="pb-safe fixed inset-x-0 bottom-0 bg-gradient-to-t from-bg via-bg to-transparent px-5 pt-6">
        <div className="mx-auto max-w-md">
          {error && <p className="mb-3 rounded-2xl bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">{error}</p>}
          <Button size="lg" className="w-full" onClick={onCreate} disabled={busy}>
            {busy ? "Criando..." : count ? `Criar agenda (${count} ${count === 1 ? "cuidado" : "cuidados"})` : "Criar perfil"}
          </Button>
        </div>
      </footer>
    </main>
  );
}

function SuggestionCard({ s, index, onChange }: { s: Suggestion; index: number; onChange: (s: Suggestion) => void }) {
  const [editing, setEditing] = useState(false);
  const c = s.care;
  const anchored = isAnchored(c);
  const date = c.nextAt ? toDateStr(new Date(c.nextAt)) : c.start;
  const setCare = (patch: Partial<typeof c>) => onChange({ ...s, care: { ...c, ...patch } });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 * index }}
      className={`rounded-3xl bg-card p-4 shadow-card transition ${s.enabled ? "" : "opacity-55"}`}
    >
      <div className="flex items-start gap-3">
        <CareIcon type={c.type} size={44} />
        <div className="min-w-0 flex-1">
          <p className="font-extrabold leading-tight">{c.title}</p>
          <p className="text-sm font-bold text-primary">
            {anchored ? `${freqText(c)} · desde ${fmtDate(c.start)}` : `${fmtDate(date)} · ${freqText(c)}`}
          </p>
          <p className="mt-1 text-sm text-muted">{s.reason}</p>
        </div>
        <Switch checked={s.enabled} onChange={(v) => onChange({ ...s, enabled: v })} label={`Incluir ${c.title}`} />
      </div>
      {s.enabled && !editing && (
        <button type="button" onClick={() => setEditing(true)} className="mt-2 flex items-center gap-1 text-sm font-bold text-muted">
          <Pencil size={14} /> Ajustar
        </button>
      )}
      {s.enabled && editing && (
        <div className="mt-3 space-y-3 border-t-2 border-line pt-3">
          <TextField label="Nome" value={c.title} onChange={(v) => setCare({ title: v })} />
          {!anchored && (
            <CampoData label="Data" value={date} ahead onChange={(v) => v && setCare({ nextAt: atTime(v, c.times[0] ?? "09:00").toISOString() })} />
          )}
          {(c.freq === "meses" || c.freq === "anos") && (
            <label className="block">
              <span className="mb-1 block px-1 text-sm font-bold text-muted">Repetir</span>
              <select
                value={`${c.freq}:${c.interval}`}
                onChange={(e) => {
                  const [f, n] = e.target.value.split(":");
                  setCare({ freq: f as "meses" | "anos", interval: Number(n) });
                }}
                className="h-13 w-full rounded-2xl border-2 border-line bg-card px-4 font-bold outline-none focus:border-primary"
              >
                {[1, 2, 3, 4, 6, 8].map((n) => (
                  <option key={n} value={`meses:${n}`}>
                    {n === 1 ? "Todo mês" : `A cada ${n} meses`}
                  </option>
                ))}
                <option value="anos:1">Uma vez por ano</option>
                <option value="anos:2">A cada 2 anos</option>
              </select>
            </label>
          )}
          <Button variant="soft" size="sm" onClick={() => setEditing(false)}>
            Pronto
          </Button>
        </div>
      )}
    </motion.div>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-8 w-13 shrink-0 rounded-full transition ${checked ? "bg-primary" : "bg-line"}`}
    >
      <motion.span
        className="absolute top-1 size-6 rounded-full bg-white shadow"
        animate={{ left: checked ? 24 : 4 }}
        transition={{ type: "spring", stiffness: 500, damping: 32 }}
      />
    </button>
  );
}
