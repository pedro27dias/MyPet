-- MyPet: coleira (cães e gatos) + histórico com observação e "editado por"
-- Rodar UMA vez no SQL Editor do Supabase, depois do 005.

-- Tipo de cuidado "coleira"
alter table public.cuidados drop constraint if exists cuidados_tipo_check;
alter table public.cuidados add constraint cuidados_tipo_check
  check (tipo in ('remedio', 'vacina', 'vermifugo', 'antipulgas', 'coleira', 'consulta', 'exame', 'outro'));

-- Coleira: contra o quê protege (leish, pulgas, carrapatos), foto da embalagem e idade mínima da marca
alter table public.cuidados
  add column if not exists protege text[],
  add column if not exists foto text,
  add column if not exists idade_min_semanas int;

-- Histórico: observação do registro e quem editou por último
alter table public.registros
  add column if not exists observacao text,
  add column if not exists editado_por uuid references auth.users,
  add column if not exists editado_em timestamptz;

-- criar_pet: igual ao 005, agora guardando também a proteção da coleira do cadastro
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
                        inicio, fim, proxima_em, antecedencia_min, ativo, protege, idade_min_semanas, criado_por)
  select coalesce(c.id, gen_random_uuid()), novo, c.tipo, c.titulo, c.detalhe, c.observacao,
         coalesce(c.freq, 'unica'), coalesce(c.intervalo, 1), coalesce(c.horarios, '{09:00}'),
         coalesce(c.inicio, current_date), c.fim, c.proxima_em, c.antecedencia_min,
         coalesce(c.ativo, true), c.protege, c.idade_min_semanas, auth.uid()
  from jsonb_populate_recordset(null::cuidados, p_cuidados) c;

  insert into registros (cuidado_id, pet_id, ocorrencia, status, feito_em, motivo, resultado, por)
  select r.cuidado_id, novo, r.ocorrencia, 'feito', coalesce(r.feito_em, r.ocorrencia), r.motivo, r.resultado, auth.uid()
  from jsonb_populate_recordset(null::registros, p_registros) r
  where exists (select 1 from cuidados c where c.id = r.cuidado_id and c.pet_id = novo);

  return novo;
end $$;
