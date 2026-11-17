// Mantém o Supabase gratuito acordado: ele pausa o projeto depois de 7 dias sem uso.
// A Vercel chama este endereço uma vez por dia (agenda em vercel.json) e ele faz uma leitura pequena no banco.
// Sem login, a leitura volta vazia (RLS): não expõe nada, mas conta como uso.
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  // Se CRON_SECRET estiver configurado na Vercel, só a própria Vercel consegue chamar.
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ ok: false, error: "Sem permissão." }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return Response.json({ ok: false, error: "Supabase não configurado." }, { status: 500 });

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { error } = await supabase.from("pets").select("id").limit(1);

  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
  return Response.json({ ok: true, em: new Date().toISOString() });
}
