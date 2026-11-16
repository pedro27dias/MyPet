"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { BookOpen, Dog, House, ListChecks, Plus } from "lucide-react";
import { useState } from "react";
import { AddMenu } from "../care/add-menu";

const TABS = [
  { href: "/", label: "Início", Icon: House },
  { href: "/cuidados", label: "Cuidados", Icon: ListChecks },
  { href: "/guia", label: "Guia", Icon: BookOpen },
  { href: "/pet", label: "Pet", Icon: Dog },
];

/**
 * Barra de navegação flutuante (pílula verde) com bolha rosa que desliza para a aba ativa
 * e o botão + rosa no meio. Fica no layout das abas, então não pisca ao trocar de tela.
 */
export function TabNav() {
  const pathname = usePathname();
  const [addOpen, setAddOpen] = useState(false);

  return (
    <>
      <nav className="pb-safe pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4" aria-label="Menu">
        <div className="pointer-events-auto relative mx-auto grid h-16 max-w-sm grid-cols-5 items-center rounded-full bg-forest px-2 shadow-float">
          {TABS.slice(0, 2).map((t) => (
            <TabLink key={t.href} {...t} active={pathname === t.href} />
          ))}
          <div className="flex justify-center">
            <motion.button
              type="button"
              onClick={() => setAddOpen(true)}
              aria-label="Adicionar"
              aria-expanded={addOpen}
              whileTap={{ scale: 0.88 }}
              animate={{ rotate: addOpen ? 135 : 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 22 }}
              className="-mt-9 grid size-16 place-items-center rounded-full bg-pink text-forest shadow-float ring-[5px] ring-bg"
            >
              <Plus size={30} strokeWidth={2.75} />
            </motion.button>
          </div>
          {TABS.slice(2).map((t) => (
            <TabLink key={t.href} {...t} active={pathname === t.href} />
          ))}
        </div>
      </nav>
      <AddMenu open={addOpen} onClose={() => setAddOpen(false)} />
    </>
  );
}

function TabLink({ href, label, Icon, active }: (typeof TABS)[number] & { active: boolean }) {
  return (
    <Link href={href} aria-label={label} aria-current={active ? "page" : undefined} className="relative flex h-full items-center justify-center">
      {active && (
        <motion.span
          layoutId="nav-bolha"
          className="absolute size-11 rounded-full bg-pink"
          transition={{ type: "spring", stiffness: 420, damping: 32 }}
        />
      )}
      <Icon size={23} strokeWidth={active ? 2.5 : 2} className={`relative transition-colors ${active ? "text-forest" : "text-pink"}`} />
    </Link>
  );
}
