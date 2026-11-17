"use client";

import { useState, type ReactNode } from "react";
import { BREEDS, breedSize } from "@/lib/breeds";
import { addMonths, birthFromAge, parseDate, startOfDay, todayStr } from "@/lib/dates";
import type { Origin, Pet, PetFields, Sex, Size } from "@/lib/types";
import { useApp } from "../app-provider";
import { Button } from "../ui/button";
import { Pills, Stepper, TextField } from "../ui/fields";
import { Sheet } from "../ui/sheet";
import { useToast } from "../ui/toast";

const SIZES: { value: Size; label: string }[] = [
  { value: "pequeno", label: "Pequeno" },
  { value: "medio", label: "Médio" },
  { value: "grande", label: "Grande" },
  { value: "gigante", label: "Gigante" },
];

const ORIGINS: { value: Origin; label: string }[] = [
  { value: "adotado", label: "Adotado (lar/ONG)" },
  { value: "resgatado", label: "Resgatado da rua" },
  { value: "comprado", label: "Comprado" },
  { value: "presente", label: "Ganhei de presente" },
  { value: "outro", label: "Outro" },
];

/** Editar o perfil do pet (os mesmos dados do cadastro). */
export function EditPetSheet({ open, onClose, pet }: { open: boolean; onClose: () => void; pet: Pet }) {
  return (
    <Sheet open={open} onClose={onClose} title="Editar perfil">
      {open && <EditForm key={pet.id} pet={pet} onDone={onClose} />}
    </Sheet>
  );
}

/** Idade (anos/meses) a partir do nascimento aproximado. */
function ageParts(birth: string | null) {
  if (!birth) return { y: 0, m: 0 };
  const b = parseDate(birth);
  const now = startOfDay(new Date());
  let months = (now.getFullYear() - b.getFullYear()) * 12 + (now.getMonth() - b.getMonth());
  if (addMonths(b, months) > now) months--;
  months = Math.max(0, months);
  return { y: Math.floor(months / 12), m: months % 12 };
}

const tri = (v: boolean | null) => (v === true ? "sim" : v === false ? "nao" : "naosei");

function EditForm({ pet, onDone }: { pet: Pet; onDone: () => void }) {
  const { repo, reloadPets } = useApp();
  const toast = useToast();
  const age = ageParts(pet.birth);

  const [name, setName] = useState(pet.name);
  const [breed, setBreed] = useState(pet.breed ?? "");
  const [sex, setSex] = useState<Sex | null>(pet.sex);
  const [birthMode, setBirthMode] = useState<"data" | "idade">(pet.birthApprox ? "idade" : "data");
  const [birth, setBirth] = useState(pet.birthApprox ? "" : pet.birth ?? "");
  const [years, setYears] = useState(age.y);
  const [months, setMonths] = useState(age.m);
  const [ageTouched, setAgeTouched] = useState(false);
  const [size, setSize] = useState<Size | null>(pet.size);
  const [origin, setOrigin] = useState<Origin | null>(pet.origin);
  const [neutered, setNeutered] = useState<"sim" | "nao" | "naosei">(tri(pet.neutered));
  const [diseases, setDiseases] = useState(pet.diseases ?? "");
  const [allergies, setAllergies] = useState(pet.allergies ?? "");
  const [foodBrand, setFoodBrand] = useState(pet.foodBrand ?? "");
  const [foodAmount, setFoodAmount] = useState(pet.foodAmount ?? "");
  const [vetName, setVetName] = useState(pet.vetName ?? "");
  const [vetPhone, setVetPhone] = useState(pet.vetPhone ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function birthValue(): { birth: string | null; birthApprox: boolean } {
    if (birthMode === "data") return { birth: birth || null, birthApprox: false };
    // idade aproximada: só recalcula se mexeu (senão o dia "anda" a cada edição)
    if (!ageTouched) return { birth: pet.birthApprox ? pet.birth : years || months ? birthFromAge(years, months) : null, birthApprox: true };
    return { birth: years || months ? birthFromAge(years, months) : null, birthApprox: true };
  }

  async function save() {
    if (!name.trim()) return setError("O nome não pode ficar vazio.");
    setBusy(true);
    setError(null);
    const clean = (s: string) => s.trim() || null;
    const patch: Partial<PetFields> = {
      name: name.trim(),
      breed: clean(breed),
      sex,
      ...birthValue(),
      size,
      origin,
      neutered: neutered === "sim" ? true : neutered === "nao" ? false : null,
      diseases: clean(diseases),
      allergies: clean(allergies),
      foodBrand: clean(foodBrand),
      foodAmount: clean(foodAmount),
      vetName: clean(vetName),
      vetPhone: clean(vetPhone),
    };
    try {
      await repo.updatePet(pet.id, patch);
      await reloadPets(pet.id);
      toast("Perfil salvo ✓");
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-7 pb-2">
      <Group title="Básico">
        <TextField label="Nome" value={name} onChange={setName} maxLength={40} />
        <label className="block">
          <span className="mb-1 block px-1 text-sm font-bold text-muted">Raça</span>
          <input
            list="racas"
            value={breed}
            onChange={(e) => {
              setBreed(e.target.value);
              const s = breedSize(e.target.value);
              if (s && !size) setSize(s);
            }}
            placeholder="Digite para buscar"
            className="h-13 w-full rounded-2xl border-2 border-line bg-card px-4 text-fg outline-none placeholder:text-faint focus:border-primary"
          />
          <datalist id="racas">
            {BREEDS.map((b) => (
              <option key={b.name} value={b.name} />
            ))}
          </datalist>
        </label>
        <Field label="Sexo">
          <Pills
            options={[
              { value: "macho", label: "Macho" },
              { value: "femea", label: "Fêmea" },
            ]}
            value={sex}
            onChange={setSex}
          />
        </Field>
        <Field label="Nascimento">
          <Pills
            options={[
              { value: "data", label: "Sei a data" },
              { value: "idade", label: "Idade aproximada" },
            ]}
            value={birthMode}
            onChange={setBirthMode}
          />
          <div className="mt-3">
            {birthMode === "data" ? (
              <TextField type="date" value={birth} max={todayStr()} onChange={setBirth} />
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Stepper label={years === 1 ? "ano" : "anos"} value={years} max={25} onChange={(v) => (setYears(v), setAgeTouched(true))} />
                <Stepper label={months === 1 ? "mês" : "meses"} value={months} max={11} onChange={(v) => (setMonths(v), setAgeTouched(true))} />
              </div>
            )}
          </div>
        </Field>
        <Field label="Porte">
          <Pills options={SIZES} value={size} onChange={setSize} />
        </Field>
        <Field label="Origem">
          <Pills options={ORIGINS} value={origin} onChange={setOrigin} />
        </Field>
      </Group>

      <Group title="Saúde">
        <Field label={sex === "femea" ? "Castrada?" : "Castrado?"}>
          <Pills
            options={[
              { value: "sim", label: "Sim" },
              { value: "nao", label: "Não" },
              { value: "naosei", label: "Não sei" },
            ]}
            value={neutered}
            onChange={setNeutered}
          />
        </Field>
        <TextField label="Doença de base" multiline value={diseases} onChange={setDiseases} placeholder="Deixe vazio se não tem" />
        <TextField label="Alergias" multiline value={allergies} onChange={setAllergies} placeholder="Deixe vazio se não tem" />
      </Group>

      <Group title="Rotina">
        <div className="grid grid-cols-2 gap-3">
          <TextField label="Ração" value={foodBrand} onChange={setFoodBrand} placeholder="Marca" />
          <TextField label="Por dia" value={foodAmount} onChange={setFoodAmount} placeholder="Ex.: 200 g" />
        </div>
        <TextField label="Veterinário" value={vetName} onChange={setVetName} placeholder="Nome ou clínica" />
        <TextField label="Telefone do veterinário" type="tel" inputMode="tel" value={vetPhone} onChange={setVetPhone} placeholder="(11) 99999-9999" />
      </Group>

      {error && <p className="rounded-2xl bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">{error}</p>}
      <div className="sticky bottom-0 -mx-5 bg-card px-5 pb-1 pt-3">
        <Button size="lg" className="w-full" disabled={busy} onClick={save}>
          {busy ? "Salvando..." : "Salvar perfil"}
        </Button>
      </div>
    </div>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <h3 className="titulo text-xl">{title}</h3>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <span className="mb-2 block px-1 text-sm font-bold text-muted">{label}</span>
      {children}
    </div>
  );
}
