"use client";

/* eslint-disable @next/next/no-img-element -- prévia local da foto */
import { Camera, Search } from "lucide-react";
import { motion } from "motion/react";
import { useMemo, useRef, useState, type ReactNode } from "react";
import { SRD, breedSize, breedsFor, normalize } from "@/lib/breeds";
import { compressPhoto } from "@/lib/photo";
import { isCat, vaccinesFor, type Answers, type FleaMethod } from "@/lib/onboarding";
import type { FelvTest, FoodType, Freq, Lifestyle, Origin, OtherAnimal, Size, Species } from "@/lib/types";
import { FleaSafetyNote } from "../care/flea-safety";
import { BigOptions, Choice, Pills, Stepper, TextField, TimeList, YesNo } from "../ui/fields";
import { CampoData } from "../ui/campo-data";

/*
 * Perguntas do cadastro. Cada uma é uma tela. "auto" = avança sozinha ao escolher.
 * Primeiro "Seu pet é…" (cachorro ou gato); depois 16 perguntas de cachorro ou 18 de gato.
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

const bicho = (a: Pick<Answers, "species">) => (isCat(a) ? "gato" : "cachorro");
const petName = (a: Answers) => a.name.trim() || `seu ${bicho(a)}`;
/** "o Thor" / "a Mel" / "seu cachorro" / "seu gato" */
const oPet = (a: Answers) => (a.name.trim() ? `${a.sex === "femea" ? "a" : "o"} ${a.name.trim()}` : `seu ${bicho(a)}`);
const OPet = (a: Answers) => {
  const s = oPet(a);
  return s.charAt(0).toUpperCase() + s.slice(1);
};
const fem = (a: Answers, m: string, f: string) => (a.sex === "femea" ? f : m);

const SPECIES_STEP: StepDef = { key: "especie", title: () => "Seu pet é…", hint: "O cadastro e a agenda se adaptam a ele.", Body: SpeciesStep };

const S: Record<string, StepDef> = {
  nome: { key: "nome", title: (a) => `Qual é o nome do seu ${bicho(a)}?`, hint: "Se quiser, coloque uma foto também.", Body: NameStep },
  raca: { key: "raca", title: (a) => `Qual é a raça ${a.name.trim() ? `de ${a.name.trim()}` : "dele"}?`, Body: BreedStep },
  sexo: { key: "sexo", title: (a) => `${a.name.trim() || `Seu ${bicho(a)}`} é macho ou fêmea?`, Body: SexStep },
  idade: { key: "idade", title: (a) => `Quando ${oPet(a)} nasceu?`, hint: "Se não souber a data, use a idade aproximada.", Body: AgeStep },
  porte: { key: "porte", title: (a) => `Qual é o porte ${a.name.trim() ? `de ${a.name.trim()}` : "dele"}?`, Body: SizeStep },
  origem: { key: "origem", title: (a) => `Como ${oPet(a)} chegou até você?`, Body: OriginStep },
  castrado: { key: "castrado", title: (a) => `${OPet(a)} é ${fem(a, "castrado", "castrada")}?`, Body: NeuteredStep },
  estilo: { key: "estilo", title: (a) => `Como é a rotina ${a.name.trim() ? `${fem(a, "do", "da")} ${a.name.trim()}` : "dele"}?`, hint: "Ajuda a definir o vermífugo e as vacinas.", Body: LifestyleStep },
  outros: { key: "outros", title: (a) => `${OPet(a)} mora com outros animais?`, hint: "Pode marcar mais de um.", Body: OtherAnimalsStep },
  felv: { key: "felv", title: (a) => `${OPet(a)} já fez o teste de FeLV/FIV?`, hint: "Exame de sangue para duas doenças que passam entre gatos.", Body: FelvStep },
  doenca: { key: "doenca", title: (a) => `${OPet(a)} tem alguma doença de base?`, hint: "Ex.: problema no coração, rim, diabetes, epilepsia.", Body: DiseaseStep },
  alergia: { key: "alergia", title: (a) => `${OPet(a)} tem alguma alergia?`, hint: "Ex.: a algum alimento, remédio ou picada.", Body: AllergyStep },
  remedio: { key: "remedio", title: (a) => `${OPet(a)} toma algum remédio todo dia ou sempre?`, hint: "Se sim, já criamos o lembrete.", Body: MedStep },
  vacinas: { key: "vacinas", title: () => "Quais vacinas já foram feitas?", hint: "Marque e, se souber, coloque a data da última dose.", Body: VaccinesStep },
  vermifugo: { key: "vermifugo", title: () => "Quando foi o último vermífugo?", hint: "Pode ser uma data aproximada.", Body: DewormerStep },
  pulgas: {
    key: "pulgas",
    title: (a) => (isCat(a) ? `Como você protege ${oPet(a)} de pulgas?` : `Como você protege ${oPet(a)} de pulgas e carrapatos?`),
    Body: FleaStep,
  },
  racao: { key: "racao", title: (a) => (isCat(a) ? `O que ${oPet(a)} come?` : `Qual ração ${oPet(a)} come?`), hint: "Opcional.", Body: FoodStep },
  vet: { key: "vet", title: () => "Tem um veterinário de confiança?", hint: "Opcional. Fica à mão quando precisar.", Body: VetStep },
  plano: {
    key: "plano",
    title: (a) => `${a.name.trim() || "Seu pet"} tem plano de saúde?`,
    hint: "Opcional. Dá para completar e guardar o PDF depois, no perfil do pet.",
    Body: PlanStep,
  },
  convite: {
    key: "convite",
    title: (a) => `Mais alguém cuida ${a.name.trim() ? `${fem(a, "do", "da")} ${a.name.trim()}` : "dele"}?`,
    hint: "Os dois veem a mesma agenda e sabem quem já fez cada coisa.",
    Body: InviteStep,
  },
};

const DOG_KEYS = ["nome", "raca", "sexo", "idade", "porte", "origem", "castrado", "doenca", "alergia", "remedio", "vacinas", "vermifugo", "pulgas", "racao", "vet", "convite", "plano"];
const CAT_KEYS = ["nome", "raca", "sexo", "idade", "origem", "castrado", "estilo", "outros", "felv", "doenca", "alergia", "remedio", "vacinas", "vermifugo", "pulgas", "racao", "vet", "convite", "plano"];

/** "Seu pet é…" + as perguntas da espécie (16 de cachorro, 18 de gato) + plano de saúde (opcional). */
export function stepsFor(species: Species | null): StepDef[] {
  return [SPECIES_STEP, ...(species === "gato" ? CAT_KEYS : DOG_KEYS).map((k) => S[k])];
}

// ---------------------------------------------------------------------------------------------

function SpeciesStep({ a, set, next }: StepProps) {
  const options: { v: Species; label: string; emoji: string }[] = [
    { v: "cachorro", label: "Cachorro", emoji: "🐶" },
    { v: "gato", label: "Gato", emoji: "🐱" },
  ];
  return (
    <div className="grid grid-cols-2 gap-3">
      {options.map((o, i) => {
        const sel = a.species === o.v;
        return (
          <motion.button
            key={o.v}
            type="button"
            aria-pressed={sel}
            onClick={() => (set({ species: o.v }), next())}
            initial={{ opacity: 0, y: 18, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.08 * i, type: "spring", stiffness: 320, damping: 24 }}
            whileTap={{ scale: 0.95 }}
            className={`flex h-52 flex-col items-center justify-center gap-3 rounded-3xl border-2 shadow-card transition-colors ${
              sel ? "border-forest bg-forest text-pink" : "border-line bg-card text-forest"
            }`}
          >
            <motion.span
              className="text-7xl"
              animate={sel ? { rotate: [0, -12, 10, -6, 0], scale: [1, 1.15, 1] } : { y: [0, -6, 0] }}
              transition={sel ? { duration: 0.6 } : { duration: 2.4, repeat: Infinity, ease: "easeInOut", delay: i * 0.5 }}
              aria-hidden
            >
              {o.emoji}
            </motion.span>
            <span className="titulo text-2xl">{o.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
}

const LIFESTYLES: { v: Lifestyle; label: string; icon: string; hint: string }[] = [
  { v: "dentro", label: "Só dentro de casa", icon: "🏠", hint: "Apartamento ou casa telada" },
  { v: "as_vezes", label: "Sai para a rua às vezes", icon: "🪟", hint: "Quintal, passeios" },
  { v: "sempre", label: "Sai sempre", icon: "🌳", hint: "Entra e sai quando quer" },
];

function LifestyleStep({ a, set, next }: StepProps) {
  return (
    <div className="space-y-3">
      {LIFESTYLES.map((o) => (
        <Choice key={o.v} selected={a.lifestyle === o.v} onClick={() => (set({ lifestyle: o.v }), next())} icon={o.icon} title={o.label} hint={o.hint} />
      ))}
    </div>
  );
}

const OTHER_ANIMALS: { v: OtherAnimal; label: string; icon: string }[] = [
  { v: "gatos", label: "Outros gatos", icon: "🐈" },
  { v: "cachorros", label: "Cachorros", icon: "🐕" },
  { v: "nenhum", label: "Nenhum, só ele", icon: "🙂" },
];

function OtherAnimalsStep({ a, set }: StepProps) {
  function toggle(v: OtherAnimal) {
    if (v === "nenhum") return set({ otherAnimals: a.otherAnimals.includes("nenhum") ? [] : ["nenhum"] });
    const rest = a.otherAnimals.filter((x) => x !== "nenhum");
    set({ otherAnimals: rest.includes(v) ? rest.filter((x) => x !== v) : [...rest, v] });
  }
  return (
    <div className="space-y-3">
      {OTHER_ANIMALS.map((o) => (
        <Choice key={o.v} selected={a.otherAnimals.includes(o.v)} onClick={() => toggle(o.v)} icon={o.icon} title={o.label} />
      ))}
    </div>
  );
}

const FELV: { v: FelvTest; label: string; icon: string }[] = [
  { v: "negativo", label: "Sim, deu negativo", icon: "✅" },
  { v: "positivo", label: "Sim, deu positivo", icon: "➕" },
  { v: "nao_fez", label: "Não fez", icon: "—" },
  { v: "nao_sei", label: "Não sei", icon: "🤔" },
];

function FelvStep({ a, set, next }: StepProps) {
  const tested = a.felv.test === "negativo" || a.felv.test === "positivo";
  return (
    <div className="space-y-3">
      {FELV.map((o) => (
        <Choice
          key={o.v}
          selected={a.felv.test === o.v}
          onClick={() => {
            set({ felv: { ...a.felv, test: o.v } });
            if (o.v === "nao_fez" || o.v === "nao_sei") next();
          }}
          icon={o.icon}
          title={o.label}
        />
      ))}
      {tested && (
        <CampoData label="Quando fez o teste? (se souber)" value={a.felv.date} max={new Date().toISOString().slice(0, 10)} optional onChange={(v) => set({ felv: { ...a.felv, date: v } })} />
      )}
      {a.felv.test === "positivo" && (
        <p className="rounded-2xl bg-olive-soft px-4 py-3 text-sm text-forest">
          Muitos gatos positivos vivem bem por anos. O veterinário vai indicar o acompanhamento certo.
        </p>
      )}
    </div>
  );
}

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
  const all = breedsFor(a.species);
  const list = useMemo(() => {
    const n = normalize(q.trim());
    return n ? all.filter((b) => normalize(b.name).includes(n)) : all;
  }, [q, all]);
  const exact = all.some((b) => normalize(b.name) === normalize(q.trim()));

  function choose(name: string) {
    const size = isCat(a) ? null : breedSize(name);
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
        <CampoData value={a.birth} max={new Date().toISOString().slice(0, 10)} optional emptyText="Escolher a data" onChange={(v) => set({ birth: v })} />
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
          <div className="campos-2">
            <CampoData label="Começa em" value={m.start} onChange={(v) => setMed({ start: v })} />
            {m.freq !== "unica" && <CampoData label="Termina em" kind="por" optional emptyText="Contínuo" base={m.start} value={m.end} onChange={(v) => setMed({ end: v })} />}
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
      {vaccinesFor(a.species).map((v) => {
        const ans = a.vaccines[v.key];
        const toggle = () => set({ vaccines: { ...a.vaccines, [v.key]: { ...ans, done: !ans.done } } });
        return (
          <div key={v.key} className={`rounded-3xl border-2 transition ${ans.done ? "border-primary bg-primary-soft" : "border-line bg-card"}`}>
            <Choice selected={ans.done} onClick={toggle} title={v.label} hint={v.hint || undefined} className="border-0 bg-transparent" />
            {ans.done && (
              <div className="px-4 pb-4">
                <CampoData label="Última dose (se souber)" value={ans.last} max={new Date().toISOString().slice(0, 10)} optional onChange={(d) => set({ vaccines: { ...a.vaccines, [v.key]: { ...ans, last: d } } })} />
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
      <CampoData label="Data aproximada" value={a.dewormer.last} max={new Date().toISOString().slice(0, 10)} optional onChange={(v) => set({ dewormer: { ...a.dewormer, last: v } })} />
      <TextField
        label="Produto (opcional)"
        value={a.dewormer.product}
        onChange={(v) => set({ dewormer: { ...a.dewormer, product: v } })}
        placeholder="Nome do produto"
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

const FLEA_CAT: typeof FLEA = [
  { v: "pipeta", label: "Pipeta (na nuca)", icon: "💧" },
  { v: "comprimido", label: "Comprimido", icon: "💊" },
  { v: "coleira", label: "Coleira para gatos", icon: "📿" },
  { v: "nenhuma", label: "Nenhuma por enquanto", icon: "—" },
];

function FleaStep({ a, set }: StepProps) {
  const cat = isCat(a);
  const options = cat ? FLEA_CAT : FLEA;
  return (
    <div className="space-y-3">
      <FleaSafetyNote species={a.species ?? "cachorro"} />
      {options.map((f) => (
        <Choice key={f.v} selected={a.flea.method === f.v} onClick={() => set({ flea: { ...a.flea, method: f.v } })} icon={f.icon} title={f.label} />
      ))}
      {a.flea.method && a.flea.method !== "nenhuma" && (
        <CampoData
          label={a.flea.method === "coleira" ? "Quando trocou a coleira?" : "Última aplicação"}
          value={a.flea.last}
          max={new Date().toISOString().slice(0, 10)}
          optional
          onChange={(v) => set({ flea: { ...a.flea, last: v } })}
        />
      )}
    </div>
  );
}

const FOOD_TYPES: { value: FoodType; label: string }[] = [
  { value: "seca", label: "Ração seca" },
  { value: "umida", label: "Úmida (sachê/lata)" },
  { value: "mista", label: "Mista" },
];

function FoodStep({ a, set }: StepProps) {
  if (isCat(a)) {
    return (
      <div className="space-y-4">
        <Pills options={FOOD_TYPES} value={a.food.type} onChange={(v) => set({ food: { ...a.food, type: v } })} />
        <TextField label="Marca (opcional)" value={a.food.brand} onChange={(v) => set({ food: { ...a.food, brand: v } })} placeholder="Marca da ração" />
      </div>
    );
  }
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

function PlanStep({ a, set, next }: StepProps) {
  const p = a.plan;
  const setPlan = (patch: Partial<Answers["plan"]>) => set({ plan: { ...p, ...patch } });
  return (
    <div className="space-y-4">
      <YesNo value={p.has} onChange={(v) => (setPlan({ has: v }), !v && next())} />
      {p.has && (
        <div className="space-y-4 rounded-3xl bg-card p-4 shadow-card">
          <TextField label="Operadora" value={p.operator} onChange={(v) => setPlan({ operator: v })} placeholder="Nome da empresa" />
          <TextField label="Nome do plano" value={p.name} onChange={(v) => setPlan({ name: v })} />
          <TextField label="Número da carteirinha" value={p.card} onChange={(v) => setPlan({ card: v })} />
          <TextField label="Telefone da central" type="tel" inputMode="tel" value={p.phone} onChange={(v) => setPlan({ phone: v })} />
        </div>
      )}
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
