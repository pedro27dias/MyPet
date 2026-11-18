"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, ChevronDown, Info, Search, Siren, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FOOD_DISCLAIMER, FOOD_SOURCES, searchFoods, SECTIONS, STATUS_ICON, STATUS_LABEL, SUMMARY, type FoodStatus } from "@/lib/food-guide";
import type { Species } from "@/lib/types";
import { useApp } from "../app-provider";
import { TextField } from "../ui/fields";

const STATUS_BG: Record<FoodStatus, string> = { ok: "bg-success-soft", cuidado: "bg-warn-soft", nao: "bg-danger-soft" };
const STATUS_FG: Record<FoodStatus, string> = { ok: "text-forest", cuidado: "text-warn", nao: "text-danger" };

function SpeciesSwitch({ value, onChange, id }: { value: Species; onChange: (s: Species) => void; id: string }) {
  return (
    <div className="grid grid-cols-2 gap-1 rounded-full bg-card p-1 shadow-card" role="tablist" aria-label="Espécie">
      {(
        [
          ["cachorro", "🐶 Cão"],
          ["gato", "🐱 Gato"],
        ] as const
      ).map(([v, l]) => (
        <button key={v} type="button" role="tab" aria-selected={value === v} onClick={() => onChange(v)} className="relative h-10 rounded-full text-sm font-bold">
          {value === v && <motion.span layoutId={`especie-${id}`} className="absolute inset-0 rounded-full bg-forest" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
          <span className={`relative ${value === v ? "text-pink" : "text-forest"}`}>{l}</span>
        </button>
      ))}
    </div>
  );
}

/** Resumo de alimentação na aba Guia. */
export function FoodSummary() {
  const { pet } = useApp();
  const [species, setSpecies] = useState<Species>(pet?.species ?? "cachorro");
  const cat = species === "gato";
  return (
    <section className="mt-8">
      <h2 className="titulo mb-3 px-1 text-2xl">Alimentação</h2>
      <SpeciesSwitch value={species} onChange={setSpecies} id="resumo" />
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={species} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="mt-3 space-y-3">
          <div className="rounded-3xl bg-olive-soft p-5">
            <p className="text-sm font-bold uppercase tracking-wide text-olive">⭐ Regra de ouro</p>
            <p className="mt-1 text-[15px] font-semibold leading-snug text-forest">{SUMMARY.golden}</p>
          </div>
          <div className="rounded-3xl bg-danger-soft p-5">
            <p className="font-bold text-danger">❌ Nunca dar</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {SUMMARY.never.map((n) => (
                <span key={n} className="rounded-full bg-card px-2.5 py-1 text-[13px] font-semibold text-ink">
                  {n}
                </span>
              ))}
            </div>
          </div>
          <div className="rounded-3xl bg-card p-5 shadow-card">
            <p className="font-bold text-forest">✅ Pode com moderação</p>
            <ul className="mt-2 space-y-1.5">
              {(cat ? SUMMARY.okCat : SUMMARY.okDog).map((n) => (
                <li key={n} className="flex gap-2 text-[15px] text-ink">
                  <span className="mt-[8px] size-1.5 shrink-0 rounded-full bg-olive" />
                  {n}
                </li>
              ))}
            </ul>
          </div>
          {cat && (
            <div className="rounded-3xl border-2 border-warn/30 bg-warn-soft p-5">
              <p className="font-bold text-warn">⚠️ Lírios</p>
              <p className="mt-1 text-[15px] font-semibold leading-snug text-forest">{SUMMARY.lily}</p>
            </div>
          )}
          <Link
            href={`/guia/alimentacao?especie=${species}`}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-forest text-lg font-bold text-pink shadow-float active:scale-[0.98]"
          >
            Entender melhor a alimentação <ArrowRight size={20} />
          </Link>
        </motion.div>
      </AnimatePresence>
    </section>
  );
}

/** Tela detalhada: Cão | Gato, "Pode comer?", seções em acordeão e fontes. */
export function FoodScreen({ initialSpecies }: { initialSpecies?: Species }) {
  const { pet } = useApp();
  const [species, setSpecies] = useState<Species>(initialSpecies ?? pet?.species ?? "cachorro");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Set<string>>(new Set(["base"]));
  const [showSources, setShowSources] = useState(false);
  const results = searchFoods(query);
  const sections = SECTIONS.filter((s) => !s.only || s.only === species);
  const toggle = (id: string) => setOpen((o) => (o.has(id) ? (o.delete(id), new Set(o)) : new Set(o.add(id))));

  return (
    <main className="pt-safe mx-auto min-h-dvh max-w-md px-5 pb-56">
      <header className="flex items-center gap-3 py-4">
        <Link href="/guia" aria-label="Voltar ao Guia" className="grid size-11 place-items-center rounded-full bg-card shadow-card">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="titulo text-3xl">Alimentação</h1>
      </header>

      <div className="sticky top-2 z-10 space-y-2 rounded-3xl bg-bg/95 pb-2 backdrop-blur">
        <SpeciesSwitch value={species} onChange={setSpecies} id="detalhe" />
        <label className="flex h-13 items-center gap-2 rounded-2xl border-2 border-line bg-card px-4 focus-within:border-forest">
          <Search size={18} className="text-muted" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Pode comer? (ex.: manga)" className="h-full min-w-0 flex-1 bg-transparent outline-none" />
          {query && (
            <button type="button" aria-label="Limpar" onClick={() => setQuery("")} className="text-muted">
              <X size={18} />
            </button>
          )}
        </label>
      </div>

      <AnimatePresence initial={false}>
        {query.trim() && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-2 space-y-2">
            {results.length === 0 ? (
              <p className="rounded-3xl bg-card p-4 text-sm text-muted shadow-card">Não temos “{query.trim()}” na lista. Na dúvida, não ofereça e pergunte ao veterinário.</p>
            ) : (
              results.map((f) => {
                const st = species === "gato" ? f.cat : f.dog;
                const other = species === "gato" ? f.dog : f.cat;
                const how = (species === "gato" ? f.howCat : f.howDog) ?? f.how;
                return (
                  <div key={f.name} className={`rounded-3xl p-4 ${STATUS_BG[st]}`}>
                    <p className="flex items-center gap-2">
                      <span className="text-2xl">{STATUS_ICON[st]}</span>
                      <span className="flex-1 text-lg font-extrabold text-forest">{f.name}</span>
                      <span className={`text-xs font-bold ${STATUS_FG[st]}`}>{STATUS_LABEL[st]}</span>
                    </p>
                    <p className="mt-1 text-[15px] leading-snug text-ink">{how}</p>
                    <p className="mt-2 text-xs font-semibold text-muted">
                      {species === "gato" ? "Para cães" : "Para gatos"}: {STATUS_ICON[other]} {STATUS_LABEL[other].toLowerCase()}
                    </p>
                  </div>
                );
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-4 space-y-2">
        {sections.map((s) => {
          const isOpen = open.has(s.id);
          return (
            <section key={s.id} className={`overflow-hidden rounded-3xl shadow-card ${s.id === "comeu" ? "bg-danger-soft" : "bg-card"}`}>
              <button type="button" aria-expanded={isOpen} onClick={() => toggle(s.id)} className="flex w-full items-center gap-3 p-4 text-left">
                <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-bg text-xl">{s.emoji}</span>
                <span className="flex-1 text-lg font-bold text-forest">{s.title}</span>
                <motion.span animate={{ rotate: isOpen ? 180 : 0 }} className="text-muted">
                  <ChevronDown size={20} />
                </motion.span>
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }}>
                    <div className="px-4 pb-4">
                      {s.intro && <p className="mb-2 rounded-2xl bg-olive-soft px-3 py-2 text-sm font-semibold text-forest">{s.intro}</p>}
                      <ul className="space-y-2">
                        {s.items.map((it) => (
                          <li key={it.text} className="flex gap-2.5 text-[15px] leading-snug text-ink">
                            <span className="w-5 shrink-0 text-center">{it.status ? STATUS_ICON[it.status] : "•"}</span>
                            <span>{it.text}</span>
                          </li>
                        ))}
                      </ul>
                      {s.steps && <AteSomething steps={s.steps} />}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>
          );
        })}
      </div>

      <div className="mt-5">
        <button type="button" onClick={() => setShowSources((v) => !v)} className="text-sm font-bold text-olive underline">
          {showSources ? "Esconder fontes" : "Ver fontes"}
        </button>
        {showSources && (
          <ul className="mt-2 space-y-1 text-sm text-muted">
            {FOOD_SOURCES.map((f) => (
              <li key={f}>• {f}</li>
            ))}
          </ul>
        )}
      </div>

      {/* Rodapé fixo */}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-30 px-4">
        <div className="pointer-events-auto mx-auto flex max-w-md items-start gap-2 rounded-2xl bg-olive-soft/95 px-3 py-2 text-[12px] font-semibold leading-snug text-forest shadow-card backdrop-blur">
          <Info size={15} className="mt-0.5 shrink-0 text-olive" />
          <span className="flex-1">{FOOD_DISCLAIMER}</span>
        </div>
      </div>
    </main>
  );
}

/** "Comeu algo proibido?": passos + anotar o que/quanto/hora + abrir a Central de Emergência. */
function AteSomething({ steps }: { steps: string[] }) {
  const { pet } = useApp();
  const router = useRouter();
  const [what, setWhat] = useState("");
  const [amount, setAmount] = useState("");

  function openSos() {
    if (pet && what.trim()) {
      try {
        localStorage.setItem(`mypet-comeu-${pet.id}`, JSON.stringify({ what: what.trim(), amount: amount.trim(), at: new Date().toISOString() }));
      } catch {
        /* sem armazenamento: segue mesmo assim */
      }
    }
    router.push("/emergencia");
  }

  return (
    <div>
      <ol className="space-y-2">
        {steps.map((s, i) => (
          <li key={s} className="flex gap-3 text-[15px] leading-snug text-ink">
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-danger text-xs font-bold text-white">{i + 1}</span>
            {s}
          </li>
        ))}
      </ol>
      <div className="mt-4 space-y-2 rounded-2xl bg-card p-3">
        <p className="text-sm font-bold text-forest">Anote para mostrar ao veterinário</p>
        <div className="campos-2">
          <TextField label="O que comeu" value={what} onChange={setWhat} placeholder="Ex.: chocolate" />
          <TextField label="Quanto" value={amount} onChange={setAmount} placeholder="Ex.: meia barra" />
        </div>
        <p className="text-xs text-muted">A hora é anotada sozinha ao abrir a Central.</p>
      </div>
      <button type="button" onClick={openSos} className="mt-3 flex h-14 w-full items-center justify-center gap-2 rounded-full bg-danger text-lg font-extrabold text-white active:scale-[0.98]">
        <Siren size={20} /> Abrir Central de Emergência
      </button>
    </div>
  );
}
