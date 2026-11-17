"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Plus, Ticket } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "../app-provider";
import { LogoMark } from "./logo-mark";
import { Sheet } from "../ui/sheet";
import { Button } from "../ui/button";

/** Primeira tela depois do login, quando ainda não há pet. */
export function Welcome() {
  const { user, repo } = useApp();
  const router = useRouter();
  const [codeOpen, setCodeOpen] = useState(false);
  const [code, setCode] = useState("");
  const first = user.name.split(" ")[0];

  return (
    <main className="pt-safe mx-auto flex min-h-dvh max-w-md flex-col px-6 pb-10">
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <motion.div
          className="relative"
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 14 }}
        >
          {/* Exemplo de perfil: a Canela */}
          <span className="block size-44 overflow-hidden rounded-full bg-pink-soft ring-8 ring-card shadow-card">
            {/* eslint-disable-next-line @next/next/no-img-element -- imagem fixa do app */}
            <img src="/exemplo/canela-avatar.png" alt="Canela, exemplo de foto de perfil" className="size-full object-cover" />
          </span>
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-forest px-4 py-1.5 text-sm font-bold text-pink shadow-card">
            <span className="titulo !text-pink">Canela</span> · 2 anos
          </span>
          <span className="absolute -right-3 top-2">
            <LogoMark size={44} />
          </span>
        </motion.div>
        <motion.h1
          className="mt-10 text-[2rem] font-bold leading-tight text-forest"
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          Oi{first && first !== "Você" ? `, ` : ""}
          {first && first !== "Você" && <span className="titulo">{first}</span>}!
        </motion.h1>
        <motion.p className="mt-3 text-lg text-muted" initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.18 }}>
          Vamos montar a agenda de cuidados do seu cachorro ou gato. Leva uns 3 minutos e dá para pular qualquer pergunta.
        </motion.p>
      </div>
      <div className="space-y-3">
        <Link
          href="/novo-pet"
          className="flex h-16 w-full items-center justify-center gap-2 rounded-full bg-primary text-lg font-extrabold text-on-primary shadow-[0_6px_16px_rgb(43_67_33/0.25)] transition active:scale-[0.97]"
        >
          <Plus size={22} strokeWidth={3} /> Adicionar meu pet
        </Link>
        {repo.mode === "nuvem" && (
          <Button variant="ghost" className="w-full" onClick={() => setCodeOpen(true)}>
            <Ticket size={18} /> Tenho um código de convite
          </Button>
        )}
      </div>

      <Sheet open={codeOpen} onClose={() => setCodeOpen(false)} title="Código de convite">
        <p className="mb-3 text-muted">Digite o código que o outro tutor te mandou.</p>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          maxLength={6}
          placeholder="EX: A7K2Q9"
          className="h-14 w-full rounded-2xl border-2 border-line bg-bg px-4 text-center text-2xl font-extrabold tracking-[0.3em] outline-none focus:border-primary"
        />
        <Button className="mt-4 w-full" size="lg" disabled={code.trim().length < 6} onClick={() => router.push(`/convite/${code.trim()}`)}>
          Continuar
        </Button>
      </Sheet>
    </main>
  );
}
