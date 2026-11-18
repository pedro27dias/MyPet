"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "motion/react";
import { ArrowLeft, Check, ChevronDown, IdCard, Plus } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useApp } from "../app-provider";
import { PetAvatar } from "../shared/pet-avatar";
import { Sheet } from "../ui/sheet";

/** Moldura de cada aba: topo (pílula do pet + botão Perfil), título e conteúdo. A barra de baixo fica em tab-nav.tsx. */
export function TabShell({ children, title }: { children: ReactNode; title?: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="mx-auto min-h-dvh max-w-md">
      <div className="pt-safe px-5">
        <TopBar />
        {title}
      </div>
      <motion.main
        key={pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.25, 0.8, 0.25, 1] }}
        className="pb-barra px-5"
      >
        {children}
      </motion.main>
    </div>
  );
}

/**
 * Topo de todas as abas: à esquerda a pílula do pet (troca de pet), à direita o botão "Perfil".
 * Na própria tela de perfil, o botão da direita vira "Voltar".
 */
function TopBar() {
  const { pets, pet, selectPet } = useApp();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  if (!pet) return null;
  const onProfile = pathname === "/pet";
  return (
    <>
      <div className="flex items-center justify-between gap-3 pt-3">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`Trocar de pet (agora: ${pet.name})`}
          className="flex h-10 min-w-0 items-center gap-2 rounded-full bg-card py-1 pl-1 pr-3 shadow-card active:scale-95"
        >
          <PetAvatar url={pet.photoUrl} species={pet.species} size={32} />
          <span className="min-w-0 truncate font-bold text-forest">{pet.name}</span>
          <ChevronDown size={16} className="shrink-0 text-muted" />
        </button>
        {onProfile ? (
          <motion.div whileTap={{ scale: 0.94 }} className="shrink-0">
            <Link href="/" className="flex h-10 items-center gap-1.5 rounded-full border border-pink-strong bg-card px-3.5 text-sm font-bold text-forest">
              <ArrowLeft size={16} /> Voltar
            </Link>
          </motion.div>
        ) : (
          <motion.div whileTap={{ scale: 0.94 }} className="shrink-0">
            <Link href="/pet" aria-label={`Perfil de ${pet.name}`} className="flex h-10 items-center gap-1.5 rounded-full border border-pink-strong bg-card px-3.5 text-sm font-bold text-forest">
              <IdCard size={17} /> Perfil
            </Link>
          </motion.div>
        )}
      </div>
      <Sheet open={open} onClose={() => setOpen(false)} title="Trocar de pet">
        <div className="space-y-2">
          {pets.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => (selectPet(p.id), setOpen(false))}
              aria-pressed={p.id === pet.id}
              className={`flex w-full items-center gap-3 rounded-3xl border-2 p-3 text-left ${p.id === pet.id ? "border-primary bg-primary-soft" : "border-line"}`}
            >
              <PetAvatar url={p.photoUrl} species={p.species} size={48} />
              <span className="min-w-0 flex-1 truncate text-lg font-bold">{p.name}</span>
              {p.id === pet.id && (
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-forest text-pink">
                  <Check size={18} strokeWidth={3} />
                </span>
              )}
            </button>
          ))}
          <button
            type="button"
            onClick={() => (setOpen(false), router.push("/novo-pet"))}
            className="flex w-full items-center gap-3 rounded-3xl border-2 border-dashed border-line p-3 font-bold text-primary"
          >
            <span className="grid size-12 place-items-center rounded-full bg-primary-soft">
              <Plus size={22} />
            </span>
            Adicionar pet
          </button>
        </div>
      </Sheet>
    </>
  );
}
