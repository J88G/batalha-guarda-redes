-- Empréstimo de campos.
--
-- Cada escalão tem um campo, com uma baliza. Como os escalões têm tamanhos
-- muito diferentes, uns acabam cedo e o campo fica parado enquanto outro se
-- arrasta. A mesa pode então emprestar um campo livre ao escalão mais atrasado,
-- para os jogos correrem em dois campos ao mesmo tempo e o dia acabar mais cedo.
--
-- Só se empresta entre balizas do mesmo tamanho: a de futebol 5 é dos mais
-- novos, e um jogo de futebol 7 não cabe lá.

-- O tamanho da baliza de cada escalão (5 ou 7).
alter table public.categories
  add column if not exists baliza_size smallint not null default 7;

-- O escalão mais novo joga em balizas de futebol 5; os restantes, futebol 7.
update public.categories set baliza_size = 5 where slug = '2017-19';

-- Onde o jogo é mesmo jogado. Nulo = o campo do próprio escalão; preenchido =
-- um campo emprestado.
alter table public.matches
  add column if not exists campo smallint;
