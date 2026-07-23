-- Re-marcar vários jogos de uma vez, numa só transação.
--
-- O empréstimo de campos re-espalha os jogos que faltam por vários campos, o que
-- muda a jornada e a baliza de muitos ao mesmo tempo. Feito jogo a jogo, um
-- passo intermédio chocava com o índice único (categoria, baliza, jornada) —
-- dois jogos na mesma chave por um instante. Aqui é atómico: primeiro tira-se os
-- jogos afetados do caminho, depois põe-se cada um no seu lugar final.

create or replace function public.reschedule_matches(p_updates jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Só a mesa pode remarcar jogos.';
  end if;

  -- Liberta as jornadas de destino: os jogos a mexer saem para um espaço vazio.
  update public.matches
    set round = round + 1000
    where id in (select (u->>'id')::int from jsonb_array_elements(p_updates) u);

  -- Põe cada um no seu lugar final. Já sem choques: o destino está livre.
  update public.matches m set
    round = (u->>'round')::smallint,
    baliza = (u->>'baliza')::smallint,
    campo = (u->>'campo')::smallint,
    starts_at = (u->>'starts_at')::timestamptz
    from jsonb_array_elements(p_updates) u
    where m.id = (u->>'id')::int;
end;
$$;

revoke all on function public.reschedule_matches(jsonb) from public, anon;
grant execute on function public.reschedule_matches(jsonb) to authenticated;

-- Para o PostgREST ver a função nova sem esperar pela recarga automática.
notify pgrst, 'reload schema';
