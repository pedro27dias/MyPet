/** Tipos de dados do app. No banco os nomes são em português (ver supabase/migrations). */

export type Sex = "macho" | "femea";
export type Size = "pequeno" | "medio" | "grande" | "gigante";
export type Origin = "adotado" | "resgatado" | "comprado" | "presente" | "outro";
export type Role = "principal" | "tutor";
export type Species = "cachorro" | "gato";
/** Gato: só dentro de casa / sai às vezes / sai sempre */
export type Lifestyle = "dentro" | "as_vezes" | "sempre";
export type OtherAnimal = "gatos" | "cachorros" | "nenhum";
/** Teste de FeLV/FIV (gatos) */
export type FelvTest = "negativo" | "positivo" | "nao_fez" | "nao_sei";
export type FoodType = "seca" | "umida" | "mista";

export interface PetFields {
  species: Species;
  name: string;
  breed: string | null;
  sex: Sex | null;
  /** AAAA-MM-DD */
  birth: string | null;
  /** true = data calculada pela idade aproximada */
  birthApprox: boolean;
  size: Size | null;
  origin: Origin | null;
  neutered: boolean | null;
  diseases: string | null;
  allergies: string | null;
  foodBrand: string | null;
  foodAmount: string | null;
  vetName: string | null;
  vetPhone: string | null;
  // Só gatos (null nos cachorros)
  lifestyle: Lifestyle | null;
  otherAnimals: OtherAnimal[] | null;
  felvTest: FelvTest | null;
  foodType: FoodType | null;
}

export interface Pet extends PetFields {
  id: string;
  photoPath: string | null;
  /** Link temporário da foto (ou imagem guardada no aparelho no modo demonstração). */
  photoUrl: string | null;
  role: Role;
}

/** exame = testes com resultado (ex.: FeLV/FIV dos gatos); aparecem no cartão de vacina. */
export type CareType = "remedio" | "vacina" | "vermifugo" | "antipulgas" | "consulta" | "exame" | "outro";

/**
 * unica = uma vez · horas/diaria/semanal/dias = horários fixos (remédios) ·
 * meses/anos = conta a partir da última vez feita (vacina, vermífugo, antipulgas).
 */
export type Freq = "unica" | "horas" | "diaria" | "semanal" | "dias" | "meses" | "anos";

export interface Care {
  id: string;
  petId: string;
  type: CareType;
  title: string;
  /** dose, produto, local... */
  detail: string | null;
  note: string | null;
  freq: Freq;
  interval: number;
  /** "HH:MM" */
  times: string[];
  /** AAAA-MM-DD */
  start: string;
  end: string | null;
  /** Próxima data (ISO) — só para unica, meses e anos. */
  nextAt: string | null;
  notifyBeforeMin: number | null;
  active: boolean;
  /** Quando foi criado (ISO). Horários fixos antes disso não contam. */
  createdAt?: string;
}

export type RecordStatus = "feito" | "pulado" | "adiado";

export interface CareRecord {
  id: string;
  careId: string;
  petId: string;
  /** Horário/data da regra que este registro resolve (ISO). */
  occurrence: string;
  status: RecordStatus;
  doneAt: string | null;
  snoozedTo: string | null;
  reason: string | null;
  by: string | null;
  /** Onde foi feito (clínica/veterinário) — cartão de vacina. */
  clinic?: string | null;
  /** Foto da etiqueta/lote: caminho no Storage (ou a imagem, no modo demonstração). */
  labelPhoto?: string | null;
  /** Resultado de exame/teste (ex.: "Negativo"). */
  result?: string | null;
  createdAt: string;
}

export interface Tutor {
  userId: string;
  name: string;
  role: Role;
}

export interface AppUser {
  id: string;
  name: string;
  email: string | null;
}

export type CompleteResult =
  | { ok: true; record: CareRecord }
  | { ok: false; already: { status: RecordStatus; byName: string; at: string } };

export interface InvitePreview {
  pet: string;
  from: string | null;
  valid: boolean;
}

export type ExpenseCategory = "racao" | "vet" | "remedio" | "banho" | "outros";

export interface Expense {
  id: string;
  petId: string;
  /** Em reais (ex.: 89.9) */
  amount: number;
  category: ExpenseCategory;
  /** AAAA-MM-DD */
  date: string;
  /** Quem pagou (id do tutor) */
  paidBy: string | null;
  note: string | null;
}
