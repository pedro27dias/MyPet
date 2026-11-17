-- MyPet: suporte a GATOS (rodar UMA vez no SQL Editor do Supabase, depois do 004).
-- Espécie do pet + dados próprios de gato, tipo de cuidado "exame" (teste FeLV/FIV no cartão)
-- e o resultado do exame no registro.

alter table public.pets
  add column if not exists especie text not null default 'cachorro' check (especie in ('cachorro', 'gato')),
  add column if not exists estilo_vida text check (estilo_vida in ('dentro', 'as_vezes', 'sempre')),
  add column if not exists outros_animais text[],
  add column if not exists teste_felv_fiv text check (teste_felv_fiv in ('negativo', 'positivo', 'nao_fez', 'nao_sei')),
  add column if not exists racao_tipo text check (racao_tipo in ('seca', 'umida', 'mista'));

alter table public.cuidados drop constraint if exists cuidados_tipo_check;
alter table public.cuidados add constraint cuidados_tipo_check
  check (tipo in ('remedio', 'vacina', 'vermifugo', 'antipulgas', 'consulta', 'exame', 'outro'));

alter table public.registros add column if not exists resultado text;

-- Cria o pet (cachorro ou gato) + quem criou vira tutor principal + cuidados e históricos do cadastro.
create or replace function public.criar_pet(p jsonb, p_cuidados jsonb default '[]', p_registros jsonb default '[]')
returns uuid language plpgsql security definer set search_path = public as $$
declare
  novo uuid := coalesce(nullif(p->>'id', '')::uuid, gen_random_uuid());
begin
  if auth.uid() is null then raise exception 'Entre na sua conta para continuar.'; end if;
  if coalesce(trim(p->>'nome'), '') = '' then raise exception 'Falta o nome do pet.'; end if;

  insert into pets (id, especie, nome, raca, sexo, nascimento, nascimento_aprox, porte, origem, castrado,
                    doencas, alergias, racao_marca, racao_qtd, racao_tipo, vet_nome, vet_telefone,
                    estilo_vida, outros_animais, teste_felv_fiv, criado_por)
  select novo, coalesce(r.especie, 'cachorro'), trim(r.nome), r.raca, r.sexo, r.nascimento,
         coalesce(r.nascimento_aprox, false), r.porte, r.origem, r.castrado, r.doencas, r.alergias,
         r.racao_marca, r.racao_qtd, r.racao_tipo, r.vet_nome, r.vet_telefone,
         r.estilo_vida, r.outros_animais, r.teste_felv_fiv, auth.uid()
  from jsonb_populate_record(null::pets, p) r;

  insert into tutores (pet_id, user_id, papel) values (novo, auth.uid(), 'principal');

  insert into cuidados (id, pet_id, tipo, titulo, detalhe, observacao, freq, intervalo, horarios,
                        inicio, fim, proxima_em, antecedencia_min, ativo, criado_por)
  select coalesce(c.id, gen_random_uuid()), novo, c.tipo, c.titulo, c.detalhe, c.observacao,
         coalesce(c.freq, 'unica'), coalesce(c.intervalo, 1), coalesce(c.horarios, '{09:00}'),
         coalesce(c.inicio, current_date), c.fim, c.proxima_em, c.antecedencia_min,
         coalesce(c.ativo, true), auth.uid()
  from jsonb_populate_recordset(null::cuidados, p_cuidados) c;

  insert into registros (cuidado_id, pet_id, ocorrencia, status, feito_em, motivo, resultado, por)
  select r.cuidado_id, novo, r.ocorrencia, 'feito', coalesce(r.feito_em, r.ocorrencia), r.motivo, r.resultado, auth.uid()
  from jsonb_populate_recordset(null::registros, p_registros) r
  where exists (select 1 from cuidados c where c.id = r.cuidado_id and c.pet_id = novo);

  return novo;
end $$;
