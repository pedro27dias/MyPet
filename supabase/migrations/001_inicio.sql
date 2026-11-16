-- MyPet: estrutura inicial (rodar UMA vez no SQL Editor do Supabase).
-- Tabelas em português. Cada cachorro (pets) pode ter vários tutores; todo mundo que é tutor
-- do cachorro vê e mexe nos cuidados dele. Ninguém vê cachorro de outra família (RLS).

-- ---------------------------------------------------------------------------------------------
-- Perfis (nome de quem usa o app; criado sozinho no cadastro)
-- ---------------------------------------------------------------------------------------------
create table public.perfis (
  id uuid primary key references auth.users on delete cascade,
  nome text not null default '',
  criado_em timestamptz not null default now()
);

create function public.criar_perfil() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfis (id, nome)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data->>'nome', ''),
      nullif(new.raw_user_meta_data->>'full_name', ''),
      nullif(new.raw_user_meta_data->>'name', ''),
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger ao_criar_usuario after insert on auth.users
for each row execute function public.criar_perfil();

-- ---------------------------------------------------------------------------------------------
-- Cachorros e tutores
-- ---------------------------------------------------------------------------------------------
create table public.pets (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  foto text,                      -- caminho no Storage (fotos-pets/<pet>/...)
  raca text,
  sexo text check (sexo in ('macho', 'femea')),
  nascimento date,
  nascimento_aprox boolean not null default false,  -- true = calculado pela idade aproximada
  porte text check (porte in ('pequeno', 'medio', 'grande', 'gigante')),
  origem text check (origem in ('adotado', 'resgatado', 'comprado', 'presente', 'outro')),
  castrado boolean,
  doencas text,                   -- vazio = não tem / não respondeu
  alergias text,
  racao_marca text,
  racao_qtd text,
  vet_nome text,
  vet_telefone text,
  criado_por uuid references auth.users default auth.uid(),
  criado_em timestamptz not null default now()
);

create table public.tutores (
  pet_id uuid not null references public.pets on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  papel text not null default 'tutor' check (papel in ('principal', 'tutor')),
  criado_em timestamptz not null default now(),
  primary key (pet_id, user_id)
);
create index tutores_user_idx on public.tutores (user_id);

-- "Essa pessoa é tutora deste cachorro?" (usada em todas as regras de acesso)
create function public.eh_tutor(p_pet uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.tutores where pet_id = p_pet and user_id = auth.uid());
$$;

create table public.convites (
  codigo text primary key,
  pet_id uuid not null references public.pets on delete cascade,
  criado_por uuid not null references auth.users default auth.uid(),
  criado_em timestamptz not null default now(),
  expira_em timestamptz not null default now() + interval '7 days',
  usado_por uuid references auth.users,
  usado_em timestamptz
);

-- ---------------------------------------------------------------------------------------------
-- Cuidados (lembretes) e registros (o que foi feito, pulado ou adiado)
-- ---------------------------------------------------------------------------------------------
-- Frequência:
--   unica           = uma vez só, na data de "proxima_em"
--   horas/diaria/semanal/dias = horários FIXOS a partir de "inicio" (remédios). Cada horário é
--                     uma "ocorrência"; feito ou não, a próxima é o próximo horário da regra.
--   meses/anos      = conta a partir da última vez FEITA (vacina, vermífugo, antipulgas).
--                     "proxima_em" guarda a próxima data (editável pelo tutor).
create table public.cuidados (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets on delete cascade,
  tipo text not null check (tipo in ('remedio', 'vacina', 'vermifugo', 'antipulgas', 'consulta', 'outro')),
  titulo text not null,
  detalhe text,                   -- dose, produto, local...
  observacao text,
  freq text not null default 'unica'
    check (freq in ('unica', 'horas', 'diaria', 'semanal', 'dias', 'meses', 'anos')),
  intervalo int not null default 1 check (intervalo between 1 and 365),
  horarios text[] not null default '{09:00}',
  inicio date not null default current_date,
  fim date,
  proxima_em timestamptz,         -- só para unica / meses / anos
  antecedencia_min int,           -- aviso antes (consultas): 1440 = 1 dia, 120 = 2 h
  ativo boolean not null default true,
  criado_por uuid references auth.users default auth.uid(),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index cuidados_pet_idx on public.cuidados (pet_id);

create table public.registros (
  id uuid primary key default gen_random_uuid(),
  cuidado_id uuid not null references public.cuidados on delete cascade,
  pet_id uuid not null references public.pets on delete cascade,
  ocorrencia timestamptz not null,   -- qual horário/data da regra este registro resolve
  status text not null check (status in ('feito', 'pulado', 'adiado')),
  feito_em timestamptz,              -- hora em que foi feito (editável: "dei às 7h40")
  adiado_para timestamptz,
  motivo text,
  por uuid references auth.users default auth.uid(),
  criado_em timestamptz not null default now()
);
create index registros_cuidado_idx on public.registros (cuidado_id, ocorrencia);
create index registros_pet_idx on public.registros (pet_id, ocorrencia);

-- Para o "Feito" aparecer na hora no celular dos outros tutores.
alter table public.registros replica identity full;
alter table public.cuidados replica identity full;
alter publication supabase_realtime add table public.registros, public.cuidados;

-- Para as notificações (próxima etapa).
create table public.notificacoes_inscricoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  endpoint text not null unique,
  chaves jsonb not null,
  criado_em timestamptz not null default now()
);

-- ---------------------------------------------------------------------------------------------
-- Regras de acesso (RLS)
-- ---------------------------------------------------------------------------------------------
alter table public.perfis enable row level security;
alter table public.pets enable row level security;
alter table public.tutores enable row level security;
alter table public.convites enable row level security;
alter table public.cuidados enable row level security;
alter table public.registros enable row level security;
alter table public.notificacoes_inscricoes enable row level security;

-- Perfis: o próprio e os de quem cuida do mesmo cachorro.
create policy "ver perfis da familia" on public.perfis for select using (
  id = auth.uid() or exists (
    select 1 from public.tutores a join public.tutores b on a.pet_id = b.pet_id
    where a.user_id = auth.uid() and b.user_id = perfis.id
  )
);
create policy "editar o proprio perfil" on public.perfis for update
  using (id = auth.uid()) with check (id = auth.uid());

-- Pets: cria-se pela função criar_pet; tutores veem e editam.
create policy "tutores veem o pet" on public.pets for select using (public.eh_tutor(id));
create policy "tutores editam o pet" on public.pets for update
  using (public.eh_tutor(id)) with check (public.eh_tutor(id));

create policy "tutores veem os tutores" on public.tutores for select using (public.eh_tutor(pet_id));

create policy "tutores veem convites" on public.convites for select using (public.eh_tutor(pet_id));

create policy "tutores veem cuidados" on public.cuidados for select using (public.eh_tutor(pet_id));
create policy "tutores criam cuidados" on public.cuidados for insert
  with check (public.eh_tutor(pet_id));
create policy "tutores editam cuidados" on public.cuidados for update
  using (public.eh_tutor(pet_id)) with check (public.eh_tutor(pet_id));

create policy "tutores veem registros" on public.registros for select using (public.eh_tutor(pet_id));
create policy "tutores registram" on public.registros for insert
  with check (public.eh_tutor(pet_id) and por = auth.uid()
    and exists (select 1 from public.cuidados c where c.id = cuidado_id and c.pet_id = registros.pet_id));
create policy "tutores corrigem registros" on public.registros for update
  using (public.eh_tutor(pet_id)) with check (public.eh_tutor(pet_id));

create policy "inscricoes proprias" on public.notificacoes_inscricoes for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------------------------
-- Funções (fazem várias coisas de uma vez, sem deixar nada pela metade)
-- ---------------------------------------------------------------------------------------------

-- Cria o cachorro + quem criou vira tutor principal + cuidados e históricos da anamnese.
create function public.criar_pet(p jsonb, p_cuidados jsonb default '[]', p_registros jsonb default '[]')
returns uuid language plpgsql security definer set search_path = public as $$
declare
  novo uuid := coalesce(nullif(p->>'id', '')::uuid, gen_random_uuid());
begin
  if auth.uid() is null then raise exception 'Entre na sua conta para continuar.'; end if;
  if coalesce(trim(p->>'nome'), '') = '' then raise exception 'Falta o nome do cachorro.'; end if;

  insert into pets (id, nome, raca, sexo, nascimento, nascimento_aprox, porte, origem, castrado,
                    doencas, alergias, racao_marca, racao_qtd, vet_nome, vet_telefone, criado_por)
  select novo, trim(r.nome), r.raca, r.sexo, r.nascimento, coalesce(r.nascimento_aprox, false),
         r.porte, r.origem, r.castrado, r.doencas, r.alergias, r.racao_marca, r.racao_qtd,
         r.vet_nome, r.vet_telefone, auth.uid()
  from jsonb_populate_record(null::pets, p) r;

  insert into tutores (pet_id, user_id, papel) values (novo, auth.uid(), 'principal');

  insert into cuidados (id, pet_id, tipo, titulo, detalhe, observacao, freq, intervalo, horarios,
                        inicio, fim, proxima_em, antecedencia_min, criado_por)
  select coalesce(c.id, gen_random_uuid()), novo, c.tipo, c.titulo, c.detalhe, c.observacao,
         coalesce(c.freq, 'unica'), coalesce(c.intervalo, 1), coalesce(c.horarios, '{09:00}'),
         coalesce(c.inicio, current_date), c.fim, c.proxima_em, c.antecedencia_min, auth.uid()
  from jsonb_populate_recordset(null::cuidados, p_cuidados) c;

  insert into registros (cuidado_id, pet_id, ocorrencia, status, feito_em, motivo, por)
  select r.cuidado_id, novo, r.ocorrencia, 'feito', coalesce(r.feito_em, r.ocorrencia), r.motivo, auth.uid()
  from jsonb_populate_recordset(null::registros, p_registros) r
  where exists (select 1 from cuidados c where c.id = r.cuidado_id and c.pet_id = novo);

  return novo;
end $$;

-- Marca como feito (ou pulado). Se outro tutor já resolveu este mesmo horário, NÃO registra:
-- devolve quem fez e quando, para o app perguntar antes (p_forcar = true registra mesmo assim).
-- p_proxima = próxima data calculada pelo app (só para meses/anos/unica).
create function public.concluir_cuidado(
  p_cuidado uuid, p_ocorrencia timestamptz, p_status text default 'feito',
  p_feito_em timestamptz default null, p_motivo text default null,
  p_proxima timestamptz default null, p_forcar boolean default false
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  c cuidados;
  ja registros;
  novo registros;
begin
  select * into c from cuidados where id = p_cuidado for update;
  if not found or not eh_tutor(c.pet_id) then raise exception 'Cuidado não encontrado.'; end if;
  if p_status not in ('feito', 'pulado') then raise exception 'Situação inválida.'; end if;

  select * into ja from registros
  where cuidado_id = p_cuidado and ocorrencia = p_ocorrencia and status in ('feito', 'pulado')
  order by criado_em desc limit 1;

  if found and not p_forcar then
    return jsonb_build_object(
      'ok', false, 'status', ja.status, 'por', ja.por,
      'por_nome', (select nome from perfis where id = ja.por),
      'feito_em', coalesce(ja.feito_em, ja.criado_em)
    );
  end if;

  insert into registros (cuidado_id, pet_id, ocorrencia, status, feito_em, motivo, por)
  values (p_cuidado, c.pet_id, p_ocorrencia, p_status,
          case when p_status = 'feito' then coalesce(p_feito_em, now()) end, p_motivo, auth.uid())
  returning * into novo;

  -- Contados a partir da última vez: a próxima data anda (só se este era o pendente).
  if c.freq in ('meses', 'anos') and p_proxima is not null
     and c.proxima_em is not distinct from p_ocorrencia then
    update cuidados set proxima_em = p_proxima, atualizado_em = now() where id = c.id;
  end if;

  return jsonb_build_object('ok', true, 'registro', to_jsonb(novo));
end $$;

-- Desfazer um "Feito"/"Pulado": apaga o registro e devolve a data pendente.
create function public.desfazer_registro(p_registro uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  r registros;
  c cuidados;
begin
  select * into r from registros where id = p_registro;
  if not found or not eh_tutor(r.pet_id) then raise exception 'Registro não encontrado.'; end if;
  select * into c from cuidados where id = r.cuidado_id for update;
  delete from registros where id = p_registro;
  if c.freq in ('meses', 'anos') and r.status in ('feito', 'pulado') and not exists (
    select 1 from registros where cuidado_id = c.id and ocorrencia = r.ocorrencia and status in ('feito', 'pulado')
  ) and (c.proxima_em is null or c.proxima_em > r.ocorrencia) then
    update cuidados set proxima_em = r.ocorrencia, atualizado_em = now() where id = c.id;
  end if;
end $$;

-- Convite: só o tutor principal cria. Código de 6 letras/números, vale 7 dias, uso único.
create function public.criar_convite(p_pet uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  cod text;
begin
  if not exists (select 1 from tutores where pet_id = p_pet and user_id = auth.uid() and papel = 'principal') then
    raise exception 'Só o tutor principal pode convidar.';
  end if;
  loop
    -- letras/números sem 0 e 1 (não confundem com O e I)
    cod := upper(substr(translate(md5(random()::text || clock_timestamp()::text), '01', ''), 1, 6));
    exit when length(cod) = 6 and not exists (select 1 from convites where codigo = cod);
  end loop;
  insert into convites (codigo, pet_id) values (cod, p_pet);
  return cod;
end $$;

create function public.aceitar_convite(p_codigo text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  cv convites;
begin
  if auth.uid() is null then raise exception 'Entre na sua conta para aceitar o convite.'; end if;
  select * into cv from convites where codigo = upper(trim(p_codigo)) for update;
  if not found then raise exception 'Código não encontrado. Confira as letras.'; end if;
  if exists (select 1 from tutores where pet_id = cv.pet_id and user_id = auth.uid()) then
    return cv.pet_id;  -- já é tutor
  end if;
  if cv.usado_por is not null then raise exception 'Este convite já foi usado. Peça um novo.'; end if;
  if cv.expira_em < now() then raise exception 'Este convite venceu. Peça um novo.'; end if;
  insert into tutores (pet_id, user_id, papel) values (cv.pet_id, auth.uid(), 'tutor');
  update convites set usado_por = auth.uid(), usado_em = now() where codigo = cv.codigo;
  return cv.pet_id;
end $$;

-- Nome do cachorro de um convite (para a tela "Você foi convidado para cuidar da Mel").
create function public.ver_convite(p_codigo text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('pet', p.nome, 'de', pf.nome, 'valido', cv.usado_por is null and cv.expira_em > now())
  from convites cv join pets p on p.id = cv.pet_id left join perfis pf on pf.id = cv.criado_por
  where cv.codigo = upper(trim(p_codigo));
$$;

-- ---------------------------------------------------------------------------------------------
-- Fotos (Storage privado; pasta = id do cachorro; só tutores veem)
-- ---------------------------------------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('fotos-pets', 'fotos-pets', false)
on conflict (id) do nothing;

create function public.pasta_do_pet(nome text) returns uuid
language sql immutable as $$
  select case when (storage.foldername(nome))[1] ~ '^[0-9a-f-]{36}$'
              then ((storage.foldername(nome))[1])::uuid end;
$$;

create policy "tutores veem fotos" on storage.objects for select
  using (bucket_id = 'fotos-pets' and public.eh_tutor(public.pasta_do_pet(name)));
create policy "tutores enviam fotos" on storage.objects for insert
  with check (bucket_id = 'fotos-pets' and public.eh_tutor(public.pasta_do_pet(name)));
create policy "tutores trocam fotos" on storage.objects for update
  using (bucket_id = 'fotos-pets' and public.eh_tutor(public.pasta_do_pet(name)));
