-- Permite três grupos por escalão.
--
-- Nos escalões grandes, dois grupos dão jogos a mais (um todos-contra-todos de
-- 10 são 45 jogos). Com três grupos são muito menos, e apuram os 3 vencedores
-- mais o melhor 2º lugar às meias-finais.

alter table public.categories drop constraint if exists categories_group_count_check;
alter table public.categories
  add constraint categories_group_count_check check (group_count between 1 and 3);
