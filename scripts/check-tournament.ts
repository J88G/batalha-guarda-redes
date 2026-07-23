/**
 * Verifica o motor da Batalha de Guarda-Redes. Correr com: npm run check
 */
import {
  buildCategorySchedule,
  championOf,
  qualifiersPerGroup,
  reconcileKnockouts,
  resolveAll,
  roundsFor,
} from "../lib/tournament.ts";
import type { Category, Group, Knockout, Match, Participant } from "../lib/types.ts";

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  if (!pass) failures++;
  console.log(
    `${pass ? "PASS" : "FAIL"}  ${label}` +
      (pass ? "" : `\n   esperado ${JSON.stringify(expected)}\n   obtido   ${JSON.stringify(actual)}`),
  );
}
function ok(label: string, cond: boolean) {
  check(label, cond, true);
}

const START = new Date("2026-07-18T16:30:00+01:00");
const ISO = START.toISOString();

type Cfg = { count: number; groupCount: number; legs: number; knockout: Knockout; balizas: number };

function scenario(cfg: Cfg) {
  const category: Category = {
    id: 1,
    slug: "x",
    name: "X",
    short_label: "X",
    sort_order: 1,
    campo: 1,
    baliza_count: cfg.balizas,
    group_count: cfg.groupCount,
    legs: cfg.legs,
    knockout: cfg.knockout,
    birth_year_min: 2015,
    birth_year_max: 2016,
  };
  const groups: Group[] =
    cfg.groupCount === 2
      ? [
          { id: 1, category_id: 1, name: "A" },
          { id: 2, category_id: 1, name: "B" },
        ]
      : [{ id: 1, category_id: 1, name: "Única" }];

  const participants: Participant[] = Array.from({ length: cfg.count }, (_, i) => {
    const seed = i + 1;
    return {
      id: seed,
      category_id: 1,
      group_id: cfg.groupCount === 2 ? (seed % 2 === 1 ? 1 : 2) : 1,
      name: `G${seed}`,
      birth_year: 2015,
      seed,
      tiebreak_order: null,
    };
  });

  const planned = buildCategorySchedule(category, groups, participants, START, 10);
  return { category, groups, participants, planned };
}

function withIds(planned: ReturnType<typeof scenario>["planned"]): Match[] {
  return planned.map((p, i) => ({ ...p, id: i + 1, updated_at: ISO }));
}

function invariants(label: string, s: ReturnType<typeof scenario>) {
  const slots = s.planned.map((m) => `${m.category_id}:${m.baliza}@${m.round}`);
  check(`${label} · uma baliza, um jogo por jornada`, new Set(slots).size, s.planned.length);
  ok(
    `${label} · nunca mais balizas do que o campo tem`,
    s.planned.every((m) => m.baliza <= s.category.baliza_count),
  );

  const porJornada = new Map<number, number[]>();
  for (const m of s.planned.filter((m) => m.stage === "group")) {
    const lista = porJornada.get(m.round) ?? [];
    lista.push(m.home_participant_id!, m.away_participant_id!);
    porJornada.set(m.round, lista);
  }
  const dobrado = [...porJornada.values()].some((ids) => new Set(ids).size !== ids.length);
  ok(`${label} · ninguém joga dois ao mesmo tempo`, !dobrado);
}

// ---------------------------------------------------------------------------
console.log("\n· Fase de grupos · contagem de jogos");
// ---------------------------------------------------------------------------
{
  const s = scenario({ count: 9, groupCount: 2, legs: 1, knockout: "semis", balizas: 1 });
  const g = s.planned.filter((m) => m.stage === "group");
  check("9 GR · 2 grupos (5+4) → 16 jogos", g.length, roundsFor(5) + roundsFor(4));
  invariants("9 GR · 2 grupos · 1 baliza", s);
}
{
  const s = scenario({ count: 3, groupCount: 1, legs: 2, knockout: "none", balizas: 1 });
  const g = s.planned.filter((m) => m.stage === "group");
  check("3 GR · campeonato 2 voltas → 6 jogos", g.length, roundsFor(3, 2));
  check("3 GR · sem eliminatória", s.planned.filter((m) => m.stage !== "group").length, 0);
  invariants("3 GR · poule 2 voltas", s);
}
{
  const s = scenario({ count: 19, groupCount: 2, legs: 1, knockout: "semis", balizas: 6 });
  const g = s.planned.filter((m) => m.stage === "group");
  check("19 GR · 2 grupos (10+9) → 81 jogos", g.length, roundsFor(10) + roundsFor(9));
  invariants("19 GR · 6 balizas", s);
  const maxPorJornada = Math.max(
    ...[...new Set(g.map((m) => m.round))].map((r) => g.filter((m) => m.round === r).length),
  );
  ok("19 GR · corre vários jogos ao mesmo tempo", maxPorJornada > 1);
  ok("19 GR · nunca mais de 6 ao mesmo tempo", maxPorJornada <= 6);
}

// ---------------------------------------------------------------------------
console.log("\n· Estrutura da eliminatória por formato");
// ---------------------------------------------------------------------------
{
  const s = scenario({ count: 8, groupCount: 2, legs: 1, knockout: "semis", balizas: 1 });
  check(
    "2 grupos + semis · 2 meias + 1 final",
    [s.planned.filter((m) => m.stage === "semi").length, s.planned.filter((m) => m.stage === "final").length],
    [2, 1],
  );
  check("2 grupos + semis · apuram 2 de cada", qualifiersPerGroup(s.category), 2);
  check(
    "1 baliza · meias e final em 3 jornadas",
    new Set(s.planned.filter((m) => m.stage !== "group").map((m) => m.round)).size,
    3,
  );
}
{
  const s = scenario({ count: 8, groupCount: 2, legs: 1, knockout: "final", balizas: 1 });
  check("2 grupos + só final · sem meias", s.planned.filter((m) => m.stage === "semi").length, 0);
  check("2 grupos + só final · 1 final", s.planned.filter((m) => m.stage === "final").length, 1);
  check("2 grupos + só final · apura 1 de cada", qualifiersPerGroup(s.category), 1);
}
{
  const s = scenario({ count: 6, groupCount: 1, legs: 1, knockout: "semis", balizas: 1 });
  check(
    "1 grupo + semis · 2 meias + 1 final",
    [s.planned.filter((m) => m.stage === "semi").length, s.planned.filter((m) => m.stage === "final").length],
    [2, 1],
  );
  check("1 grupo + semis · apuram os 4 primeiros", qualifiersPerGroup(s.category), 4);
}
{
  const s = scenario({ count: 6, groupCount: 1, legs: 1, knockout: "none", balizas: 2 });
  check("campeonato · sem meias nem final", s.planned.filter((m) => m.stage !== "group").length, 0);
}

// ---------------------------------------------------------------------------
console.log("\n· A eliminatória resolve-se sozinha (2 grupos + semis)");
// ---------------------------------------------------------------------------
{
  const s = scenario({ count: 8, groupCount: 2, legs: 1, knockout: "semis", balizas: 1 });
  const matches = withIds(s.planned);
  const apply = () => {
    for (const p of reconcileKnockouts(matches, [s.category], s.groups, s.participants)) {
      const m = matches.find((x) => x.id === p.id)!;
      m.home_participant_id = p.home_participant_id;
      m.away_participant_id = p.away_participant_id;
      if (p.winner_participant_id === null) m.winner_participant_id = null;
    }
  };

  const before = resolveAll(matches, [s.category], s.groups, s.participants, START);
  ok("meia antes dos grupos · mostra o lugar", before.find((m) => m.stage === "semi" && m.slot === 1)!.home.pending);

  for (const m of matches.filter((m) => m.stage === "group")) {
    m.winner_participant_id = Math.min(m.home_participant_id!, m.away_participant_id!);
  }
  apply();

  const after = resolveAll(matches, [s.category], s.groups, s.participants, START);
  const semi1 = after.find((m) => m.stage === "semi" && m.slot === 1)!;
  const semi2 = after.find((m) => m.stage === "semi" && m.slot === 2)!;
  // A = ímpares {1,3,5,7}: 1º G1, 2º G3. B = pares {2,4,6,8}: 1º G2, 2º G4.
  check("grupos fechados · meia 1 = 1ºA vs 2ºB", [semi1.home.label, semi1.away.label], ["G1", "G4"]);
  check("grupos fechados · meia 2 = 1ºB vs 2ºA", [semi2.home.label, semi2.away.label], ["G2", "G3"]);

  matches.find((m) => m.stage === "semi" && m.slot === 1)!.winner_participant_id = 1;
  matches.find((m) => m.stage === "semi" && m.slot === 2)!.winner_participant_id = 2;
  apply();
  const done = resolveAll(matches, [s.category], s.groups, s.participants, START);
  const final = done.find((m) => m.stage === "final")!;
  check("meias fechadas · final = G1 vs G2", [final.home.label, final.away.label], ["G1", "G2"]);

  check("sem final jogada · sem campeão", championOf(s.category, s.groups, s.participants, matches), null);
  matches.find((m) => m.stage === "final")!.winner_participant_id = 1;
  check("final jogada · campeão G1", championOf(s.category, s.groups, s.participants, matches)?.name, "G1");
}

// ---------------------------------------------------------------------------
console.log("\n· Campeão de um campeonato (sem eliminatória)");
// ---------------------------------------------------------------------------
{
  const s = scenario({ count: 3, groupCount: 1, legs: 2, knockout: "none", balizas: 1 });
  const matches = withIds(s.planned);
  check("campeonato a meio · sem campeão", championOf(s.category, s.groups, s.participants, matches), null);
  for (const m of matches) m.winner_participant_id = Math.min(m.home_participant_id!, m.away_participant_id!);
  check("campeonato fechado · campeão é o 1º", championOf(s.category, s.groups, s.participants, matches)?.name, "G1");
}

console.log(failures === 0 ? "\n✓ Tudo certo.\n" : `\n✗ ${failures} falha(s).\n`);
process.exit(failures === 0 ? 0 : 1);
