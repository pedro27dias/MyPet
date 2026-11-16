"use client";

import { Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { InvitePreview } from "@/lib/types";
import { useApp } from "../app-provider";
import { Button } from "../ui/button";

/** /convite/CODIGO — "Você foi convidado para cuidar da Mel". */
export function AcceptInvite({ code }: { code: string }) {
  const { repo, reloadPets } = useApp();
  const router = useRouter();
  const [preview, setPreview] = useState<InvitePreview | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    repo.peekInvite(code).then(setPreview, (e: Error) => setError(e.message));
  }, [repo, code]);

  async function accept() {
    setBusy(true);
    setError(null);
    try {
      const petId = await repo.acceptInvite(code);
      await reloadPets(petId);
      router.replace("/");
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 text-center">
      <span className="grid size-20 place-items-center rounded-full bg-primary-soft text-primary">
        <Users size={36} />
      </span>
      {preview === undefined && !error ? (
        <p className="mt-6 text-muted">Abrindo convite...</p>
      ) : preview ? (
        <>
          <h1 className="mt-6 text-2xl font-extrabold">Cuidar de {preview.pet}</h1>
          <p className="mt-2 text-muted">
            {preview.from ? `${preview.from} convidou você` : "Você foi convidado"} para acompanhar os cuidados de {preview.pet}.
          </p>
          {!preview.valid && <p className="mt-3 font-semibold text-danger">Este convite já foi usado ou venceu. Peça um novo.</p>}
          {error && <p className="mt-3 rounded-2xl bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">{error}</p>}
          <Button size="lg" className="mt-8 w-full" onClick={accept} disabled={busy || !preview.valid}>
            {busy ? "Entrando..." : "Aceitar convite"}
          </Button>
        </>
      ) : (
        <>
          <h1 className="mt-6 text-2xl font-extrabold">Convite não encontrado</h1>
          <p className="mt-2 text-muted">{error ?? `Confira o código ${code.toUpperCase()}.`}</p>
        </>
      )}
      <Button variant="ghost" className="mt-3" onClick={() => router.replace("/")}>
        Voltar
      </Button>
    </main>
  );
}
