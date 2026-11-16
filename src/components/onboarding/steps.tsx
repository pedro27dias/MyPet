"use client";

/* eslint-disable @next/next/no-img-element -- prévia local da foto */
import { Camera, Search } from "lucide-react";
import { useMemo, useRef, useState, type ReactNode } from "react";
import { BREEDS, SRD, breedSize, normalize } from "@/lib/breeds";
import { compressPhoto } from "@/lib/photo";
import { VACCINES, type Answers, type FleaMethod } from "@/lib/onboarding";
import type { Freq, Origin, Size } from "@/lib/types";
import { BigOptions, Choice, Pills, Stepper, TextField, TimeList, YesNo } from "../ui/fields";

/*
 * As 16 perguntas do cadastro. Cada uma é uma tela. "auto" = avança sozinha ao escolher.
 */

export interface StepProps {
  a: Answers;
  set: (patch: Partial<Answers>) => void;
  /** avança para a próxima (usado nas escolhas únicas) */
  next: () => void;
}

export interface StepDef {
  key: string;
  title: (a: Answers) => string;
  hint?: string;
  Body: (p: StepProps) => ReactNode;
}

const petName = (a: Answers) => a.name.trim() || "seu cachorro";
/** "o Thor" / "a Mel" / "seu cachorro" */
const oPet = (a: Answers) => (a.name.trim() ? `${a.sex === "femea" ? "a" : "o"} ${a.name.trim()}` : "seu cachorro");
const OPet = (a: Answers) => {
  const s = oPet(a);
  return s.charAt(0).toUpperCase() + s.slice(1);
};
const fem = (a: Answers, m: string, f: string) => (a.sex === "femea" ? f : m);

export const STEPS: StepDef[] = [
  {
    key: "nome",
    title: () => "Qual é o nome do seu cachorro?",
    hint: "Se quiser, coloque uma foto também.",
    Body: NameStep,
  },
  { key: "raca", title: (a) => `Qual é a raça ${a.name.trim() ? `de ${a.name.trim()}` : "dele"}?`, Body: BreedStep },
  { key: "sexo", title: (a) => `${a.name.trim() || "Seu cachorro"} é macho ou fêmea?`, Body: SexStep },
  { key: "idade", title: (a) => `Quando ${oPet(a)} nasceu?`, hint: "Se não souber a data, use a idade aproximada.", Body: AgeStep },
  { key: "porte", title: (a) => `Qual é o porte ${a.name.trim() ? `de ${a.name.trim()}` : "dele"}?`, Body: SizeStep },
  { key: "origem", title: (a) => `Como ${oPet(a)} chegou até você?`, Body: OriginStep },
  { key: "castrado", title: (a) => `${OPet(a)} é ${fem(a, "castrado", "castrada")}?`, Body: NeuteredStep },
  { key: "doenca", title: (a) => `${OPet(a)} tem alguma doença de base?`, hint: "Ex.: problema no coração, rim, diabetes, epilepsia.", Body: DiseaseStep },
  { key: "alergia", title: (a) => `${OPet(a)} tem alguma alergia?`, hint: "Ex.: a algum alimento, remédio ou picada.", Body: AllergyStep },
  { key: "remedio", title: (a) => `${OPet(a)} toma algum remédio todo dia ou sempre?`, hint: "Se sim, já criamos o lembrete.", Body: MedStep },
  { key: "vacinas", title: () => "Quais vacinas já foram feitas?", hint: "Marque e, se souber, coloque a data da última dose.", Body: VaccinesStep },
  { key: "vermifugo", title: () => "Quando foi o último vermífugo?", hint: "Pode ser uma data aproximada.", Body: DewormerStep },
  { key: "pulgas", title: (a) => `Como você protege ${oPet(a)} de pulgas e carrapatos?`, Body: FleaStep },
  { key: "racao", title: (a) => `Qual ração ${oPet(a)} come?`, hint: "Opcional.", Body: FoodStep },
  { key: "vet", title: () => "Tem um veterinário de confiança?", hint: "Opcional. Fica à mão quando precisar.", Body: VetStep },
  { key: "convite", title: (a) => `Mais alguém cuida ${a.name.trim() ? `${fem(a, "do", "da")} ${a.name.trim()}` : "dele"}?`, hint: "Os dois veem a mesma agenda e sabem quem já fez cada coisa.", Body: InviteStep },
];

// ---------------------------------------------------------------------------------------------

function NameStep({ a, set }: StepProps) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  async function pick(file: File | undefined) {
    if (!file) return;
    setError(null);
    try {
      const blob = await compressPhoto(file);
      if (a.photoPreview) URL.revokeObjectURL(a.photoPreview);
      set({ photo: blob, photoPreview: URL.createObjectURL(blob) });
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="relative grid size-32 place-items-center overflow-hidden rounded-full border-4 border-dashed border-line bg-peach-soft text-peach transition active:scale-95"
          aria-label="Escolher foto"
        >
          {a.photoPreview ? (
            <img src={a.photoPreview} alt="" className="size-full object-cover" />
          ) : (
            <span className="flex flex-col items-center gap-1 text-sm font-bold">
              <Camera size={32} />
              Foto
            </span>
          )}
        </button>
        <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
      </div>
      {error && <p className="text-center text-sm text-danger">{error}</p>}
      <TextField
        value={a.name}
        onChange={(v) => set({ name: v })}
        placeholder="Ex.: Mel, Thor, Paçoca"
        autoFocus
        maxLength={40}
        className="[&_input]:h-16 [&_input]:text-center [&_input]:text-2xl [&_input]:font-extrabold"
      />
    </div>
  );
}

function BreedStep({ a, set, next }: StepProps) {
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const n = normalize(q.trim());
    return n ? BREEDS.filter((b) => normalize(b.name).includes(n)) : BREEDS;
  }, [q]);
  const exact = BREEDS.some((b) => normalize(b.name) === normalize(q.trim()));

  function choose(name: string) {
    const size = breedSize(name);
    set({ breed: name, ...(size && !a.size ? { size } : {}) });
    next();
  }

  return (
    <div className="space-y-3">
      <label className="flex h-13 items-center gap-2 rounded-2xl border-2 border-line bg-card px-4 focus-within:border-primary">
        <Search size={18} className="text-muted" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar raça"
          className="h-full flex-1 bg-transparent outline-none"
        />
      </label>
      <div className="max-h-[48dvh] space-y-2 overflow-y-auto pb-2">
        {q.trim() && !exact && (
          <Choice selected={false} onClick={() => choose(q.trim())} title={`Usar "${q.trim()}"`} hint="Raça digitada por você" />
        )}
        {list.map((b) => (
          <Choice
            key={b.name}
            selected={a.breed === b.name}
            onClick={() => choose(b.name)}
            title={b.name}
            hint={b.name === SRD ? "Sem raça definida" : undefined}
          />
        ))}
      </div>
    </div>
  );
}

function SexStep({ a, set, next }: StepProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {(
        [
          ["macho", "Macho", "♂"],
          ["femea", "Fêmea", "♀"],
        ] as const
      ).map(([v, label, sym]) => (
        <button
          key={v}
          type="button"
          aria-pressed={a.sex === v}
          onClick={() => (set({ sex: v }), next())}
          className={`flex h-40 flex-col items-center justify-center gap-2 rounded-3xl border-2 transition active:scale-[0.97] ${
            a.sex === v ? "border-primary bg-primary-soft" : "border-line bg-card"
          }`}
        >
          <span className={`text-5xl ${v === "macho" ? "text-t-vacina" : "text-t-consulta"}`}>{sym}</span>
          <span className="text-xl font-extrabold">{label}</span>
        </button>
      ))}
    </div>
  );
}

function AgeStep({ a, set }: StepProps) {
  return (
    <div className="space-y-5">
      <Pills
        options={[
          { value: "data", label: "Sei a data" },
          { value: "idade", label: "Idade aproximada" },
        ]}
        value={a.birthMode}
        onChange={(v) => set({ birthMode: v })}
      />
      {a.birthMode === "data" ? (
        <TextField
          type="date"
          value={a.birth}
          max={new Date().toISOString().slice(0, 10)}
          onChange={(v) => set({ birth: v })}
          className="[&_input]:h-16 [&_input]:text-xl [&_input]:font-bold"
        />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <Stepper label={a.ageYears === 1 ? "ano" : "anos"} value={a.ageYears} max={25} onChange={(v) => set({ ageYears: v, ageAnswered: true })} />
          <Stepper label={a.ageMonths === 1 ? "mês" : "meses"} value={a.ageMonths} max={11} onChange={(v) => set({ ageMonths: v, ageAnswered: true })} />
        </div>
      )}
    </div>
  );
}

const SIZES: { v: Size; label: string; hint: string; px: number }[] = [
  { v: "pequeno", label: "Pequeno", hint: "até 10 kg", px: 18 },
  { v: "medio", label: "Médio", hint: "10 a 25 kg", px: 24 },
  { v: "grande", label: "Grande", hint: "25 a 45 kg", px: 30 },
  { v: "gigante", label: "Gigante", hint: "mais de 45 kg", px: 36 },
];

function SizeStep({ a, set, next }: StepProps) {
  return (
    <div className="space-y-3">
      {SIZES.map((s) => (
        <Choice
          key={s.v}
          selected={a.size === s.v}
          onClick={() => (set({ size: s.v }), next())}
          icon={<span style={{ fontSize: s.px }}>🐕</span>}
          title={s.label}
          hint={s.hint}
        />
      ))}
      {a.breed && breedSize(a.breed) && <p className="px-1 text-sm text-muted">Sugerimos pelo porte comum da raça. Mude se precisar.</p>}
    </div>
  );
}

const ORIGINS: { v: Origin; label: string; icon: string }[] = [
  { v: "adotado", label: "Adotado em lar ou ONG", icon: "🏠" },
  { v: "resgatado", label: "Resgatado da rua", icon: "🤲" },
  { v: "comprado", label: "Comprado", icon: "🛍️" },
  { v: "presente", label: "Ganhei de presente", icon: "🎁" },
  { v: "outro", label: "Outro jeito", icon: "✨" },
];

function OriginStep({ a, set, next }: StepProps) {
  return (
    <div className="space-y-3">
      {ORIGINS.map((o) => (
        <Choice key={o.v} selected={a.origin === o.v} onClick={() => (set({ origin: o.v }), next())} icon={o.icon} title={o.label} />
      ))}
    </div>
  );
}

function NeuteredStep({ a, set, next }: StepProps) {
  return (
    <BigOptions
      options={[
        { value: "sim", label: "Sim" },
        { value: "nao", label: "Não" },
        { value: "naosei", label: "Não sei" },
      ]}
      value={a.neutered}
      onChange={(v) => (set({ neutered: v }), next())}
    />
  );
}

function YesNoText({
  value,
  text,
  onValue,
  onText,
  placeholder,
  next,
}: {
  value: boolean | null;
  text: string;
  onValue: (v: boolean) => void;
  onText: (v: string) => void;
  placeholder: string;
  next: () => void;
}) {
  return (
    <div className="space-y-4">
      <YesNo
        value={value}
        onChange={(v) => {
          onValue(v);
          if (!v) next();
        }}
      />
      {value && <TextField multiline value={text} onChange={onText} placeholder={placeholder} />}
    </div>
  );
}

function DiseaseStep({ a, set, next }: StepProps) {
  return (
    <YesNoText
      value={a.hasDisease}
      text={a.disease}
      onValue={(v) => set({ hasDisease: v })}
      onText={(v) => set({ disease: v })}
      placeholder="Qual? (ex.: sopro no coração)"
      next={next}
    />
  );
}

function AllergyStep({ a, set, next }: StepProps) {
  return (
    <YesNoText
      value={a.hasAllergy}
      text={a.allergy}
      onValue={(v) => set({ hasAllergy: v })}
      onText={(v) => set({ allergy: v })}
      placeholder="A quê? (ex.: frango, dipirona)"
      next={next}
    />
  );
}

export const MED_FREQS: { value: Freq; label: string }[] = [
  { value: "diaria", label: "Todo dia" },
  { value: "horas", label: "A cada X horas" },
  { value: "dias", label: "A cada X dias" },
  { value: "semanal", label: "Toda semana" },
  { value: "unica", label: "Uma vez" },
];

function MedStep({ a, set, next }: StepProps) {
  const m = a.med;
  const setMed = (patch: Partial<Answers["med"]>) => set({ med: { ...m, ...patch } });
  return (
    <div className="space-y-4">
      <YesNo value={a.usesMed} onChange={(v) => (set({ usesMed: v }), !v && next())} />
      {a.usesMed && (
        <div className="space-y-4 rounded-3xl bg-card p-4 shadow-card">
          <TextField label="Nome do remédio" value={m.name} onChange={(v) => setMed({ name: v })} placeholder="Ex.: Apoquel" />
          <TextField label="Dose" value={m.dose} onChange={(v) => setMed({ dose: v })} placeholder="Ex.: 1 comprimido, 5 gotas" />
          <div>
            <span className="mb-2 block px-1 text-sm font-bold text-muted">Frequência</span>
            <Pills options={MED_FREQS} value={m.freq} onChange={(v) => setMed({ freq: v, times: v === "horas" ? m.times.slice(0, 1) : m.times })} />
          </div>
          {(m.freq === "horas" || m.freq === "dias") && (
            <Stepper
              label={m.freq === "horas" ? "horas" : "dias"}
              value={m.interval}
              min={1}
              max={m.freq === "horas" ? 24 : 60}
              onChange={(v) => setMed({ interval: v })}
            />
          )}
          <div>
            <span className="mb-2 block px-1 text-sm font-bold text-muted">{m.freq === "horas" ? "Primeiro horário" : "Horário(s)"}</span>
            {m.freq === "horas" ? (
              <TimeList times={m.times.slice(0, 1)} onChange={(t) => setMed({ times: t.slice(0, 1) })} />
            ) : (
              <TimeList times={m.times} onChange={(t) => setMed({ times: t })} />
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Começa em" type="date" value={m.start} onChange={(v) => setMed({ start: v })} />
            {m.freq !== "unica" && <TextField label="Termina em" type="date" value={m.end} onChange={(v) => setMed({ end: v })} />}
          </div>
          {m.freq !== "unica" && <p className="px-1 text-sm text-muted">Deixe &quot;Termina em&quot; vazio se for contínuo.</p>}
        </div>
      )}
    </div>
  );
}

function VaccinesStep({ a, set }: StepProps) {
  return (
    <div className="space-y-3">
      {VACCINES.map((v) => {
        const ans = a.vaccines[v.key];
        const toggle = () => set({ vaccines: { ...a.vaccines, [v.key]: { ...ans, done: !ans.done } } });
        return (
          <div key={v.key} className={`rounded-3xl border-2 transition ${ans.done ? "border-primary bg-primary-soft" : "border-line bg-card"}`}>
            <Choice selected={ans.done} onClick={toggle} title={v.label} hint={v.hint || undefined} className="border-0 bg-transparent" />
            {ans.done && (
              <div className="px-4 pb-4">
                <TextField
                  label="Última dose (se souber)"
                  type="date"
                  value={ans.last}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(d) => set({ vaccines: { ...a.vaccines, [v.key]: { ...ans, last: d } } })}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function DewormerStep({ a, set }: StepProps) {
  return (
    <div className="space-y-4">
      <TextField
        label="Data aproximada"
        type="date"
        value={a.dewormer.last}
        max={new Date().toISOString().slice(0, 10)}
        onChange={(v) => set({ dewormer: { ...a.dewormer, last: v } })}
      />
      <TextField
        label="Produto (opcional)"
        value={a.dewormer.product}
        onChange={(v) => set({ dewormer: { ...a.dewormer, product: v } })}
        placeholder="Ex.: Drontal, Milbemax"
      />
    </div>
  );
}

const FLEA: { v: FleaMethod; label: string; icon: string; hint?: string }[] = [
  { v: "coleira", label: "Coleira", icon: "📿" },
  { v: "comprimido", label: "Comprimido", icon: "💊" },
  { v: "pipeta", label: "Pipeta (nas costas)", icon: "💧" },
  { v: "nenhuma", label: "Nenhuma por enquanto", icon: "—" },
];

function FleaStep({ a, set }: StepProps) {
  return (
    <div className="space-y-3">
      {FLEA.map((f) => (
        <Choice key={f.v} selected={a.flea.method === f.v} onClick={() => set({ flea: { ...a.flea, method: f.v } })} icon={f.icon} title={f.label} />
      ))}
      {a.flea.method && a.flea.method !== "nenhuma" && (
        <TextField
          label={a.flea.method === "coleira" ? "Quando trocou a coleira?" : "Última aplicação"}
          type="date"
          value={a.flea.last}
          max={new Date().toISOString().slice(0, 10)}
          onChange={(v) => set({ flea: { ...a.flea, last: v } })}
        />
      )}
    </div>
  );
}

function FoodStep({ a, set }: StepProps) {
  return (
    <div className="space-y-4">
      <TextField label="Marca" value={a.food.brand} onChange={(v) => set({ food: { ...a.food, brand: v } })} placeholder="Ex.: Premier, Golden" />
      <TextField
        label="Quantidade por dia"
        value={a.food.amount}
        onChange={(v) => set({ food: { ...a.food, amount: v } })}
        placeholder="Ex.: 200 g, 2 xícaras"
      />
    </div>
  );
}

function VetStep({ a, set }: StepProps) {
  return (
    <div className="space-y-4">
      <TextField label="Nome ou clínica" value={a.vet.name} onChange={(v) => set({ vet: { ...a.vet, name: v } })} placeholder="Ex.: Dra. Ana, Clínica Patas" />
      <TextField
        label="Telefone"
        type="tel"
        inputMode="tel"
        value={a.vet.phone}
        onChange={(v) => set({ vet: { ...a.vet, phone: v } })}
        placeholder="(11) 99999-9999"
      />
    </div>
  );
}

function InviteStep({ a, set, next }: StepProps) {
  return (
    <div className="space-y-3">
      <Choice
        selected={a.inviteTutor === true}
        onClick={() => (set({ inviteTutor: true }), next())}
        icon="👥"
        title="Sim, quero convidar"
        hint="No fim você recebe um link para mandar."
      />
      <Choice selected={a.inviteTutor === false} onClick={() => (set({ inviteTutor: false }), next())} icon="🙂" title="Agora não" hint="Dá para convidar depois, na aba Pet." />
    </div>
  );
}

export { petName };
