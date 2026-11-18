import type { AppUser, Care, CareRecord, CompleteResult, Expense, InvitePreview, MedicalRecord, Pet, PetFields, Tutor } from "../types";

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
  /** history = aplicações já feitas informadas no cadastro (result = resultado de exame). */
  createPet(pet: PetFields, cares: Care[], history: { careId: string; at: string; result?: string | null }[]): Promise<string>;
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
  /** Corrige horário e/ou observação de um registro (grava quem editou). */
  updateRecord(recordId: string, patch: { doneAt?: string; note?: string | null }): Promise<void>;
  /** Guarda uma foto do pet (ex.: embalagem da coleira) e devolve o caminho. */
  uploadPhoto(petId: string, photo: Blob, prefix: string): Promise<string>;
  /** Registro direto no cartão de vacina (aplicação já feita). Se `next` vier, vira a próxima data do cuidado. */
  addRecord(args: { care: Care; at: string; clinic?: string | null; photo?: Blob | null; next?: string | null; result?: string | null }): Promise<void>;
  /** Links para mostrar fotos guardadas (etiquetas). */
  photoUrls(paths: string[]): Promise<Record<string, string>>;
  undo(recordId: string): Promise<void>;

  // Prontuário
  listMedical(petId: string): Promise<MedicalRecord[]>;
  /** Cria ou corrige um registro clínico. */
  saveMedical(r: MedicalRecord): Promise<void>;
  deleteMedical(id: string): Promise<void>;
  /** Guarda um arquivo (foto ou PDF) do pet e devolve o caminho. */
  uploadFile(petId: string, file: Blob, prefix: string, ext: string): Promise<string>;

  // Gastos
  /** Gastos do pet entre duas datas (AAAA-MM-DD, inclusive). */
  listExpenses(petId: string, from: string, to: string): Promise<Expense[]>;
  /** Cria ou corrige um gasto. */
  saveExpense(e: Expense): Promise<void>;
  deleteExpense(id: string): Promise<void>;

  // Notificações
  savePushSubscription(endpoint: string, keys: Record<string, string>): Promise<void>;
  deletePushSubscription(endpoint: string): Promise<void>;
  /** Avisa os outros tutores que esta tarefa foi feita (não trava a tela se falhar). */
  notifyDone(recordId: string): Promise<void>;

  // Tutores
  listTutors(petId: string): Promise<Tutor[]>;
  createInvite(petId: string): Promise<string>;
  peekInvite(code: string): Promise<InvitePreview | null>;
  acceptInvite(code: string): Promise<string>;

  /** Avisa quando outro tutor muda algo deste cachorro. Devolve a função para parar. */
  subscribe(petId: string, onChange: () => void): () => void;
}
