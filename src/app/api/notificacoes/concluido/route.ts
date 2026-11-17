// "Feito por Ana às 8h05": quando um tutor conclui uma tarefa, o app chama este endereço
// e os OUTROS tutores do pet recebem o aviso (quem fez não recebe).

import { adminClient, hourText, sendToUsers } from "@/lib/server/notify";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) return Response.json({ ok: false, error: "Entre na sua conta." }, { status: 401 });
    const db = adminClient();

    // Quem está pedindo (pelo login do app)
    const { data: who, error: authError } = await db.auth.getUser(token);
    if (authError || !who.user) return Response.json({ ok: false, error: "Sessão inválida." }, { status: 401 });
    const me = who.user.id;

    const { registroId } = (await request.json()) as { registroId?: string };
    if (!registroId) return Response.json({ ok: false, error: "Falta o registro." }, { status: 400 });

    const { data: reg } = await db.from("registros").select("id, pet_id, cuidado_id, status, feito_em, por").eq("id", registroId).maybeSingle();
    // Só avisa de registro feito pela própria pessoa (ninguém dispara aviso em nome de outro)
    if (!reg || reg.status !== "feito" || reg.por !== me) return Response.json({ ok: true, enviados: 0 });

    const [tutores, cuidado, pet, perfil] = await Promise.all([
      db.from("tutores").select("user_id").eq("pet_id", reg.pet_id),
      db.from("cuidados").select("titulo").eq("id", reg.cuidado_id).maybeSingle(),
      db.from("pets").select("nome").eq("id", reg.pet_id).maybeSingle(),
      db.from("perfis").select("nome").eq("id", me).maybeSingle(),
    ]);
    const others = (tutores.data ?? []).map((t) => t.user_id as string).filter((id) => id !== me);
    if (!others.length) return Response.json({ ok: true, enviados: 0 });

    const enviados = await sendToUsers(others, {
      title: `${pet.data?.nome ?? "Pet"}: ${cuidado.data?.titulo ?? "tarefa"} ✓`,
      body: `Feito por ${perfil.data?.nome || "outro tutor"} às ${hourText(new Date(reg.feito_em ?? Date.now()))}.`,
      url: "/",
      tag: `feito-${reg.id}`,
    });
    return Response.json({ ok: true, enviados });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
