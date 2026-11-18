"use client";

import { ArrowLeft, Camera, LogOut, Pencil, Phone, Plus, UserPlus } from "lucide-react";
import Link from "next/link";
import { HealthPlanCard } from "./health-plan";
import { EmergencyCard } from "../emergencia/emergency";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { EditPetSheet } from "./edit-pet-sheet";
import { NotificationsSetting } from "../shared/notifications";
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

const SECTIONS = [
  { key: "perfil", label: "Perfil" },
  { key: "saude", label: "Saúde" },
  { key: "tutores", label: "Tutores" },
] as const;

const SIZE = { pequeno: "Pequeno", medio: "Médio", grande: "Grande", gigante: "Gigante" };
const LIFESTYLE = { dentro: "Só dentro de casa", as_vezes: "Sai às vezes", sempre: "Sai sempre" };
const OTHERS = { gatos: "Outros gatos", cachorros: "Cachorros", nenhum: "Nenhum" };
const FELV = { negativo: "Negativo", positivo: "Positivo", nao_fez: "Não fez", nao_sei: "Não sabe" };
const FOOD = { seca: "Seca", umida: "Úmida", mista: "Mista" };
const ORIGIN = { adotado: "Adotado (lar/ONG)", resgatado: "Resgatado da rua", comprado: "Comprado", presente: "Ganhou de presente", outro: "Outro" };

/** Perfil do pet (abre pela foto no Início): Perfil (dados e foto), Saúde (plano e emergência) e Tutores. */
export function PetScreen() {
  const { pet, tutors, repo, user, reloadPets } = useApp();
  const router = useRouter();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [invite, setInvite] = useState<string | null>(null);
  const [inviteBusy, setInviteBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState<(typeof SECTIONS)[number]["key"]>("perfil");
  if (!pet) return null;

  const cat = pet.species === "gato";
  const rows: [string, string | null][] = [
    ["Espécie", cat ? "Gato" : "Cachorro"],
    ["Raça", pet.breed],
    ["Sexo", pet.sex === "femea" ? "Fêmea" : pet.sex === "macho" ? "Macho" : null],
    ["Idade", pet.birth ? `${ageText(pet.birth) ?? "—"}${pet.birthApprox ? " (aprox.)" : ` · nasceu em ${fmtDate(pet.birth)}`}` : null],
    ...(cat ? [] : ([["Porte", pet.size ? SIZE[pet.size] : null]] as [string, string | null][])),
    ["Origem", pet.origin ? ORIGIN[pet.origin] : null],
    ["Castrado(a)", pet.neutered === null ? null : pet.neutered ? "Sim" : "Não"],
    ...(cat
      ? ([
          ["Rotina", pet.lifestyle ? LIFESTYLE[pet.lifestyle] : null],
          ["Mora com", pet.otherAnimals?.length ? pet.otherAnimals.map((o) => OTHERS[o]).join(", ") : null],
          ["Teste FeLV/FIV", pet.felvTest ? FELV[pet.felvTest] : null],
        ] as [string, string | null][])
      : []),
    ["Doença de base", pet.diseases],
    ["Alergias", pet.allergies],
    ["Ração", [cat && pet.foodType ? FOOD[pet.foodType] : null, pet.foodBrand, pet.foodAmount].filter(Boolean).join(" · ") || null],
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
      <Link href="/" aria-label="Voltar ao Início" className="mt-3 grid size-11 place-items-center rounded-full bg-card shadow-card">
        <ArrowLeft size={20} />
      </Link>
      <div className="-mt-6 flex flex-col items-center text-center">
        <button type="button" onClick={() => fileRef.current?.click()} className="relative" aria-label="Trocar foto" disabled={photoBusy}>
          <PetAvatar url={pet.photoUrl} species={pet.species} size={112} ring />
          <span className="absolute bottom-0 right-0 grid size-9 place-items-center rounded-full bg-forest text-pink ring-4 ring-bg">
            <Camera size={16} />
          </span>
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => changePhoto(e.target.files?.[0])} />
        <h1 className="mt-4 titulo text-4xl">{pet.name}</h1>
        {pet.breed && <p className="text-muted">{pet.breed}</p>}
      </div>

      <div className="mt-6 grid grid-cols-3 gap-1 rounded-full bg-card p-1 shadow-card" role="tablist" aria-label="Seções do pet">
        {SECTIONS.map((sec) => {
          const sel = sec.key === tab;
          return (
            <button key={sec.key} type="button" role="tab" aria-selected={sel} onClick={() => setTab(sec.key)} className="relative h-11 rounded-full text-sm font-bold">
              {sel && <motion.span layoutId="pet-aba" className="absolute inset-0 rounded-full bg-forest" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
              <span className={`relative ${sel ? "text-pink" : "text-forest"}`}>{sec.label}</span>
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.22 }} className="mt-5">
          {tab === "perfil" && (
            <>
              <section className="rounded-3xl bg-card p-2 shadow-card">
                {rows.map(([k, v]) => (
                  <div key={k} className="flex items-start justify-between gap-4 border-b border-line px-3 py-3 last:border-0">
                    <span className="text-muted">{k}</span>
                    <span className="text-right font-bold text-forest">{v || <span className="font-normal text-faint">—</span>}</span>
                  </div>
                ))}
                {pet.vetPhone && (
                  <a href={`tel:${pet.vetPhone.replace(/[^\d+]/g, "")}`} className="m-1 flex items-center justify-center gap-2 rounded-2xl bg-primary-soft py-3 font-bold text-primary-strong">
                    <Phone size={18} /> Ligar para o veterinário
                  </a>
                )}
              </section>
              <Button variant="soft" size="lg" className="mt-3 w-full" onClick={() => setEditing(true)}>
                <Pencil size={18} /> Editar perfil
              </Button>
              <div className="mt-6">
                <NotificationsSetting />
              </div>
              <div className="mt-8 space-y-2">
                <Button variant="outline" className="w-full" onClick={() => router.push("/novo-pet")}>
                  <Plus size={18} /> Adicionar outro pet
                </Button>
                <Button variant="ghost" className="w-full" onClick={signOut}>
                  <LogOut size={18} /> {repo.mode === "demo" ? "Sair do modo demonstração" : "Sair da conta"}
                </Button>
                {repo.mode === "demo" && <p className="text-center text-xs text-faint">Modo demonstração: os dados ficam só neste aparelho.</p>}
              </div>
            </>
          )}

          {tab === "saude" && (
            <div className="space-y-4">
              <HealthPlanCard pet={pet} />
              <EmergencyCard pet={pet} />
            </div>
          )}

          {tab === "tutores" && (
            <section className="space-y-2">
              {tutors.map((t) => (
                <div key={t.userId} className="flex items-center gap-3 rounded-3xl bg-card p-3 shadow-card">
                  <span className="grid size-11 place-items-center rounded-full bg-peach-soft font-extrabold text-forest">{t.name.charAt(0).toUpperCase()}</span>
                  <span className="flex-1 font-bold text-forest">{t.userId === user.id && t.name !== "Você" ? `${t.name} (você)` : t.name}</span>
                  <span className="rounded-full bg-olive-soft px-2.5 py-1 text-xs font-bold text-olive">{t.role === "principal" ? "Principal" : "Tutor"}</span>
                </div>
              ))}
              <p className="px-2 pt-1 text-sm text-muted">Todos os tutores veem a mesma agenda, o cartão de vacina e os gastos de {pet.name}.</p>
              {pet.role === "principal" && (
                <Button variant="soft" size="lg" className="w-full" onClick={makeInvite} disabled={inviteBusy}>
                  <UserPlus size={20} /> Convidar outro tutor
                </Button>
              )}
            </section>
          )}
        </motion.div>
      </AnimatePresence>

      <EditPetSheet open={editing} onClose={() => setEditing(false)} pet={pet} />

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
