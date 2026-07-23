-- Batalha de Guarda-Redes · escalões, grupos e guarda-redes inscritos.

insert into public.categories
  (slug, name, short_label, sort_order, campo, baliza_count, group_count, legs, knockout, birth_year_min, birth_year_max)
values
  ('2017-19', '2017/18/19', '17→19', 1, 1, 1, 2, 1, 'semis', 2017, 2019),
  ('2015-16', '2015/16',    '15/16', 2, 2, 1, 2, 1, 'semis', 2015, 2016),
  ('2013-14', '2013/14',    '13/14', 3, 3, 1, 2, 1, 'semis', 2013, 2014),
  ('2011-12', '2011/12',    '11/12', 4, 4, 1, 2, 1, 'semis', 2011, 2012),
  ('2009-10', '2009/10',    '09/10', 5, 5, 1, 1, 2, 'none',  2009, 2010);

-- Grupos: dois (A/B) onde o formato os pede, um só ("Única") na poule de
-- campeonato.
insert into public.groups (category_id, name)
select c.id, g.name
from public.categories c
cross join lateral (
  select unnest(case when c.group_count = 2 then array['A', 'B'] else array['Única'] end) as name
) g;

-- Guarda-redes: entram no escalão pelo ano, ficam numerados pela ordem de
-- inscrição, e são repartidos pelos grupos (ímpares no A, pares no B; ou todos
-- na poule única).
with entrada as (
  select ord, name, year::smallint as year,
         public.category_for_year(year::smallint) as category_id
  from (values
    -- Escalão 2017/18/19
    (1,  'João Macedo Serra', 2019),
    (2,  'Martim Dinis',      2019),
    (3,  'Diogo Pinto',       2018),
    (4,  'João Bonifácio',    2018),
    (5,  'Afonso Monteiro',   2018),
    (6,  'Guilherme Costa',   2018),
    (7,  'Vicente Mimoso',    2018),
    (8,  'Rafael Luz',        2017),
    (9,  'Santiago Gomes',    2017),

    -- Escalão 2015/16 · campeonato
    (10, 'Simão Ribeiro',      2016),
    (11, 'Lourenço Silva',     2016),
    (12, 'Guilherme Oliveira', 2016),
    (13, 'Jaime Pedro',        2016),
    (14, 'Guilherme Rafael',   2016),
    (15, 'Mariana Pimentel',   2015),
    (16, 'Diogo Santos',       2015),
    (17, 'Santiago Sousa',     2015),
    (18, 'Martim Singéis',     2015),
    (19, 'Duarte Marques',     2015),
    (20, 'Dinis António',      2015),
    (21, 'Santiago Alcobaça',  2015),
    (22, 'João Graça',         2015),
    (23, 'Daniel Ruivo',       2015),
    (24, 'Francisco Carvalho', 2015),
    (25, 'Francisco Conde',    2015),
    (26, 'Lorena Santos',      2015),
    (27, 'Martim Catarino',    2015),
    (28, 'Diogo Ferreira',     2015),

    -- Escalão 2013/14
    (29, 'Tiago Cunha',       2014),
    (30, 'Tiago Carvalho',    2014),
    (31, 'Gonçalo Rodrigues', 2014),
    (32, 'Gustavo Silva',     2014),
    (33, 'António Valente',   2014),
    (34, 'Gabriel Flora',     2014),
    (35, 'Salvador Luz',      2013),
    (36, 'Afonso Lourenço',   2013),
    (37, 'Tiago Peixinho',    2013),

    -- Escalões 2011/12 e 2009/10
    (38, 'Filipa Marques',     2012),
    (39, 'Francisco Oliveira', 2012),
    (40, 'Rui Diniz',          2012),
    (41, 'Afonso Carvalho',    2012),
    (42, 'Ricardo Alves',      2012),
    (43, 'António Graça',      2012),
    (44, 'Bernardo Calças',    2011),
    (45, 'Afonso Martins',     2011),
    (46, 'Rodrigo Inácio',     2011),
    (47, 'João Gameiro',       2011),
    (48, 'Leandro Flora',      2011),
    (49, 'Afonso Ferreira',    2011),
    (50, 'Edgar Conde',        2010),
    (51, 'Rafael Nava',        2009),
    (52, 'Rafael Rodrigues',   2009)
  ) as v(ord, name, year)
),
numerada as (
  select *, row_number() over (partition by category_id order by ord) as seed
  from entrada
)
insert into public.participants (category_id, name, birth_year, seed, group_id)
select
  n.category_id, n.name, n.year, n.seed,
  g.id
from numerada n
join public.categories c on c.id = n.category_id
join public.groups g on g.category_id = c.id and g.name = case
  when c.group_count = 2 then case when n.seed % 2 = 1 then 'A' else 'B' end
  else 'Única'
end;
