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

/** Primeira tela depois do login, quando ainda não há cachorro. */
export function Welcome() {
  const { user, repo } = useApp();
  const router = useRouter();
  const [codeOpen, setCodeOpen] = useState(false);
  const [code, setCode] = useState("");
  const first = user.name.split(" ")[0];

  return (
    <main className="pt-safe mx-auto flex min-h-dvh max-w-md flex-col px-6 pb-10">
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", damping: 14 }}>
          <LogoMark size={88} />
        </motion.div>
        <motion.h1
          className="mt-8 text-3xl font-extrabold"
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          Oi{first && first !== "Você" ? `, ${first}` : ""}! 🐾
        </motion.h1>
        <motion.p className="mt-3 text-lg text-muted" initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.18 }}>
          Vamos montar a agenda de cuidados do seu cachorro. Leva uns 3 minutos e dá para pular qualquer pergunta.
        </motion.p>
      </div>
      <div className="space-y-3">
        <Link
          href="/novo-pet"
          className="flex h-16 w-full items-center justify-center gap-2 rounded-full bg-primary text-lg font-extrabold text-on-primary shadow-[0_6px_16px_rgb(63_143_127/0.28)] transition active:scale-[0.97]"
        >
          <Plus size={22} strokeWidth={3} /> Adicionar meu cachorro
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
