"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Bug, Heart, Info, Siren, Syringe, Tablets, Utensils, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { ageText } from "@/lib/dates";
import { GUIDE, WARNING_SIGNS, petPhase, type Phase, type TopicKey } from "@/lib/guide";
import { useApp } from "../app-provider";
import { PetAvatar } from "../shared/pet-avatar";
import { TabShell } from "../shell/tab-shell";

const TOPIC_STYLE: Record<TopicKey, { Icon: LucideIcon; fg: string; bg: string }> = {
  vacinas: { Icon: Syringe, fg: "text-t-vacina", bg: "bg-t-vacina-soft" },
  vermifugo: { Icon: Tablets, fg: "text-t-vermifugo", bg: "bg-t-vermifugo-soft" },
  pulgas: { Icon: Bug, fg: "text-t-antipulgas", bg: "bg-t-antipulgas-soft" },
  alimentacao: { Icon: Utensils, fg: "text-olive", bg: "bg-olive-soft" },
  cuidados: { Icon: Heart, fg: "text-t-consulta", bg: "bg-pink-soft" },
};

/** Aba Guia: orientações por fase (filhote, adulto, idoso), com a fase do pet em destaque. */
export function GuiaScreen() {
  const { pet } = useApp();
  const current = pet ? petPhase(pet) : null;
  const [phase, setPhase] = useState<Phase>(current ?? "adulto");
  if (!pet) return null;
  const data = GUIDE.find((g) => g.key === phase)!;
  const isCurrent = phase === current;

  return (
    <TabShell title={<h1 className="titulo pb-4 pt-6 text-4xl">Guia</h1>}>
      {/* Aviso fixo (acompanha a rolagem) */}
      <div className="sticky top-2 z-10 -mx-1 mb-5">
        <p className="flex items-center gap-2 rounded-2xl bg-olive-soft px-4 py-2.5 text-sm font-semibold text-forest shadow-card">
          <Info size={18} className="shrink-0 text-olive" />
          Informações gerais. Siga sempre a orientação do seu veterinário.
        </p>
      </div>

      {/* Fases */}
      <div className="grid grid-cols-3 gap-1 rounded-full bg-card p-1 shadow-card" role="tablist" aria-label="Fase da vida">
        {GUIDE.map((g) => {
          const sel = g.key === phase;
          return (
            <button
              key={g.key}
              type="button"
              role="tab"
              aria-selected={sel}
              onClick={() => setPhase(g.key)}
              className="relative h-11 rounded-full text-sm font-bold"
            >
              {sel && (
                <motion.span layoutId="guia-fase" className="absolute inset-0 rounded-full bg-forest" transition={{ type: "spring", stiffness: 420, damping: 34 }} />
              )}
              <span className={`relative ${sel ? "text-pink" : "text-forest"}`}>
                {g.label}
                {g.key === current && <span className={`ml-1 inline-block size-1.5 -translate-y-0.5 rounded-full ${sel ? "bg-pink" : "bg-pink-strong"}`} aria-label="fase do seu pet" />}
              </span>
            </button>
          );
        })}
      </div>
      {!current && (
        <p className="mt-2 px-2 text-sm text-muted">Sem a idade de {pet.name}, mostramos a fase adulta. Dá para trocar acima.</p>
      )}

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={phase}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: [0.25, 0.8, 0.25, 1] }}
        >
          {/* Cartão da fase */}
          <section className="mt-5 overflow-hidden rounded-[24px] bg-forest p-5 text-pink-soft shadow-float">
            <p className="text-sm font-semibold text-pink/70">{data.range}</p>
            <p className="titulo !text-pink text-4xl leading-tight">{data.label}</p>
            <p className="mt-2 text-pink-soft/90">{data.intro}</p>
            {isCurrent && (
              <div className="mt-4 flex items-center gap-3 rounded-2xl bg-pink/15 p-2.5 pr-4">
                <PetAvatar url={pet.photoUrl} size={40} />
                <p className="text-sm">
                  <b className="text-pink">{pet.name}</b> está nesta fase
                  {ageText(pet.birth) ? ` · ${ageText(pet.birth)}` : ""}
                </p>
              </div>
            )}
          </section>

          {/* Assuntos */}
          <div className="mt-4 space-y-3">
            {data.topics.map((t, i) => {
              const s = TOPIC_STYLE[t.key];
              return (
                <motion.section
                  key={t.key}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * (i + 1) }}
                  className="rounded-3xl bg-card p-5 shadow-card"
                >
                  <h2 className="flex items-center gap-3">
                    <span className={`grid size-11 shrink-0 place-items-center rounded-2xl ${s.bg} ${s.fg}`}>
                      <s.Icon size={22} strokeWidth={2.2} />
                    </span>
                    <span className="text-lg font-bold text-forest">{t.title}</span>
                  </h2>
                  <ul className="mt-3 space-y-2">
                    {t.items.map((item) => (
                      <li key={item} className="flex gap-3 text-[15px] leading-snug text-ink">
                        <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-pink-strong" />
                        {item}
                      </li>
                    ))}
                  </ul>
                  {t.key === "vacinas" && (
                    <Link href="/cuidados" className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-olive">
                      Ver o Cartão de Vacina de {pet.name} <ArrowRight size={16} />
                    </Link>
                  )}
                </motion.section>
              );
            })}

            <motion.section
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * (data.topics.length + 1) }}
              className="rounded-3xl bg-danger-soft p-5"
            >
              <h2 className="flex items-center gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-card text-danger">
                  <Siren size={22} strokeWidth={2.2} />
                </span>
                <span className="text-lg font-bold text-forest">Quando correr para o veterinário</span>
              </h2>
              <ul className="mt-3 space-y-2">
                {WARNING_SIGNS.map((w) => (
                  <li key={w} className="flex gap-3 text-[15px] leading-snug text-ink">
                    <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-danger" />
                    {w}
                  </li>
                ))}
              </ul>
            </motion.section>
          </div>
        </motion.div>
      </AnimatePresence>
    </TabShell>
  );
}
