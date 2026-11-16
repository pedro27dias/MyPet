import type { AppUser, Care, CareRecord, CompleteResult, InvitePreview, Pet, PetFields, Tutor } from "../types";

/**
 * Tudo que o app lê e grava passa por aqui. Duas versões com o mesmo jeito de usar:
 * - nuvem (Supabase): dados de verdade, compartilhados entre tutores;
 * - demonstração: guarda só neste aparelho (para testar sem conta).
 * Toda gravação lança um erro em português se não der certo: a tela só muda depois que confirma.
 */
export interface Repo {
  mode: "nuvem" | "demo";

  // Login
  currentUser(): Promise<AppUser | null>;
  onAuthChange(cb: (user: AppUser | null) => void): () => void;
  signIn(email: string, password: string): Promise<void>;
  /** Devolve true se precisa confirmar o e-mail antes de entrar. */
  signUp(name: string, email: string, password: string): Promise<boolean>;
  signInWithGoogle(): Promise<void>;
  signOut(): Promise<void>;

  // Cachorros
  listPets(): Promise<Pet[]>;
  createPet(pet: PetFields, cares: Care[], history: { careId: string; at: string }[]): Promise<string>;
  updatePet(id: string, patch: Partial<PetFields>): Promise<void>;
  setPetPhoto(petId: string, photo: Blob): Promise<void>;

  // Cuidados e registros
  listCares(petId: string): Promise<Care[]>;
  /** Registros a partir de uma data (ISO). */
  listRecords(petId: string, since: string): Promise<CareRecord[]>;
  saveCare(care: Care): Promise<void>;
  complete(args: {
    care: Care;
    occurrence: string;
    status: "feito" | "pulado";
    doneAt?: string;
    reason?: string;
    next?: string | null;
    force?: boolean;
  }): Promise<CompleteResult>;
  snooze(care: Care, occurrence: string, until: string): Promise<void>;
  updateRecordTime(recordId: string, doneAt: string): Promise<void>;
  /** Registro direto no cartão de vacina (aplicação já feita). Se `next` vier, vira a próxima data do cuidado. */
  addRecord(args: { care: Care; at: string; clinic?: string | null; photo?: Blob | null; next?: string | null }): Promise<void>;
  /** Links para mostrar fotos guardadas (etiquetas). */
  photoUrls(paths: string[]): Promise<Record<string, string>>;
  undo(recordId: string): Promise<void>;

  // Tutores
  listTutors(petId: string): Promise<Tutor[]>;
  createInvite(petId: string): Promise<string>;
  peekInvite(code: string): Promise<InvitePreview | null>;
  acceptInvite(code: string): Promise<string>;

  /** Avisa quando outro tutor muda algo deste cachorro. Devolve a função para parar. */
  subscribe(petId: string, onChange: () => void): () => void;
}
