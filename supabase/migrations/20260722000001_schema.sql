-- Batalha de Guarda-Redes · RX Soccer Academy
--
-- Guarda-redes individuais, por escalão de ano de nascimento. Cada escalão joga
-- no seu campo, e o seu formato monta-se com três escolhas:
--
--   group_count — 1 (poule única) ou 2 grupos
--   knockout    — 'none' (decide a classificação), 'final' (só final) ou
--                 'semis' (meias-finais + final)
--   baliza_count — quantos jogos correm ao mesmo tempo no campo
--
-- Assim, um campeonato é 1 grupo + knockout 'none'; o formato do Penalty Cup é
-- 2 grupos + knockout 'semis'. Quem se apura à eliminatória sai destas escolhas:
-- com 2 grupos apuram os primeiros de cada (final) ou os dois primeiros de cada
-- (meias); com 1 grupo, os 2 primeiros (final) ou os 4 primeiros (meias).

drop table if exists public.matches cascade;
drop table if exists public.participants cascade;
drop table if exists public.groups cascade;
drop table if exists public.categories cascade;
drop table if exists public.settings cascade;
drop table if exists public.admins cascade;

-- Quem é da mesa ------------------------------------------------------
create table public.admins (
  user_id  uuid primary key references auth.users (id) on delete cascade,
  email    text,
  added_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- Escalões -------------------------------------------------------------
create table public.categories (
  id             smallserial primary key,
  slug           text     not null unique,   -- "2015-16"
  name           text     not null,          -- "2015/16"
  short_label    text     not null,          -- "15/16"
  sort_order     smallint not null,
  campo          smallint not null unique check (campo between 1 and 8),
  -- Quantos jogos correm ao mesmo tempo neste campo.
  baliza_count   smallint not null default 1 check (baliza_count between 1 and 12),
  -- O formato: quantos grupos, quantas voltas (cada par joga 1 ou 2 vezes), e
  -- que eliminatória em cima.
  group_count    smallint not null default 2 check (group_count between 1 and 2),
  legs           smallint not null default 1 check (legs between 1 and 2),
  knockout       text     not null default 'semis' check (knockout in ('none', 'final', 'semis')),
  birth_year_min smallint not null,
  birth_year_max smallint not null,
  check (birth_year_min <= birth_year_max)
);

-- Grupos. Só existem nos escalões com formato de grupos + eliminatórias.
create table public.groups (
  id          smallserial primary key,
  category_id smallint not null references public.categories (id) on delete cascade,
  name        text     not null,             -- "A" | "B"
  unique (category_id, name)
);

-- Guarda-redes ---------------------------------------------------------
create table public.participants (
  id             serial primary key,
  category_id    smallint not null references public.categories (id) on delete cascade,
  -- Só preenchido no formato de grupos; no campeonato é uma poule só.
  group_id       smallint references public.groups (id) on delete set null,
  name           text     not null,
  birth_year     smallint not null,
  seed           smallint,
  -- Só usado quando dois guarda-redes acabam empatados e nada os separa.
  tiebreak_order smallint,
  unique (category_id, name)
);

create index participants_category_idx on public.participants (category_id);
create index participants_group_idx on public.participants (group_id);

-- Descobre o escalão de um ano de nascimento.
create or replace function public.category_for_year(p_year smallint)
returns smallint
language sql
stable
as $$
  select id from public.categories
  where p_year between birth_year_min and birth_year_max
  order by sort_order
  limit 1;
$$;

-- Jogos ----------------------------------------------------------------
-- home_source/away_source guardam os lugares das eliminatórias até haver
-- resultados: 'group:<group_id>:<lugar>' ou 'winner:semi:<slot>'.
create table public.matches (
  id           serial primary key,
  category_id  smallint    not null references public.categories (id) on delete cascade,
  -- Todo o escalão tem jogos de grupo (a poule única é um grupo só); a
  -- eliminatória, quando existe, junta 'semi' e 'final' por cima.
  stage        text        not null check (stage in ('group', 'semi', 'final')),
  group_id     smallint    references public.groups (id) on delete cascade,
  round        smallint    not null,        -- jornada (a hora sai daqui)
  baliza       smallint    not null check (baliza between 1 and 12),
  slot         smallint,                    -- 1|2 nas duas meias-finais
  starts_at    timestamptz not null,
  home_participant_id int references public.participants (id) on delete cascade,
  away_participant_id int references public.participants (id) on delete cascade,
  home_source  text,
  away_source  text,
  started_at   timestamptz,
  winner_participant_id int references public.participants (id) on delete set null,
  home_score   smallint check (home_score >= 0),
  away_score   smallint check (away_score >= 0),
  updated_at   timestamptz not null default now(),

  constraint score_complete check ((home_score is null) = (away_score is null)),
  constraint no_draw check (home_score is null or home_score <> away_score),
  constraint winner_played check (
    winner_participant_id is null
    or winner_participant_id = home_participant_id
    or winner_participant_id = away_participant_id
  ),
  constraint winner_matches_score check (
    home_score is null
    or winner_participant_id is null
    or winner_participant_id = case when home_score > away_score
                                    then home_participant_id else away_participant_id end
  )
);

create index matches_category_idx on public.matches (category_id);
create index matches_round_idx on public.matches (round);
-- Num campo, uma baliza só tem um jogo de cada vez.
create unique index matches_campo_slot_idx on public.matches (category_id, baliza, round);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger matches_touch_updated_at
  before update on public.matches
  for each row execute function public.touch_updated_at();

-- Definições ------------------------------------------------------------
create table public.settings (
  id              smallint primary key default 1 check (id = 1),
  tournament_name text        not null default 'Batalha de Guarda-Redes',
  venue           text        not null default 'RX Soccer Academy',
  starts_at       timestamptz not null default '2026-07-18T16:30:00+01:00',
  match_minutes   smallint    not null default 10
);

insert into public.settings (id) values (1);

-- Segurança --------------------------------------------------------------
alter table public.categories   enable row level security;
alter table public.groups       enable row level security;
alter table public.participants enable row level security;
alter table public.matches      enable row level security;
alter table public.settings     enable row level security;
alter table public.admins       enable row level security;

do $$
declare t text;
begin
  foreach t in array array['categories', 'groups', 'participants', 'matches', 'settings']
  loop
    execute format(
      'create policy %I on public.%I for select to anon, authenticated using (true)',
      t || '_public_read', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())',
      t || '_admin_write', t);
  end loop;
end;
$$;

create policy admins_self_read on public.admins
  for select to authenticated using (user_id = auth.uid());

alter publication supabase_realtime add table public.matches;
alter publication supabase_realtime add table public.participants;
alter publication supabase_realtime add table public.groups;

notify pgrst, 'reload schema';
