"use client";

import { ArrowLeft, Clock, LocateFixed, MapPin, MessageCircle, Navigation, Pencil, Phone, ShieldPlus, Siren, Stethoscope } from "lucide-react";
import Link from "next/link";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { ageText, fmtDate, fmtTimeShort } from "@/lib/dates";
import type { CareRecord, EmergencyContacts, Pet } from "@/lib/types";
import { useApp } from "../app-provider";
import { PetAvatar } from "../shared/pet-avatar";
import { telHref } from "../pet/health-plan";
import { Button } from "../ui/button";
import { TextField } from "../ui/fields";
import { Sheet } from "../ui/sheet";
import { useToast } from "../ui/toast";

type Clinic = NonNullable<EmergencyContacts["clinic"]>;

const waHref = (phone: string) => `https://wa.me/${(phone.replace(/\D/g, "").length <= 11 ? "55" : "") + phone.replace(/\D/g, "")}`;
const mapsHref = (address: string) => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
const wazeHref = (address: string) => `https://waze.com/ul?q=${encodeURIComponent(address)}&navigate=yes`;

/** Central de emergência: clínica favorita, veterinário, plano, busca 24h e resumo do pet. */
export function EmergencyScreen() {
  const { pet, cares, repo } = useApp();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [locating, setLocating] = useState(false);
  const [records, setRecords] = useState<CareRecord[]>([]);
  const [ate, setAte] = useState<{ what: string; amount: string; at: string } | null>(null);

  // "Comeu algo proibido?" anotado no Guia de alimentação
  useEffect(() => {
    if (!pet) return;
    try {
      const raw = localStorage.getItem(`mypet-comeu-${pet.id}`);
      const v = raw ? (JSON.parse(raw) as { what: string; amount: string; at: string }) : null;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- leitura única do aparelho
      if (v && Date.now() - new Date(v.at).getTime() < 24 * 3_600_000) setAte(v);
    } catch {
      /* sem armazenamento */
    }
  }, [pet]);

  useEffect(() => {
    if (!pet) return;
    repo.listRecords(pet.id, "1990-01-01T00:00:00Z").then(setRecords, () => {});
  }, [repo, pet]);

  if (!pet) return null;
  const clinic = pet.emergency?.clinic ?? null;
  const plan = pet.plan;

  function near() {
    const open = (q: string) => window.open(`https://www.google.com/maps/search/${q}`, "_blank", "noopener");
    if (!navigator.geolocation) return open("veterin%C3%A1rio+24+horas");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLocating(false);
        open(`veterin%C3%A1rio+24+horas/@${p.coords.latitude},${p.coords.longitude},14z`);
      },
      () => {
        setLocating(false);
        toast("Sem a localização, a busca abre perto de onde o Maps achar.", { tone: "info" });
        open("veterin%C3%A1rio+24+horas+perto+de+mim");
      },
      { timeout: 8000, maximumAge: 60_000 },
    );
  }

  return (
    <main className="pt-safe mx-auto min-h-dvh max-w-md px-5 pb-32">
      <header className="flex items-center gap-3 py-4">
        <Link href="/" aria-label="Voltar" className="grid size-11 place-items-center rounded-full bg-card shadow-card">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="titulo flex-1 text-3xl !text-danger">Emergência</h1>
        <span className="grid size-11 place-items-center rounded-full bg-danger text-white">
          <Siren size={22} />
        </span>
      </header>

      {ate && (
        <section className="mb-4 rounded-3xl bg-warn-soft p-4">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-bold uppercase tracking-wide text-warn">Comeu algo proibido</p>
            <button
              type="button"
              aria-label="Apagar anotação"
              onClick={() => {
                try {
                  localStorage.removeItem(`mypet-comeu-${pet.id}`);
                } catch {
                  /* ignora */
                }
                setAte(null);
              }}
              className="text-xs font-bold text-warn underline"
            >
              apagar
            </button>
          </div>
          <p className="mt-1 text-lg font-extrabold text-forest">
            {ate.what}
            {ate.amount ? ` · ${ate.amount}` : ""}
          </p>
          <p className="text-sm text-ink">Anotado às {fmtTimeShort(ate.at)} de {fmtDate(ate.at)}. Mostre ao veterinário.</p>
        </section>
      )}

      {/* Clínica de emergência */}
      <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border-2 border-danger/30 bg-danger-soft p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-danger">Clínica de emergência</p>
            {clinic ? (
              <>
                <p className="mt-1 text-xl font-extrabold text-forest">{clinic.name}</p>
                {clinic.address && (
                  <p className="mt-1 flex items-start gap-1 text-sm text-ink">
                    <MapPin size={15} className="mt-0.5 shrink-0" /> {clinic.address}
                  </p>
                )}
                {clinic.h24 && (
                  <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-forest px-2.5 py-1 text-xs font-bold text-pink">
                    <Clock size={12} /> 24 horas
                  </span>
                )}
              </>
            ) : (
              <p className="mt-1 text-sm text-ink">Cadastre a clínica de confiança para emergências. Todos os tutores veem.</p>
            )}
          </div>
          <button type="button" aria-label="Editar clínica" onClick={() => setEditing(true)} className="grid size-9 shrink-0 place-items-center rounded-full bg-card text-forest">
            <Pencil size={16} />
          </button>
        </div>
        {clinic ? (
          <div className="mt-4 grid grid-cols-3 gap-2">
            <BigAction href={clinic.phone ? telHref(clinic.phone) : undefined} icon={<Phone size={24} />} label="Ligar" strong />
            <BigAction href={clinic.whatsapp || clinic.phone ? waHref(clinic.whatsapp || clinic.phone!) : undefined} icon={<MessageCircle size={24} />} label="WhatsApp" external />
            <BigAction href={clinic.address ? mapsHref(clinic.address) : undefined} icon={<Navigation size={24} />} label="Rota" external />
          </div>
        ) : (
          <Button className="mt-4 w-full" onClick={() => setEditing(true)}>
            Cadastrar clínica
          </Button>
        )}
        {clinic?.address && (
          <a href={wazeHref(clinic.address)} target="_blank" rel="noopener" className="mt-2 block text-center text-sm font-bold text-forest underline">
            Abrir rota no Waze
          </a>
        )}
      </motion.section>

      {/* Buscar 24h */}
      <button
        type="button"
        onClick={near}
        disabled={locating}
        className="mt-4 flex w-full items-center gap-3 rounded-3xl bg-forest p-4 text-left text-pink shadow-float active:scale-[0.98]"
      >
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-pink/15">
          <LocateFixed size={24} />
        </span>
        <span>
          <span className="block text-lg font-extrabold">{locating ? "Pegando sua localização..." : "Buscar veterinário 24h perto de mim"}</span>
          <span className="block text-sm text-pink-soft/80">Abre o Google Maps</span>
        </span>
      </button>

      {/* Veterinário e plano */}
      <div className="mt-4 grid gap-3">
        {pet.vetName || pet.vetPhone ? (
          <ContactRow icon={<Stethoscope size={20} />} title="Veterinário de confiança" text={pet.vetName ?? "—"} phone={pet.vetPhone} />
        ) : (
          <Link href="/pet" className="rounded-3xl bg-card p-4 text-sm text-muted shadow-card">
            Sem veterinário de confiança cadastrado. <b className="text-forest">Adicionar no perfil →</b>
          </Link>
        )}
        {plan && (
          <ContactRow
            icon={<ShieldPlus size={20} />}
            title={`Plano de saúde${plan.operator ? ` · ${plan.operator}` : ""}`}
            text={plan.card ? `Carteirinha ${plan.card}` : "Sem número da carteirinha"}
            phone={plan.phone}
          />
        )}
      </div>

      <PetSummary pet={pet} records={records} cares={cares} />

      <EmergencySheet open={editing} onClose={() => setEditing(false)} pet={pet} />
    </main>
  );
}

function BigAction({ href, icon, label, strong, external }: { href?: string; icon: React.ReactNode; label: string; strong?: boolean; external?: boolean }) {
  const cls = `flex h-20 flex-col items-center justify-center gap-1 rounded-2xl font-extrabold transition active:scale-95 ${
    strong ? "bg-danger text-white" : "bg-card text-forest"
  } ${href ? "" : "pointer-events-none opacity-40"}`;
  return (
    <a href={href} target={external ? "_blank" : undefined} rel={external ? "noopener" : undefined} className={cls} aria-disabled={!href}>
      {icon}
      <span className="text-sm">{label}</span>
    </a>
  );
}

function ContactRow({ icon, title, text, phone }: { icon: React.ReactNode; title: string; text: string; phone: string | null | undefined }) {
  return (
    <div className="flex items-center gap-3 rounded-3xl bg-card p-4 shadow-card">
      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-olive-soft text-olive">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-bold text-muted">{title}</span>
        <span className="block truncate font-bold text-forest">{text}</span>
      </span>
      {phone && (
        <a href={telHref(phone)} aria-label={`Ligar: ${title}`} className="grid size-12 shrink-0 place-items-center rounded-full bg-forest text-pink active:scale-95">
          <Phone size={20} />
        </a>
      )}
    </div>
  );
}

/** Resumo rápido para mostrar na clínica. */
function PetSummary({ pet, records, cares }: { pet: Pet; records: CareRecord[]; cares: ReturnType<typeof useApp>["cares"] }) {
  const meds = cares.filter((c) => c.type === "remedio" && c.active);
  const vaccineIds = new Set(cares.filter((c) => c.type === "vacina").map((c) => c.id));
  const lastVaccine = records
    .filter((r) => vaccineIds.has(r.careId) && r.status === "feito")
    .sort((a, b) => (b.doneAt ?? b.occurrence).localeCompare(a.doneAt ?? a.occurrence))[0];
  const lastVaccineCare = lastVaccine ? cares.find((c) => c.id === lastVaccine.careId) : null;
  const rows: [string, string][] = [
    ["Espécie", `${pet.species === "gato" ? "Gato" : "Cachorro"}${pet.breed ? ` · ${pet.breed}` : ""}${pet.sex ? ` · ${pet.sex === "femea" ? "fêmea" : "macho"}` : ""}`],
    ["Idade", ageText(pet.birth) ?? "não informada"],
    ["Alergias", pet.allergies ?? "nenhuma informada"],
    ["Doenças de base", pet.diseases ?? "nenhuma informada"],
    ["Remédios em uso", meds.length ? meds.map((m) => `${m.title}${m.detail ? ` (${m.detail})` : ""}`).join(", ") : "nenhum"],
    ["Última vacina", lastVaccine && lastVaccineCare ? `${lastVaccineCare.title.replace(/^vacina\s+/i, "")} · ${fmtDate(lastVaccine.doneAt ?? lastVaccine.occurrence)}` : "sem registro"],
  ];
  return (
    <section className="mt-6 rounded-3xl bg-card p-5 shadow-card">
      <div className="flex items-center gap-3">
        <PetAvatar url={pet.photoUrl} species={pet.species} size={56} />
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-muted">Mostrar na clínica</p>
          <p className="titulo text-2xl">{pet.name}</p>
        </div>
      </div>
      <dl className="mt-4 space-y-2.5">
        {rows.map(([k, v]) => (
          <div key={k} className="border-b border-line pb-2 last:border-0">
            <dt className="text-xs font-bold text-muted">{k}</dt>
            <dd className={`text-[15px] font-semibold ${k === "Alergias" && pet.allergies ? "text-danger" : "text-forest"}`}>{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** Editar a clínica de emergência (fica no pet: todos os tutores veem). */
export function EmergencySheet({ open, onClose, pet }: { open: boolean; onClose: () => void; pet: Pet }) {
  return (
    <Sheet open={open} onClose={onClose} title="Clínica de emergência">
      {open && <ClinicForm pet={pet} onDone={onClose} />}
    </Sheet>
  );
}

function ClinicForm({ pet, onDone }: { pet: Pet; onDone: () => void }) {
  const { repo, reloadPets } = useApp();
  const toast = useToast();
  const c = pet.emergency?.clinic;
  const [form, setForm] = useState<Clinic>({ name: c?.name ?? "", address: c?.address ?? "", phone: c?.phone ?? "", whatsapp: c?.whatsapp ?? "", h24: c?.h24 ?? true });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(remove = false) {
    if (!remove && !form.name.trim()) return setError("Coloque o nome da clínica.");
    setBusy(true);
    setError(null);
    try {
      const clinic: Clinic | null = remove
        ? null
        : { name: form.name.trim(), address: form.address?.trim() || null, phone: form.phone?.trim() || null, whatsapp: form.whatsapp?.trim() || null, h24: form.h24 };
      await repo.updatePet(pet.id, { emergency: { ...(pet.emergency ?? {}), clinic } });
      await reloadPets(pet.id);
      toast(remove ? "Clínica removida." : "Clínica salva ✓ Todos os tutores veem.");
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 pb-2">
      <TextField label="Nome" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Ex.: Hospital Veterinário 24h" />
      <TextField label="Endereço" value={form.address ?? ""} onChange={(v) => setForm({ ...form, address: v })} placeholder="Rua, número, bairro, cidade" />
      <div className="campos-2">
        <TextField label="Telefone" type="tel" inputMode="tel" value={form.phone ?? ""} onChange={(v) => setForm({ ...form, phone: v })} />
        <TextField label="WhatsApp" type="tel" inputMode="tel" value={form.whatsapp ?? ""} onChange={(v) => setForm({ ...form, whatsapp: v })} placeholder="Se for outro" />
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={form.h24}
        onClick={() => setForm({ ...form, h24: !form.h24 })}
        className="flex w-full items-center justify-between rounded-2xl border-2 border-line bg-card px-4 py-3 font-bold text-forest"
      >
        Atende 24 horas
        <span className={`relative h-7 w-12 rounded-full transition ${form.h24 ? "bg-forest" : "bg-line"}`}>
          <span className={`absolute top-1 size-5 rounded-full bg-white shadow transition-all ${form.h24 ? "left-6" : "left-1"}`} />
        </span>
      </button>
      {error && <p className="rounded-2xl bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">{error}</p>}
      <Button size="lg" className="w-full" disabled={busy} onClick={() => save()}>
        {busy ? "Salvando..." : "Salvar clínica"}
      </Button>
      {c && (
        <Button variant="ghost" className="w-full" disabled={busy} onClick={() => save(true)}>
          Remover clínica
        </Button>
      )}
    </div>
  );
}

/** Card no perfil do pet: contatos de emergência. */
export function EmergencyCard({ pet }: { pet: Pet }) {
  const [editing, setEditing] = useState(false);
  const clinic = pet.emergency?.clinic;
  return (
    <section className="rounded-3xl bg-card p-5 shadow-card">
      <h2 className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-2xl bg-danger-soft text-danger">
          <Siren size={22} />
        </span>
        <span className="flex-1 text-lg font-bold text-forest">Contatos de emergência</span>
      </h2>
      {clinic ? (
        <p className="mt-3 text-sm text-ink">
          <b className="text-forest">{clinic.name}</b>
          {clinic.h24 ? " · 24h" : ""}
          {clinic.phone ? ` · ${clinic.phone}` : ""}
        </p>
      ) : (
        <p className="mt-2 text-sm text-muted">Cadastre a clínica de emergência. Aparece na tela SOS para todos os tutores.</p>
      )}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button variant="soft" onClick={() => setEditing(true)}>
          {clinic ? "Editar" : "Cadastrar"}
        </Button>
        <Link href="/emergencia" className="flex h-12 items-center justify-center gap-2 rounded-full bg-danger font-bold text-white active:scale-95">
          <Siren size={18} /> Abrir SOS
        </Link>
      </div>
      <EmergencySheet open={editing} onClose={() => setEditing(false)} pet={pet} />
    </section>
  );
}
