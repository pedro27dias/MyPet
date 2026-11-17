"use client";

import { motion } from "motion/react";
import { AnimatedCheck } from "../shared/animated-check";
import { InviteCard } from "../shared/invite-card";
import { PetAvatar } from "../shared/pet-avatar";
import { Button } from "../ui/button";
import type { Species } from "@/lib/types";

/** "Criamos a agenda da Mel!" */
export function DoneScreen({
  name,
  ofName,
  count,
  invite,
  photo,
  species,
  warning,
  mode,
  onFinish,
}: {
  petId: string;
  name: string;
  ofName: string;
  count: number;
  invite: string | null;
  photo: string | null;
  species: Species | null;
  warning: string | null;
  mode: "nuvem" | "demo";
  onFinish: () => void;
}) {
  return (
    <main className="pt-safe mx-auto flex min-h-dvh max-w-md flex-col px-6 pb-10">
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <div className="relative">
          <PetAvatar url={photo} size={120} species={species} />
          <span className="absolute -bottom-2 -right-2">
            <AnimatedCheck size={52} />
          </span>
        </div>
        <motion.h1 className="mt-8 titulo text-4xl leading-tight" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          Criamos a agenda {ofName}!
        </motion.h1>
        <motion.p className="mt-3 text-lg text-muted" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          {count
            ? `${count} ${count === 1 ? "cuidado já está" : "cuidados já estão"} na agenda. Cada um aparece no Início no dia certo.`
            : "O perfil está pronto. Adicione cuidados pelo botão +."}
        </motion.p>
        {warning && <p className="mt-4 rounded-2xl bg-warn-soft px-4 py-3 text-sm font-semibold text-warn">{warning}</p>}
        {invite && (
          <motion.div className="mt-8 w-full" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
            <InviteCard code={invite} petName={name} demo={mode === "demo"} />
          </motion.div>
        )}
      </div>
      <Button size="lg" className="w-full" onClick={onFinish}>
        Ir para o início
      </Button>
    </main>
  );
}
