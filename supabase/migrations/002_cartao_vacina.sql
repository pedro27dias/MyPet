-- MyPet: Cartão de Vacina (rodar UMA vez no SQL Editor do Supabase, depois do 001).
-- Cada aplicação registrada pode guardar onde foi feita e uma foto da etiqueta/lote.

alter table public.registros add column if not exists clinica text;
alter table public.registros add column if not exists lote_foto text;  -- caminho no Storage (fotos-pets/<pet>/...)
