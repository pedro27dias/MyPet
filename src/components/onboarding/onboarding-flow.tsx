"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { emptyAnswers, newId, suggestCares, toPetFields, type Answers, type Suggestion } from "@/lib/onboarding";
import { atTime } from "@/lib/dates";
import { useApp } from "../app-provider";
import { Button } from "../ui/button";
import { STEPS } from "./steps";
import { ReviewScreen } from "./review-screen";
import { DoneScreen } from "./done-screen";

/** Cadastro do cachorro: uma pergunta por tela, barra de progresso, "Pular" em todas. */
export function OnboardingFlow() {
  const router = useRouter();
  const { repo, pets, reloadPets } = useApp();
  const [a, setA] = useState<Answers>(emptyAnswers);
  const [i, setI] = useState(0);
  const [dir, setDir] = useState(1);
  const [stage, setStage] = useState<"perguntas" | "resumo" | "pronto">("perguntas");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ petId: string; name: string; ofName: string; count: number; invite: string | null } | null>(null);
  const autoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Respostas mais recentes (o avanço automático roda depois de um pequeno atraso).
  const latest = useRef(a);
  useEffect(() => {
    latest.current = a;
  }, [a]);

  const set = useCallback((patch: Partial<Answers>) => setA((prev) => ({ ...prev, ...patch })), []);

  const go = useCallback(
    (to: number) => {
      if (autoTimer.current) clearTimeout(autoTimer.current);
      if (to >= STEPS.length) {
        setSuggestions(suggestCares(latest.current, "provisorio"));
        setStage("resumo");
        return;
      }
      setDir(to > i ? 1 : -1);
      setI(Math.max(0, to));
    },
    [i],
  );

  // Escolha única avança sozinha, com uma pausa curta para ver a marcação.
  const next = useCallback(() => {
    if (autoTimer.current) clearTimeout(autoTimer.current);
    autoTimer.current = setTimeout(() => go(i + 1), 280);
  }, [go, i]);

  useEffect(() => () => {
    if (autoTimer.current) clearTimeout(autoTimer.current);
  }, []);

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const fields = toPetFields(a);
      if (!fields.name) fields.name = "Meu cachorro";
      const chosen = suggestions.filter((s) => s.enabled);
      const cares = chosen.map((s) => ({ ...s.care, id: newId() }));
      const history = chosen
        .map((s, k) => (s.lastDone ? { careId: cares[k].id, at: atTime(s.lastDone, "09:00").toISOString() } : null))
        .filter((h): h is { careId: string; at: string } => h !== null);
      const petId = await repo.createPet(fields, cares, history);
      let photoFailed = false;
      if (a.photo) {
        try {
          await repo.setPetPhoto(petId, a.photo);
        } catch {
          photoFailed = true;
        }
      }
      let invite: string | null = null;
      if (a.inviteTutor) {
        try {
          invite = await repo.createInvite(petId);
        } catch {
          invite = null;
        }
      }
      await reloadPets(petId);
      const ofName = fields.name === "Meu cachorro" ? "do seu cachorro" : `${fields.sex === "femea" ? "da" : fields.sex === "macho" ? "do" : "de"} ${fields.name}`;
      setResult({ petId, name: fields.name, ofName, count: cares.length, invite });
      setStage("pronto");
      if (photoFailed) setError("A foto não foi enviada. Dá para colocar depois na aba Pet.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (stage === "pronto" && result) {
    return <DoneScreen {...result} photo={a.photoPreview} warning={error} onFinish={() => router.replace("/")} mode={repo.mode} />;
  }

  if (stage === "resumo") {
    return (
      <ReviewScreen
        a={a}
        suggestions={suggestions}
        onChange={setSuggestions}
        onBack={() => setStage("perguntas")}
        onCreate={create}
        busy={busy}
        error={error}
      />
    );
  }

  const step = STEPS[i];
  const progress = (i + 1) / (STEPS.length + 1);

  return (
    <main className="pt-safe mx-auto flex min-h-dvh max-w-md flex-col px-5">
      <header className="flex items-center gap-3 py-3">
        <button
          type="button"
          aria-label={i === 0 ? "Sair" : "Voltar"}
          onClick={() => (i === 0 ? (pets.length ? router.replace("/") : router.back()) : go(i - 1))}
          className="grid size-11 place-items-center rounded-full bg-card text-fg shadow-card active:scale-95"
        >
          {i === 0 ? <X size={20} /> : <ArrowLeft size={20} />}
        </button>
        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={Math.round(progress * 100)}>
          <div className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out" style={{ width: `${progress * 100}%` }} />
        </div>
        <button type="button" onClick={() => go(i + 1)} className="h-11 rounded-full px-3 font-bold text-muted active:scale-95">
          Pular
        </button>
      </header>

      <div className="relative flex-1 overflow-hidden">
        <AnimatePresence mode="popLayout" custom={dir} initial={false}>
          <motion.section
            key={step.key}
            custom={dir}
            variants={{
              enter: (d: number) => ({ x: d * 60, opacity: 0 }),
              center: { x: 0, opacity: 1 },
              exit: (d: number) => ({ x: d * -60, opacity: 0 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.28, ease: [0.25, 0.8, 0.25, 1] }}
            className="pb-32 pt-4"
          >
            <p className="text-sm font-bold text-primary">
              {i + 1} de {STEPS.length}
            </p>
            <h1 className="mt-1 titulo text-[2rem] leading-tight">{step.title(a)}</h1>
            {step.hint && <p className="mt-2 text-muted">{step.hint}</p>}
            <div className="mt-6">
              <step.Body a={a} set={set} next={next} />
            </div>
          </motion.section>
        </AnimatePresence>
      </div>

      <footer className="pb-safe fixed inset-x-0 bottom-0 bg-gradient-to-t from-bg via-bg to-transparent px-5 pt-6">
        <div className="mx-auto max-w-md">
          <Button size="lg" className="w-full" onClick={() => go(i + 1)}>
            {i === STEPS.length - 1 ? "Ver a agenda" : "Continuar"}
          </Button>
        </div>
      </footer>
    </main>
  );
}
