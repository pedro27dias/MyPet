-- MyPet: Gastos (rodar UMA vez no SQL Editor do Supabase, depois do 002).
-- Cada gasto é de um cachorro; todos os tutores dele veem, lançam, corrigem e apagam.

create table if not exists public.gastos (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets on delete cascade,
  valor numeric(10, 2) not null check (valor > 0),
  categoria text not null check (categoria in ('racao', 'vet', 'remedio', 'banho', 'outros')),
  data date not null default current_date,
  pago_por uuid references auth.users,           -- quem pagou (um dos tutores)
  descricao text,
  criado_por uuid references auth.users default auth.uid(),
  criado_em timestamptz not null default now()
);
create index if not exists gastos_pet_data_idx on public.gastos (pet_id, data);

alter table public.gastos enable row level security;

create policy "tutores veem gastos" on public.gastos for select using (public.eh_tutor(pet_id));
create policy "tutores lancam gastos" on public.gastos for insert with check (public.eh_tutor(pet_id));
create policy "tutores corrigem gastos" on public.gastos for update
  using (public.eh_tutor(pet_id)) with check (public.eh_tutor(pet_id));
create policy "tutores apagam gastos" on public.gastos for delete using (public.eh_tutor(pet_id));

-- Para o gasto lançado por um tutor aparecer na hora para o outro.
alter table public.gastos replica identity full;
alter publication supabase_realtime add table public.gastos;
