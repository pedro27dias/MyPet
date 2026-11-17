-- MyPet: Notificações (rodar UMA vez no SQL Editor do Supabase, depois do 003).
-- ⚠️ Antes de rodar, troque COLE-AQUI-O-CRON_SECRET (lá embaixo) pelo mesmo valor de CRON_SECRET da Vercel.

-- Inscrição do celular: um aparelho pertence a uma pessoa. Se outra pessoa entrar no mesmo
-- celular, a inscrição passa para ela (a função faz isso sem esbarrar nas regras de acesso).
create or replace function public.salvar_inscricao(p_endpoint text, p_chaves jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Entre na sua conta para ativar as notificações.'; end if;
  delete from notificacoes_inscricoes where endpoint = p_endpoint;
  insert into notificacoes_inscricoes (user_id, endpoint, chaves) values (auth.uid(), p_endpoint, p_chaves);
end $$;

-- O que já foi avisado (para não mandar o mesmo lembrete duas vezes).
-- Só o servidor (chave secreta) mexe aqui: sem regras de acesso = ninguém de fora vê.
create table if not exists public.notificacoes_enviadas (
  cuidado_id uuid not null references public.cuidados on delete cascade,
  ocorrencia timestamptz not null,
  tipo text not null,           -- 'hora' (na hora) | 'antes' (consulta, com antecedência)
  momento timestamptz not null, -- quando era para avisar (muda se a tarefa foi adiada)
  enviado_em timestamptz not null default now(),
  primary key (cuidado_id, ocorrencia, tipo, momento)
);
alter table public.notificacoes_enviadas enable row level security;

-- Agenda: a cada 5 minutos o próprio Supabase chama o site, que manda o que chegou na hora.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

select cron.unschedule('mypet-notificacoes') where exists (select 1 from cron.job where jobname = 'mypet-notificacoes');
select cron.schedule(
  'mypet-notificacoes',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://my-pet-orcin.vercel.app/api/notificacoes/enviar',
    headers := jsonb_build_object('Authorization', 'Bearer COLE-AQUI-O-CRON_SECRET', 'Content-Type', 'application/json'),
    body := '{}'::jsonb,
    timeout_milliseconds := 20000
  );
  $$
);
