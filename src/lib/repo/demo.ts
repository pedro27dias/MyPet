import type { AppUser, Care, CareRecord, Pet, PetFields, Tutor } from "../types";
import { newId } from "../onboarding";
import type { Repo } from "./types";

/*
 * Modo demonstração: guarda tudo só neste aparelho (localStorage), com as mesmas regras do banco.
 * Serve para testar o app sem criar conta. Não é compartilhado com outros tutores.
 */

const KEY = "mypet-demo";
const USER: AppUser = { id: "demo-user", name: "Você", email: null };

interface DemoDb {
  signedIn: boolean;
  pets: (Omit<Pet, "role" | "photoUrl"> & { photoData: string | null })[];
  cares: Care[];
  records: CareRecord[];
}

function load(): DemoDb {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as DemoDb;
  } catch {
    /* sem armazenamento: começa vazio */
  }
  return { signedIn: false, pets: [], cares: [], records: [] };
}

function save(db: DemoDb) {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch {
    throw new Error("Não foi possível guardar neste aparelho (memória cheia?).");
  }
  listeners.forEach((l) => l());
}

const listeners = new Set<() => void>();
const authListeners = new Set<(u: AppUser | null) => void>();

const wait = () => new Promise((r) => setTimeout(r, 120));

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.onerror = () => reject(new Error("Não foi possível ler a foto."));
    fr.readAsDataURL(blob);
  });
}

export const demoRepo: Repo = {
  mode: "demo",

  async currentUser() {
    return load().signedIn ? USER : null;
  },
  onAuthChange(cb) {
    authListeners.add(cb);
    return () => authListeners.delete(cb);
  },
  async signIn() {
    const db = load();
    db.signedIn = true;
    save(db);
    authListeners.forEach((l) => l(USER));
  },
  async signUp() {
    await demoRepo.signIn("", "");
    return false;
  },
  async signInWithGoogle() {
    await demoRepo.signIn("", "");
  },
  async signOut() {
    const db = load();
    db.signedIn = false;
    save(db);
    authListeners.forEach((l) => l(null));
  },

  async listPets() {
    await wait();
    return load().pets.map(({ photoData, ...p }) => ({ ...p, photoUrl: photoData, role: "principal" as const }));
  },
  async createPet(pet: PetFields, cares, history) {
    await wait();
    const db = load();
    const id = newId();
    db.pets.push({ ...pet, id, photoPath: null, photoData: null });
    for (const c of cares) db.cares.push({ ...c, petId: id });
    for (const h of history) {
      db.records.push({
        id: newId(),
        careId: h.careId,
        petId: id,
        occurrence: h.at,
        status: "feito",
        doneAt: h.at,
        snoozedTo: null,
        reason: null,
        by: USER.id,
        createdAt: new Date().toISOString(),
      });
    }
    save(db);
    return id;
  },
  async updatePet(id, patch) {
    const db = load();
    const p = db.pets.find((x) => x.id === id);
    if (!p) throw new Error("Pet não encontrado.");
    Object.assign(p, patch);
    save(db);
  },
  async setPetPhoto(petId, photo) {
    const data = await blobToDataUrl(photo);
    const db = load();
    const p = db.pets.find((x) => x.id === petId);
    if (!p) throw new Error("Pet não encontrado.");
    p.photoData = data;
    save(db);
  },

  async listCares(petId) {
    return load().cares.filter((c) => c.petId === petId);
  },
  async listRecords(petId, since) {
    const t = new Date(since).getTime();
    return load().records.filter(
      (r) => r.petId === petId && (new Date(r.occurrence).getTime() >= t || (r.doneAt && new Date(r.doneAt).getTime() >= t)),
    );
  },
  async saveCare(care) {
    await wait();
    const db = load();
    const i = db.cares.findIndex((c) => c.id === care.id);
    if (i >= 0) db.cares[i] = care;
    else db.cares.push(care);
    save(db);
  },
  async complete({ care, occurrence, status, doneAt, reason, next, force }) {
    await wait();
    const db = load();
    const c = db.cares.find((x) => x.id === care.id);
    if (!c) throw new Error("Cuidado não encontrado.");
    const t = new Date(occurrence).getTime();
    const already = db.records
      .filter((r) => r.careId === c.id && new Date(r.occurrence).getTime() === t && r.status !== "adiado")
      .at(-1);
    if (already && !force) {
      return { ok: false, already: { status: already.status, byName: "Você", at: already.doneAt ?? already.createdAt } };
    }
    const record: CareRecord = {
      id: newId(),
      careId: c.id,
      petId: c.petId,
      occurrence,
      status,
      doneAt: status === "feito" ? doneAt ?? new Date().toISOString() : null,
      snoozedTo: null,
      reason: reason ?? null,
      by: USER.id,
      createdAt: new Date().toISOString(),
    };
    db.records.push(record);
    if ((c.freq === "meses" || c.freq === "anos") && next && c.nextAt && new Date(c.nextAt).getTime() === t) c.nextAt = next;
    save(db);
    return { ok: true, record };
  },
  async snooze(care, occurrence, until) {
    const db = load();
    db.records.push({
      id: newId(),
      careId: care.id,
      petId: care.petId,
      occurrence,
      status: "adiado",
      doneAt: null,
      snoozedTo: until,
      reason: null,
      by: USER.id,
      createdAt: new Date().toISOString(),
    });
    save(db);
  },
  async updateRecordTime(recordId, doneAt) {
    const db = load();
    const r = db.records.find((x) => x.id === recordId);
    if (!r) throw new Error("Registro não encontrado.");
    r.doneAt = doneAt;
    save(db);
  },
  async undo(recordId) {
    const db = load();
    const r = db.records.find((x) => x.id === recordId);
    if (!r) return;
    db.records = db.records.filter((x) => x.id !== recordId);
    const c = db.cares.find((x) => x.id === r.careId);
    const t = new Date(r.occurrence).getTime();
    const stillDone = db.records.some((x) => x.careId === r.careId && new Date(x.occurrence).getTime() === t && x.status !== "adiado");
    if (c && (c.freq === "meses" || c.freq === "anos") && !stillDone && (!c.nextAt || new Date(c.nextAt).getTime() > t)) {
      c.nextAt = r.occurrence;
    }
    save(db);
  },

  async listTutors(): Promise<Tutor[]> {
    return [{ userId: USER.id, name: USER.name, role: "principal" }];
  },
  async createInvite() {
    return "DEMO42";
  },
  async peekInvite() {
    return null;
  },
  async acceptInvite() {
    throw new Error("Convites só funcionam com conta (fora do modo demonstração).");
  },
  subscribe(_petId, onChange) {
    listeners.add(onChange);
    return () => listeners.delete(onChange);
  },
};
