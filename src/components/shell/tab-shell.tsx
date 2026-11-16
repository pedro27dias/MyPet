"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "motion/react";
import { BookOpen, ChevronDown, Dog, House, ListChecks, Plus } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useApp } from "../app-provider";
import { PetAvatar } from "../shared/pet-avatar";
import { Sheet } from "../ui/sheet";
import { AddMenu } from "../care/add-menu";

const TABS = [
  { href: "/", label: "Início", Icon: House },
  { href: "/cuidados", label: "Cuidados", Icon: ListChecks },
  { href: "/guia", label: "Guia", Icon: BookOpen },
  { href: "/pet", label: "Pet", Icon: Dog },
];

/** Moldura das 4 abas: seletor de pet (só com 2+), menu de baixo e botão + flutuante. */
export function TabShell({ children, title }: { children: ReactNode; title?: ReactNode }) {
  const pathname = usePathname();
  const [addOpen, setAddOpen] = useState(false);

  return (
    <div className="mx-auto min-h-dvh max-w-md">
      <div className="pt-safe px-5">
        <PetSwitcher />
        {title}
      </div>
      <motion.main
        key={pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="px-5 pb-36"
      >
        {children}
      </motion.main>

      <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card/95 backdrop-blur" aria-label="Menu">
        <div className="relative mx-auto grid max-w-md grid-cols-5 items-end px-2 pt-2">
          {TABS.slice(0, 2).map((t) => (
            <TabLink key={t.href} {...t} active={pathname === t.href} />
          ))}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              aria-label="Adicionar"
              className="-mt-8 grid size-16 place-items-center rounded-full bg-primary text-on-primary shadow-float ring-4 ring-bg transition active:scale-90"
            >
              <Plus size={30} strokeWidth={2.75} />
            </button>
          </div>
          {TABS.slice(2).map((t) => (
            <TabLink key={t.href} {...t} active={pathname === t.href} />
          ))}
        </div>
      </nav>

      <AddMenu open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}

function TabLink({ href, label, Icon, active }: (typeof TABS)[number] & { active: boolean }) {
  return (
    <Link href={href} className="flex flex-col items-center gap-0.5 py-1" aria-current={active ? "page" : undefined}>
      <span className={`grid h-8 w-14 place-items-center rounded-full transition ${active ? "bg-primary-soft text-primary-strong" : "text-faint"}`}>
        <Icon size={24} strokeWidth={active ? 2.5 : 2} />
      </span>
      <span className={`text-xs font-bold ${active ? "text-fg" : "text-faint"}`}>{label}</span>
    </Link>
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
        <PetAvatar url={pet.photoUrl} size={30} />
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
              <PetAvatar url={p.photoUrl} size={48} />
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
            Adicionar outro cachorro
          </button>
        </div>
      </Sheet>
    </>
  );
}
