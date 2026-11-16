import type { User } from "@supabase/supabase-js";
import { friendlyError, supabase } from "../supabase";
import type { AppUser, Care, CareRecord, Pet, PetFields, RecordStatus, Role } from "../types";
import type { Repo } from "./types";

/* Versão "nuvem": Supabase. Nomes do banco em português ↔ tipos do app em inglês. */

type Row = Record<string, unknown>;
const BUCKET = "fotos-pets";

function fail(e: unknown): never {
  throw new Error(friendlyError(e));
}

/** Gravação que precisa voltar linha (o RLS bloqueia sem dar erro). */
function expectRows<T>(res: { data: T[] | null; error: unknown }): T[] {
  if (res.error) fail(res.error);
  if (!res.data || res.data.length === 0) throw new Error("Não foi possível salvar. Você ainda é tutor deste pet?");
  return res.data;
}

function toUser(u: User | null | undefined): AppUser | null {
  if (!u) return null;
  const m = u.user_metadata ?? {};
  const name = (m.nome || m.full_name || m.name || u.email?.split("@")[0] || "Você") as string;
  return { id: u.id, name, email: u.email ?? null };
}

function petFromRow(r: Row, role: Role, photoUrl: string | null): Pet {
  return {
    id: r.id as string,
    name: r.nome as string,
    photoPath: (r.foto as string) ?? null,
    photoUrl,
    breed: (r.raca as string) ?? null,
    sex: (r.sexo as Pet["sex"]) ?? null,
    birth: (r.nascimento as string) ?? null,
    birthApprox: Boolean(r.nascimento_aprox),
    size: (r.porte as Pet["size"]) ?? null,
    origin: (r.origem as Pet["origin"]) ?? null,
    neutered: (r.castrado as boolean | null) ?? null,
    diseases: (r.doencas as string) ?? null,
    allergies: (r.alergias as string) ?? null,
    foodBrand: (r.racao_marca as string) ?? null,
    foodAmount: (r.racao_qtd as string) ?? null,
    vetName: (r.vet_nome as string) ?? null,
    vetPhone: (r.vet_telefone as string) ?? null,
    role,
  };
}

const PET_COLUMNS: Record<keyof PetFields, string> = {
  name: "nome",
  breed: "raca",
  sex: "sexo",
  birth: "nascimento",
  birthApprox: "nascimento_aprox",
  size: "porte",
  origin: "origem",
  neutered: "castrado",
  diseases: "doencas",
  allergies: "alergias",
  foodBrand: "racao_marca",
  foodAmount: "racao_qtd",
  vetName: "vet_nome",
  vetPhone: "vet_telefone",
};

function petToRow(p: Partial<PetFields>): Row {
  const row: Row = {};
  for (const [k, col] of Object.entries(PET_COLUMNS)) {
    if (k in p) row[col] = p[k as keyof PetFields];
  }
  return row;
}

function careFromRow(r: Row): Care {
  return {
    id: r.id as string,
    petId: r.pet_id as string,
    type: r.tipo as Care["type"],
    title: r.titulo as string,
    detail: (r.detalhe as string) ?? null,
    note: (r.observacao as string) ?? null,
    freq: r.freq as Care["freq"],
    interval: (r.intervalo as number) ?? 1,
    times: (r.horarios as string[]) ?? ["09:00"],
    start: r.inicio as string,
    end: (r.fim as string) ?? null,
    nextAt: (r.proxima_em as string) ?? null,
    notifyBeforeMin: (r.antecedencia_min as number) ?? null,
    active: Boolean(r.ativo),
    createdAt: r.criado_em as string,
  };
}

function careToRow(c: Care): Row {
  return {
    id: c.id,
    pet_id: c.petId,
    tipo: c.type,
    titulo: c.title,
    detalhe: c.detail,
    observacao: c.note,
    freq: c.freq,
    intervalo: c.interval,
    horarios: c.times,
    inicio: c.start,
    fim: c.end,
    proxima_em: c.nextAt,
    antecedencia_min: c.notifyBeforeMin,
    ativo: c.active,
  };
}

function recordFromRow(r: Row): CareRecord {
  return {
    id: r.id as string,
    careId: r.cuidado_id as string,
    petId: r.pet_id as string,
    occurrence: r.ocorrencia as string,
    status: r.status as RecordStatus,
    doneAt: (r.feito_em as string) ?? null,
    snoozedTo: (r.adiado_para as string) ?? null,
    reason: (r.motivo as string) ?? null,
    by: (r.por as string) ?? null,
    clinic: (r.clinica as string) ?? null,
    labelPhoto: (r.lote_foto as string) ?? null,
    createdAt: r.criado_em as string,
  };
}

async function uid(): Promise<string> {
  const { data } = await supabase().auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new Error("Sua sessão terminou. Entre de novo.");
  return id;
}

export const cloudRepo: Repo = {
  mode: "nuvem",

  async currentUser() {
    const { data } = await supabase().auth.getSession();
    return toUser(data.session?.user);
  },

  onAuthChange(cb) {
    const { data } = supabase().auth.onAuthStateChange((_e, session) => cb(toUser(session?.user)));
    return () => data.subscription.unsubscribe();
  },

  async signIn(email, password) {
    const { error } = await supabase().auth.signInWithPassword({ email: email.trim(), password });
    if (error) fail(error);
  },

  async signUp(name, email, password) {
    const { data, error } = await supabase().auth.signUp({
      email: email.trim(),
      password,
      options: { data: { nome: name.trim() }, emailRedirectTo: window.location.origin },
    });
    if (error) fail(error);
    return !data.session;
  },

  async signInWithGoogle() {
    const { error } = await supabase().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.href },
    });
    if (error) fail(error);
  },

  async signOut() {
    const { error } = await supabase().auth.signOut();
    if (error) fail(error);
  },

  async listPets() {
    const me = await uid();
    const res = await supabase().from("tutores").select("papel, pets(*)").eq("user_id", me).order("criado_em");
    if (res.error) fail(res.error);
    const rows = (res.data ?? []) as unknown as { papel: Role; pets: Row | null }[];
    const paths = rows.map((r) => r.pets?.foto as string | undefined).filter((p): p is string => !!p);
    const urls = new Map<string, string>();
    if (paths.length) {
      const signed = await supabase().storage.from(BUCKET).createSignedUrls(paths, 60 * 60 * 12);
      for (const s of signed.data ?? []) if (s.path && s.signedUrl) urls.set(s.path, s.signedUrl);
    }
    return rows
      .filter((r) => r.pets)
      .map((r) => petFromRow(r.pets!, r.papel, urls.get(r.pets!.foto as string) ?? null));
  },

  async createPet(pet, cares, history) {
    const { data, error } = await supabase().rpc("criar_pet", {
      p: petToRow(pet),
      // o id do pet ainda não existe: o banco preenche (o app manda um provisório)
      p_cuidados: cares.map((c) => {
        const row = careToRow(c);
        delete row.pet_id;
        return row;
      }),
      p_registros: history.map((h) => ({ cuidado_id: h.careId, ocorrencia: h.at, feito_em: h.at })),
    });
    if (error) fail(error);
    return data as string;
  },

  async updatePet(id, patch) {
    expectRows(await supabase().from("pets").update(petToRow(patch)).eq("id", id).select("id"));
  },

  async setPetPhoto(petId, photo) {
    const path = `${petId}/foto-${Date.now()}.jpg`;
    const up = await supabase().storage.from(BUCKET).upload(path, photo, { contentType: "image/jpeg", upsert: true });
    if (up.error) fail(up.error);
    expectRows(await supabase().from("pets").update({ foto: path }).eq("id", petId).select("id"));
  },

  async listCares(petId) {
    const res = await supabase().from("cuidados").select("*").eq("pet_id", petId).order("criado_em");
    if (res.error) fail(res.error);
    return (res.data ?? []).map(careFromRow);
  },

  async listRecords(petId, since) {
    const res = await supabase()
      .from("registros")
      .select("*")
      .eq("pet_id", petId)
      .or(`ocorrencia.gte.${since},feito_em.gte.${since}`)
      .order("criado_em");
    if (res.error) fail(res.error);
    return (res.data ?? []).map(recordFromRow);
  },

  async saveCare(care) {
    const row = { ...careToRow(care), atualizado_em: new Date().toISOString() };
    expectRows(await supabase().from("cuidados").upsert(row).select("id"));
  },

  async complete({ care, occurrence, status, doneAt, reason, next, force }) {
    const { data, error } = await supabase().rpc("concluir_cuidado", {
      p_cuidado: care.id,
      p_ocorrencia: occurrence,
      p_status: status,
      p_feito_em: doneAt ?? null,
      p_motivo: reason ?? null,
      p_proxima: next ?? null,
      p_forcar: Boolean(force),
    });
    if (error) fail(error);
    const res = data as { ok: boolean; registro?: Row; status?: RecordStatus; por_nome?: string; feito_em?: string };
    if (res.ok && res.registro) return { ok: true, record: recordFromRow(res.registro) };
    return {
      ok: false,
      already: { status: res.status ?? "feito", byName: res.por_nome || "outro tutor", at: res.feito_em ?? new Date().toISOString() },
    };
  },

  async snooze(care, occurrence, until) {
    const me = await uid();
    expectRows(
      await supabase()
        .from("registros")
        .insert({ cuidado_id: care.id, pet_id: care.petId, ocorrencia: occurrence, status: "adiado", adiado_para: until, por: me })
        .select("id"),
    );
  },

  async addRecord({ care, at, clinic, photo, next }) {
    const me = await uid();
    let path: string | null = null;
    if (photo) {
      path = `${care.petId}/etiqueta-${Date.now()}.jpg`;
      const up = await supabase().storage.from(BUCKET).upload(path, photo, { contentType: "image/jpeg" });
      if (up.error) fail(up.error);
    }
    const row: Row = { cuidado_id: care.id, pet_id: care.petId, ocorrencia: at, status: "feito", feito_em: at, por: me };
    // só manda as colunas novas quando preenchidas (funciona mesmo antes do SQL 002)
    if (clinic) row.clinica = clinic;
    if (path) row.lote_foto = path;
    const res = await supabase().from("registros").insert(row).select("id");
    if (res.error && /clinica|lote_foto/.test(res.error.message)) {
      throw new Error("Falta atualizar o banco: rode o arquivo 002_cartao_vacina.sql no Supabase.");
    }
    expectRows(res);
    if (next) await cloudRepo.saveCare({ ...care, nextAt: next });
  },

  async photoUrls(paths) {
    const out: Record<string, string> = {};
    const list = paths.filter(Boolean);
    if (!list.length) return out;
    const signed = await supabase().storage.from(BUCKET).createSignedUrls(list, 60 * 60);
    for (const s of signed.data ?? []) if (s.path && s.signedUrl) out[s.path] = s.signedUrl;
    return out;
  },

  async updateRecordTime(recordId, doneAt) {
    expectRows(await supabase().from("registros").update({ feito_em: doneAt }).eq("id", recordId).select("id"));
  },

  async undo(recordId) {
    const { error } = await supabase().rpc("desfazer_registro", { p_registro: recordId });
    if (error) fail(error);
  },

  async listTutors(petId) {
    const res = await supabase().from("tutores").select("user_id, papel").eq("pet_id", petId).order("criado_em");
    if (res.error) fail(res.error);
    const ids = (res.data ?? []).map((r) => r.user_id as string);
    const names = new Map<string, string>();
    if (ids.length) {
      const p = await supabase().from("perfis").select("id, nome").in("id", ids);
      for (const r of p.data ?? []) names.set(r.id as string, r.nome as string);
    }
    return (res.data ?? []).map((r) => ({
      userId: r.user_id as string,
      role: r.papel as Role,
      name: names.get(r.user_id as string) || "Tutor",
    }));
  },

  async createInvite(petId) {
    const { data, error } = await supabase().rpc("criar_convite", { p_pet: petId });
    if (error) fail(error);
    return data as string;
  },

  async peekInvite(code) {
    const { data, error } = await supabase().rpc("ver_convite", { p_codigo: code });
    if (error) fail(error);
    return (data as { pet: string; de: string | null; valido: boolean } | null)
      ? { pet: data.pet, from: data.de, valid: data.valido }
      : null;
  },

  async acceptInvite(code) {
    const { data, error } = await supabase().rpc("aceitar_convite", { p_codigo: code });
    if (error) fail(error);
    return data as string;
  },

  subscribe(petId, onChange) {
    const channel = supabase()
      .channel(`pet-${petId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "registros", filter: `pet_id=eq.${petId}` }, onChange)
      .on("postgres_changes", { event: "*", schema: "public", table: "cuidados", filter: `pet_id=eq.${petId}` }, onChange)
      .subscribe();
    return () => {
      supabase().removeChannel(channel);
    };
  },
};
