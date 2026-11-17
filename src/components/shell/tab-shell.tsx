"use client";

import { usePathname, useRouter } from "next/navigation";
import { motion } from "motion/react";
import { ChevronDown, Plus } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useApp } from "../app-provider";
import { PetAvatar } from "../shared/pet-avatar";
import { Sheet } from "../ui/sheet";

/** Moldura de cada aba: seletor de pet (só com 2+), título e conteúdo. A barra de baixo fica em tab-nav.tsx. */
export function TabShell({ children, title }: { children: ReactNode; title?: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="mx-auto min-h-dvh max-w-md">
      <div className="pt-safe px-5">
        <PetSwitcher />
        {title}
      </div>
      <motion.main
        key={pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.25, 0.8, 0.25, 1] }}
        className="px-5 pb-36"
      >
        {children}
      </motion.main>
    </div>
  );
}

/** Com um pet só, não aparece nada. Com dois ou mais, um botão para trocar. */
function PetSwitcher() {
  const { pets, pet, selectPet } = useApp();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  if (pets.length < 2 || !pet) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 flex items-center gap-2 rounded-full bg-card py-1 pl-1 pr-3 shadow-card active:scale-95"
      >
        <PetAvatar url={pet.photoUrl} species={pet.species} size={30} />
        <span className="font-bold">{pet.name}</span>
        <ChevronDown size={16} className="text-muted" />
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Qual pet?">
        <div className="space-y-2">
          {pets.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => (selectPet(p.id), setOpen(false))}
              className={`flex w-full items-center gap-3 rounded-3xl border-2 p-3 text-left ${p.id === pet.id ? "border-primary bg-primary-soft" : "border-line"}`}
            >
              <PetAvatar url={p.photoUrl} species={p.species} size={48} />
              <span className="text-lg font-bold">{p.name}</span>
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
            Adicionar outro pet
          </button>
        </div>
      </Sheet>
    </>
  );
}
