"use client";

import { Copy, Share2 } from "lucide-react";
import { useToast } from "../ui/toast";
import { Button } from "../ui/button";

/** Código + link do convite, com "Compartilhar" (WhatsApp etc.) e "Copiar". */
export function InviteCard({ code, petName, demo }: { code: string; petName: string; demo?: boolean }) {
  const toast = useToast();
  const link = typeof window !== "undefined" ? `${window.location.origin}/convite/${code}` : `/convite/${code}`;
  const text = `Vem cuidar ${petName ? `de ${petName} ` : ""}comigo no MyPet! Abra o link: ${link} (ou use o código ${code})`;

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Convite MyPet", text });
        return;
      } catch {
        /* cancelou: tenta copiar */
      }
    }
    await copy();
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      toast("Convite copiado. Cole no WhatsApp.");
    } catch {
      toast("Não foi possível copiar. Mande o código: " + code, { tone: "erro" });
    }
  }

  return (
    <div className="rounded-3xl bg-card p-5 text-center shadow-card">
      <p className="text-sm font-bold text-muted">Código do convite</p>
      <p className="mt-1 text-4xl font-extrabold tracking-[0.25em] text-primary-strong">{code}</p>
      <p className="mt-1 text-xs text-muted">{demo ? "No modo demonstração o convite não funciona de verdade." : "Vale por 7 dias e para uma pessoa."}</p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button size="sm" onClick={share}>
          <Share2 size={16} /> Enviar
        </Button>
        <Button size="sm" variant="soft" onClick={copy}>
          <Copy size={16} /> Copiar
        </Button>
      </div>
    </div>
  );
}
