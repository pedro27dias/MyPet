// Lembretes na hora: o Supabase (pg_cron, SQL 004) chama este endereço a cada 5 minutos.
// Ele acha as tarefas que chegaram na hora (ou o aviso antes das consultas) e manda para
// todos os tutores do pet que ligaram as notificações. Cada aviso sai uma vez só.


import { careFromRow, recordFromRow } from "@/lib/repo/cloud";
import { occurrencesBetween, type Occurrence } from "@/lib/schedule";
import { adminClient, cronAuthorized, hourText, sendToUsers } from "@/lib/server/notify";

export const dynamic = "force-dynamic";

const MIN = 60_000;

/*
 * Os horários dos lembretes ("08:00") são do Brasil, mas o servidor da Vercel roda em UTC.
 * As contas da agenda usam o horário "local" do computador; então aqui tudo é deslocado para o
 * "relógio de Brasília" antes das contas e volta ao normal depois (sem mexer no fuso do servidor).
 * Brasília = UTC-3 o ano todo (sem horário de verão desde 2019).
 */
const BRASILIA_OFFSET_MIN = -180;
const shiftMs = () => (-new Date().getTimezoneOffset() - BRASILIA_OFFSET_MIN) * MIN;
const toWall = (iso: string | null | undefined, shift: number) => (iso ? new Date(Date.parse(iso) - shift).toISOString() : (iso ?? null));
const fromWall = (d: Date, shift: number) => new Date(d.getTime() + shift);
/** Pega o que venceu nos últimos 15 min (se uma chamada falhar, a próxima ainda avisa). */
const LOOKBACK = 15 * MIN;
const AHEAD = 2 * MIN;

export async function GET(request: Request) {
  return POST(request);
}

export async function POST(request: Request) {
  if (!cronAuthorized(request)) return Response.json({ ok: false, error: "Sem permissão." }, { status: 401 });

  try {
    const db = adminClient();
    const now = new Date();

    // Quem tem notificação ligada → os pets dessas pessoas
    const { data: subs, error: e1 } = await db.from("notificacoes_inscricoes").select("user_id");
    if (e1) throw e1;
    const subscribers = [...new Set((subs ?? []).map((s) => s.user_id as string))];
    if (!subscribers.length) return Response.json({ ok: true, enviados: 0, motivo: "ninguém inscrito" });

    const { data: links, error: e2 } = await db.from("tutores").select("pet_id, user_id").in("user_id", subscribers);
    if (e2) throw e2;
    const petIds = [...new Set((links ?? []).map((l) => l.pet_id as string))];
    if (!petIds.length) return Response.json({ ok: true, enviados: 0 });

    const since = new Date(now.getTime() - 2 * 24 * 60 * MIN).toISOString();
    const [petsRes, caresRes, recsRes, allTutorsRes] = await Promise.all([
      db.from("pets").select("id, nome").in("id", petIds),
      db.from("cuidados").select("*").in("pet_id", petIds).eq("ativo", true),
      db.from("registros").select("*").in("pet_id", petIds).or(`ocorrencia.gte.${since},feito_em.gte.${since}`),
      db.from("tutores").select("pet_id, user_id").in("pet_id", petIds),
    ]);
    for (const r of [petsRes, caresRes, recsRes, allTutorsRes]) if (r.error) throw r.error;

    const petName = new Map((petsRes.data ?? []).map((p) => [p.id as string, p.nome as string]));
    const tutorsOf = new Map<string, string[]>();
    for (const t of allTutorsRes.data ?? []) {
      const list = tutorsOf.get(t.pet_id as string) ?? [];
      list.push(t.user_id as string);
      tutorsOf.set(t.pet_id as string, list);
    }
    // Tudo no "relógio de Brasília" a partir daqui (ver BRASILIA_OFFSET_MIN)
    const shift = shiftMs();
    const real = now;
    const wallNow = new Date(real.getTime() - shift);
    const cares = (caresRes.data ?? []).map(careFromRow).map((c) => ({
      ...c,
      nextAt: toWall(c.nextAt, shift),
      createdAt: toWall(c.createdAt, shift) ?? undefined,
    }));
    const records = (recsRes.data ?? []).map(recordFromRow).map((r) => ({
      ...r,
      occurrence: toWall(r.occurrence, shift)!,
      doneAt: toWall(r.doneAt, shift),
      snoozedTo: toWall(r.snoozedTo, shift),
      createdAt: toWall(r.createdAt, shift)!,
    }));

    type Job = { occ: Occurrence; tipo: "hora" | "antes"; momento: Date };
    const jobs: Job[] = [];
    const open = (o: Occurrence) => o.state === "pendente" || o.state === "atrasada";

    // Na hora (janela larga para pegar tarefas adiadas, cuja hora nova é diferente da original)
    const w = wallNow.getTime();
    for (const o of occurrencesBetween(cares, records, new Date(w - 24 * 60 * MIN), new Date(w + AHEAD), wallNow)) {
      const t = o.due.getTime();
      if (open(o) && t > w - LOOKBACK && t <= w + AHEAD) jobs.push({ occ: o, tipo: "hora", momento: o.due });
    }
    // Antes (consultas com "lembrar 1 dia / 2 horas antes")
    const withNotice = cares.filter((c) => c.notifyBeforeMin);
    for (const o of occurrencesBetween(withNotice, records, wallNow, new Date(w + 8 * 24 * 60 * MIN), wallNow)) {
      const m = new Date(o.due.getTime() - (o.care.notifyBeforeMin ?? 0) * MIN);
      if (open(o) && m.getTime() > w - LOOKBACK && m.getTime() <= w + AHEAD) jobs.push({ occ: o, tipo: "antes", momento: m });
    }

    let enviados = 0;
    for (const j of jobs) {
      // Marca antes de mandar: se já existe, outro disparo já avisou
      const ins = await db.from("notificacoes_enviadas").insert({
        cuidado_id: j.occ.care.id,
        ocorrencia: fromWall(new Date(j.occ.key), shift).toISOString(),
        tipo: j.tipo,
        momento: fromWall(j.momento, shift).toISOString(),
      });
      if (ins.error) {
        if (ins.error.code === "23505") continue;
        throw ins.error;
      }
      const c = j.occ.care;
      const pet = petName.get(c.petId) ?? "Seu pet";
      const at = hourText(fromWall(j.occ.due, shift));
      let body: string;
      if (j.tipo === "antes" && c.type === "coleira") {
        const days = Math.round((c.notifyBeforeMin ?? 0) / 1440);
        body = `Troca da coleira em ${days} ${days === 1 ? "dia" : "dias"}.`;
      } else if (j.tipo === "antes") {
        const daysAhead = (c.notifyBeforeMin ?? 0) >= 1440;
        body = `${daysAhead ? "Amanhã" : "Hoje"} às ${at}${c.detail ? ` · ${c.detail}` : ""}`;
      } else if (c.type === "coleira") {
        body = "Dia de trocar a coleira. Toque para marcar como trocada.";
      } else if (c.type === "remedio") {
        body = `Hora do remédio${c.detail ? ` (${c.detail})` : ""}. Toque para marcar como feito.`;
      } else if (c.type === "consulta") {
        body = `Agora, às ${at}${c.detail ? ` · ${c.detail}` : ""}`;
      } else {
        body = `É hoje${c.detail ? ` (${c.detail})` : ""}. Toque para marcar como feito.`;
      }
      enviados += await sendToUsers(tutorsOf.get(c.petId) ?? [], {
        title: `${c.title} · ${pet}`,
        body,
        url: "/",
        tag: `${c.id}-${j.tipo}`,
      });
    }

    return Response.json({ ok: true, tarefas: jobs.length, enviados });
  } catch (e) {
    const msg = e instanceof Error ? e.message : (e as { message?: string }).message ?? String(e);
    return Response.json({ ok: false, error: msg }, { status: 500 });
  }
}
