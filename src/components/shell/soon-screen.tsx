"use client";

import { Sparkles } from "lucide-react";
import { TabShell } from "./tab-shell";

/** Aba que entra numa próxima etapa. */
export function SoonScreen({ title, text }: { title: string; text: string }) {
  return (
    <TabShell title={<h1 className="pb-5 pt-6 titulo text-4xl">{title}</h1>}>
      <div className="rounded-3xl bg-card p-6 text-center shadow-card">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-peach-soft text-peach">
          <Sparkles size={28} />
        </span>
        <p className="mt-4 text-lg font-extrabold">Chega na próxima etapa</p>
        <p className="mt-2 text-muted">{text}</p>
      </div>
    </TabShell>
  );
}
