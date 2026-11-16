"use client";

import { Camera, LogOut, Phone, Plus, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ageText, fmtDate } from "@/lib/dates";
import { compressPhoto } from "@/lib/photo";
import { setDemoMode } from "@/lib/repo";
import { useApp } from "../app-provider";
import { InviteCard } from "../shared/invite-card";
import { PetAvatar } from "../shared/pet-avatar";
import { TabShell } from "../shell/tab-shell";
import { Button } from "../ui/button";
import { Sheet } from "../ui/sheet";
import { useToast } from "../ui/toast";

const SIZE = { pequeno: "Pequeno", medio: "Médio", grande: "Grande", gigante: "Gigante" };
const ORIGIN = { adotado: "Adotado (lar/ONG)", resgatado: "Resgatado da rua", comprado: "Comprado", presente: "Ganhou de presente", outro: "Outro" };

/** Aba Pet (nesta etapa): perfil, foto, tutores e convite. Edição e gastos entram depois. */
export function PetScreen() {
  const { pet, tutors, repo, user, reloadPets } = useApp();
  const router = useRouter();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [invite, setInvite] = useState<string | null>(null);
  const [inviteBusy, setInviteBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  if (!pet) return null;

  const rows: [string, string | null][] = [
    ["Raça", pet.breed],
    ["Sexo", pet.sex === "femea" ? "Fêmea" : pet.sex === "macho" ? "Macho" : null],
    ["Idade", pet.birth ? `${ageText(pet.birth) ?? "—"}${pet.birthApprox ? " (aprox.)" : ` · nasceu em ${fmtDate(pet.birth)}`}` : null],
    ["Porte", pet.size ? SIZE[pet.size] : null],
    ["Origem", pet.origin ? ORIGIN[pet.origin] : null],
    ["Castrado(a)", pet.neutered === null ? null : pet.neutered ? "Sim" : "Não"],
    ["Doença de base", pet.diseases],
    ["Alergias", pet.allergies],
    ["Ração", [pet.foodBrand, pet.foodAmount].filter(Boolean).join(" · ") || null],
    ["Veterinário", pet.vetName],
  ];

  async function changePhoto(file?: File) {
    if (!file || !pet) return;
    setPhotoBusy(true);
    try {
      await repo.setPetPhoto(pet.id, await compressPhoto(file));
      await reloadPets(pet.id);
      toast("Foto atualizada ✓");
    } catch (e) {
      toast((e as Error).message, { tone: "erro" });
    } finally {
      setPhotoBusy(false);
    }
  }

  async function makeInvite() {
    if (!pet) return;
    setInviteBusy(true);
    try {
      setInvite(await repo.createInvite(pet.id));
    } catch (e) {
      toast((e as Error).message, { tone: "erro" });
    } finally {
      setInviteBusy(false);
    }
  }

  async function signOut() {
    try {
      if (repo.mode === "demo") setDemoMode(false);
      await repo.signOut();
      if (repo.mode === "demo") window.location.reload();
    } catch (e) {
      toast((e as Error).message, { tone: "erro" });
    }
  }

  return (
    <TabShell>
      <div className="flex flex-col items-center pt-6 text-center">
        <button type="button" onClick={() => fileRef.current?.click()} className="relative" aria-label="Trocar foto" disabled={photoBusy}>
          <PetAvatar url={pet.photoUrl} size={112} ring />
          <span className="absolute bottom-0 right-0 grid size-9 place-items-center rounded-full bg-fg text-white ring-4 ring-bg">
            <Camera size={16} />
          </span>
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => changePhoto(e.target.files?.[0])} />
        <h1 className="mt-4 text-3xl font-extrabold">{pet.name}</h1>
        {pet.breed && <p className="text-muted">{pet.breed}</p>}
      </div>

      <section className="mt-6 rounded-3xl bg-card p-2 shadow-card">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-start justify-between gap-4 border-b border-line px-3 py-3 last:border-0">
            <span className="text-muted">{k}</span>
            <span className="text-right font-bold">{v || <span className="font-normal text-faint">—</span>}</span>
          </div>
        ))}
        {pet.vetPhone && (
          <a href={`tel:${pet.vetPhone.replace(/[^\d+]/g, "")}`} className="m-1 flex items-center justify-center gap-2 rounded-2xl bg-primary-soft py-3 font-bold text-primary-strong">
            <Phone size={18} /> Ligar para o veterinário
          </a>
        )}
      </section>
      <p className="mt-2 px-2 text-sm text-faint">Editar o perfil e registrar gastos chegam na próxima etapa.</p>

      <h2 className="mb-2 mt-8 px-1 text-sm font-extrabold uppercase tracking-wide text-muted">Tutores</h2>
      <section className="space-y-2">
        {tutors.map((t) => (
          <div key={t.userId} className="flex items-center gap-3 rounded-3xl bg-card p-3 shadow-card">
            <span className="grid size-11 place-items-center rounded-full bg-peach-soft font-extrabold text-peach">{t.name.charAt(0).toUpperCase()}</span>
            <span className="flex-1 font-bold">{t.userId === user.id && t.name !== "Você" ? `${t.name} (você)` : t.name}</span>
            <span className="text-sm text-muted">{t.role === "principal" ? "Principal" : "Tutor"}</span>
          </div>
        ))}
        {pet.role === "principal" && (
          <Button variant="soft" size="lg" className="w-full" onClick={makeInvite} disabled={inviteBusy}>
            <UserPlus size={20} /> Convidar outro tutor
          </Button>
        )}
      </section>

      <div className="mt-8 space-y-2">
        <Button variant="outline" className="w-full" onClick={() => router.push("/novo-pet")}>
          <Plus size={18} /> Adicionar outro cachorro
        </Button>
        <Button variant="ghost" className="w-full" onClick={signOut}>
          <LogOut size={18} /> {repo.mode === "demo" ? "Sair do modo demonstração" : "Sair da conta"}
        </Button>
        {repo.mode === "demo" && <p className="text-center text-xs text-faint">Modo demonstração: os dados ficam só neste aparelho.</p>}
      </div>

      <Sheet open={!!invite} onClose={() => setInvite(null)} title="Convite">
        {invite && (
          <div className="pb-2">
            <p className="mb-4 text-muted">Mande para quem também cuida de {pet.name}. A pessoa entra com a conta dela e passa a ver a mesma agenda.</p>
            <InviteCard code={invite} petName={pet.name} demo={repo.mode === "demo"} />
          </div>
        )}
      </Sheet>
    </TabShell>
  );
}
