-- MyPet: banho e tosa, prontuário com anexos, gastos novos, plano de saúde e central de emergência.
-- Rodar UMA vez no SQL Editor do Supabase, depois do 006.

-- Banho e tosa = tipo de cuidado "banho" (com telefone do local e valor)
alter table public.cuidados drop constraint if exists cuidados_tipo_check;
alter table public.cuidados add constraint cuidados_tipo_check
  check (tipo in ('remedio', 'vacina', 'vermifugo', 'antipulgas', 'coleira', 'banho', 'consulta', 'exame', 'outro'));
alter table public.cuidados
  add column if not exists telefone text,
  add column if not exists valor numeric(10, 2);

-- Gastos: categorias novas (e as criadas pelos tutores, "c:Nome") + foto do recibo
alter table public.gastos drop constraint if exists gastos_categoria_check;
alter table public.gastos add constraint gastos_categoria_check
  check (categoria in ('racao', 'petiscos', 'vet', 'exames', 'remedio', 'vacinas', 'antipulgas', 'banho', 'plano', 'acessorios', 'outros')
         or categoria like 'c:%');
alter table public.gastos add column if not exists recibo text;

-- No pet: categorias de gasto criadas, plano de saúde e contatos de emergência (todos os tutores veem)
alter table public.pets
  add column if not exists categorias_gasto text[],
  add column if not exists plano jsonb,
  add column if not exists emergencia jsonb;

-- Prontuário: registros clínicos com anexos (fotos e PDFs no Storage "fotos-pets/<pet>/prontuario/...")
create table if not exists public.prontuario (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets on delete cascade,
  tipo text not null check (tipo in ('consulta', 'exame', 'teste', 'cirurgia', 'diagnostico', 'receita')),
  data date not null default current_date,
  titulo text not null,
  clinica text,
  resumo text,
  tags text[],
  anexos jsonb not null default '[]',     -- [{ "path": "...", "nome": "...", "tipo": "image/jpeg" }]
  valor numeric(10, 2),
  criado_por uuid references auth.users default auth.uid(),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists prontuario_pet_idx on public.prontuario (pet_id, data);

alter table public.prontuario enable row level security;
create policy "tutores veem prontuario" on public.prontuario for select using (public.eh_tutor(pet_id));
create policy "tutores registram prontuario" on public.prontuario for insert with check (public.eh_tutor(pet_id));
create policy "tutores corrigem prontuario" on public.prontuario for update
  using (public.eh_tutor(pet_id)) with check (public.eh_tutor(pet_id));
create policy "tutores apagam prontuario" on public.prontuario for delete using (public.eh_tutor(pet_id));

alter table public.prontuario replica identity full;
alter publication supabase_realtime add table public.prontuario;

-- Tutores podem apagar anexos do próprio pet
drop policy if exists "tutores apagam fotos" on storage.objects;
create policy "tutores apagam fotos" on storage.objects for delete
  using (bucket_id = 'fotos-pets' and public.eh_tutor(public.pasta_do_pet(name)));
