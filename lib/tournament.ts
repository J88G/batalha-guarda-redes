import type {
  Category,
  Group,
  Match,
  MatchStatus,
  Participant,
  ResolvedMatch,
  Standing,
} from "./types";

/** Uma vitória vale 3 pontos. Não há empates: resolve-se em morte súbita. */
export const POINTS_PER_WIN = 3;

/** Um jogo fecha quando se sabe quem ganhou. O placard é opcional. */
function isFinished(m: Match): m is Match & { winner_participant_id: number } {
  return m.winner_participant_id !== null;
}

function hasScore(m: Match): m is Match & { home_score: number; away_score: number } {
  return m.home_score !== null && m.away_score !== null;
}

// ---------------------------------------------------------------------------
// Estado de um jogo
// ---------------------------------------------------------------------------

/**
 * O que está a decorrer vem dos resultados, não do relógio. Em cada baliza, o
 * jogo a decorrer é o primeiro por decidir — assim o site segue o campo e os
 * atrasos resolvem-se sozinhos. A hora só serve para não acender antes de horas.
 */
export function matchStatus(
  match: Pick<Match, "starts_at" | "winner_participant_id" | "started_at">,
  now: Date,
  isCurrentOnBaliza: boolean,
): MatchStatus {
  if (match.winner_participant_id !== null) return "finished";
  if (!isCurrentOnBaliza) return "scheduled";
  if (match.started_at !== null) return "live";
  return now.getTime() >= new Date(match.starts_at).getTime() ? "live" : "scheduled";
}

/**
 * Onde o jogo é mesmo jogado. Normalmente é o campo do escalão; num jogo
 * emprestado, é o campo para onde a mesa o mandou.
 */
export function physicalCampo(
  m: Pick<Match, "campo" | "category_id">,
  categories: Pick<Category, "id" | "campo">[],
): number {
  if (m.campo != null) return m.campo;
  return categories.find((c) => c.id === m.category_id)?.campo ?? m.category_id;
}

/**
 * Por campo físico, o jogo que lá está agora: o primeiro por decidir. Como um
 * escalão pode ter jogos em dois campos (o seu e um emprestado), cada campo
 * segue a sua fila — é isto que faz correr dois jogos do mesmo escalão ao mesmo
 * tempo, sem os confundir.
 */
export function currentMatchByCampo(
  matches: Match[],
  categories: Pick<Category, "id" | "campo">[],
): Map<number, number> {
  const current = new Map<number, Match>();
  for (const m of matches) {
    if (isFinished(m)) continue;
    const key = physicalCampo(m, categories);
    const held = current.get(key);
    if (!held) {
      current.set(key, m);
      continue;
    }
    const mStarted = m.started_at !== null;
    const heldStarted = held.started_at !== null;
    if (mStarted !== heldStarted) {
      if (mStarted) current.set(key, m);
    } else if (m.starts_at < held.starts_at) {
      current.set(key, m);
    }
  }
  return new Map([...current].map(([k, m]) => [k, m.id]));
}

/** A jornada que o escalão está mesmo a jogar, e a que o horário mandava. */
export function categoryProgress(
  matches: Match[],
  now: Date,
): { currentRound: number | null; expectedRound: number; totalRounds: number } {
  const rounds = matches.map((m) => m.round);
  const totalRounds = rounds.length > 0 ? Math.max(...rounds) : 0;
  const unfinished = matches.filter((m) => !isFinished(m));
  const currentRound = unfinished.length > 0 ? Math.min(...unfinished.map((m) => m.round)) : null;
  const started = matches.filter((m) => new Date(m.starts_at).getTime() <= now.getTime());
  const expectedRound = started.length > 0 ? Math.max(...started.map((m) => m.round)) : 0;
  return { currentRound, expectedRound, totalRounds };
}

// ---------------------------------------------------------------------------
// Classificação
// ---------------------------------------------------------------------------

function emptyStanding(p: Participant): Standing {
  return {
    participantId: p.id,
    name: p.name,
    played: 0,
    wins: 0,
    losses: 0,
    scored: 0,
    conceded: 0,
    diff: 0,
    points: 0,
    position: 0,
    tiedUnresolved: false,
  };
}

type MiniRow = { points: number; diff: number; scored: number };
type RankableStanding = Standing & { tiebreakOrder: number | null; seed: number | null };

/** Mini-campeonato só entre os empatados: com dois, é o confronto directo. */
function miniLeague(tied: Standing[], matches: Match[]): Map<number, MiniRow> {
  const ids = new Set(tied.map((s) => s.participantId));
  const mini = new Map<number, MiniRow>(
    tied.map((s) => [s.participantId, { points: 0, diff: 0, scored: 0 }]),
  );

  for (const m of matches) {
    if (!isFinished(m)) continue;
    if (m.home_participant_id === null || m.away_participant_id === null) continue;
    if (!ids.has(m.home_participant_id) || !ids.has(m.away_participant_id)) continue;

    mini.get(m.winner_participant_id)!.points += POINTS_PER_WIN;
    if (hasScore(m)) {
      const home = mini.get(m.home_participant_id)!;
      const away = mini.get(m.away_participant_id)!;
      home.scored += m.home_score;
      home.diff += m.home_score - m.away_score;
      away.scored += m.away_score;
      away.diff += m.away_score - m.home_score;
    }
  }
  return mini;
}

function compareTied(a: Standing, b: Standing, mini: Map<number, MiniRow>): number {
  const ma = mini.get(a.participantId)!;
  const mb = mini.get(b.participantId)!;
  return (
    mb.points - ma.points ||
    mb.diff - ma.diff ||
    mb.scored - ma.scored ||
    b.diff - a.diff ||
    b.scored - a.scored
  );
}

function rankTied(
  tied: RankableStanding[],
  matches: Match[],
  poolComplete: boolean,
): RankableStanding[] {
  if (tied.length < 2) return tied;
  const mini = miniLeague(tied, matches);

  const sorted = [...tied].sort(
    (a, b) =>
      compareTied(a, b, mini) ||
      (a.tiebreakOrder ?? Infinity) - (b.tiebreakOrder ?? Infinity) ||
      (a.seed ?? Infinity) - (b.seed ?? Infinity) ||
      a.name.localeCompare(b.name, "pt"),
  );

  // Enquanto a poule não fecha, o empate ainda se desfaz a jogar.
  if (!poolComplete) return sorted;

  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    const separated =
      compareTied(a, b, mini) !== 0 ||
      (a.tiebreakOrder ?? null) !== null ||
      (b.tiebreakOrder ?? null) !== null;
    if (!separated) {
      a.tiedUnresolved = true;
      b.tiedUnresolved = true;
    }
  }
  return sorted;
}

/**
 * A classificação de uma poule (um grupo, ou a poule única do campeonato).
 * `matches` deve conter só os jogos dessa poule.
 */
export function computeStandings(participants: Participant[], matches: Match[]): Standing[] {
  const table = new Map<number, RankableStanding>(
    participants.map((p) => [
      p.id,
      { ...emptyStanding(p), tiebreakOrder: p.tiebreak_order, seed: p.seed },
    ]),
  );
  const poolMatches = matches.filter((m) => m.stage === "group");
  const complete = poolMatches.length > 0 && poolMatches.every(isFinished);

  for (const m of poolMatches) {
    if (!isFinished(m)) continue;
    if (m.home_participant_id === null || m.away_participant_id === null) continue;
    const home = table.get(m.home_participant_id);
    const away = table.get(m.away_participant_id);
    if (!home || !away) continue;

    home.played++;
    away.played++;
    const winner = table.get(m.winner_participant_id);
    const loser = table.get(
      m.winner_participant_id === m.home_participant_id
        ? m.away_participant_id
        : m.home_participant_id,
    );
    if (winner) {
      winner.wins++;
      winner.points += POINTS_PER_WIN;
    }
    if (loser) loser.losses++;

    if (hasScore(m)) {
      home.scored += m.home_score;
      home.conceded += m.away_score;
      away.scored += m.away_score;
      away.conceded += m.home_score;
    }
  }

  for (const s of table.values()) s.diff = s.scored - s.conceded;

  const byPoints = new Map<number, RankableStanding[]>();
  for (const s of table.values()) {
    const bucket = byPoints.get(s.points);
    if (bucket) bucket.push(s);
    else byPoints.set(s.points, [s]);
  }

  const ranked: Standing[] = [];
  for (const points of [...byPoints.keys()].sort((a, b) => b - a)) {
    ranked.push(...rankTied(byPoints.get(points)!, poolMatches, complete));
  }
  ranked.forEach((s, i) => (s.position = i + 1));
  return ranked;
}

export function isGroupComplete(groupId: number, matches: Match[]): boolean {
  const ms = matches.filter((m) => m.stage === "group" && m.group_id === groupId);
  return ms.length > 0 && ms.every(isFinished);
}

/**
 * Um empate a impedir o apuramento: nos lugares que decidem quem passa à
 * eliminatória. Só existe onde há eliminatória.
 */
export function blockingTie(standings: Standing[], qualifiers: number): boolean {
  if (qualifiers <= 0) return false;
  const last = standings[qualifiers - 1];
  const next = standings[qualifiers];
  if (!last || !next) return false;
  return last.tiedUnresolved && next.tiedUnresolved && last.points === next.points;
}

// ---------------------------------------------------------------------------
// Geração do calendário
// ---------------------------------------------------------------------------

const BYE = -1;

/** Todos contra todos pelo método do círculo — rondas de pares disjuntos. */
function circleRounds(ids: number[]): [number, number][][] {
  const list = [...ids];
  if (list.length < 2) return [];
  if (list.length % 2 === 1) list.push(BYE);

  const n = list.length;
  const half = n / 2;
  const fixed = list[0];
  let rotating = list.slice(1);
  const rounds: [number, number][][] = [];

  for (let r = 0; r < n - 1; r++) {
    const line = [fixed, ...rotating];
    const round: [number, number][] = [];
    for (let i = 0; i < half; i++) {
      const a = line[i];
      const b = line[n - 1 - i];
      if (a === BYE || b === BYE) continue;
      round.push(r % 2 === 0 ? [a, b] : [b, a]);
    }
    rounds.push(round);
    rotating = [rotating[rotating.length - 1], ...rotating.slice(0, -1)];
  }
  return rounds;
}

/** As rondas de um grupo, com as voltas pedidas (a 2ª troca quem joga em casa). */
function groupRounds(ids: number[], legs: number): [number, number][][] {
  const base = circleRounds(ids);
  if (legs <= 1) return base;
  const back = base.map((round) => round.map(([a, b]) => [b, a] as [number, number]));
  return [...base, ...back];
}

export type PlannedMatch = Omit<Match, "id" | "updated_at">;

const EMPTY_RESULT = {
  started_at: null,
  winner_participant_id: null,
  home_score: null,
  away_score: null,
} as const;

export function slotTime(start: Date, round: number, matchMinutes: number): string {
  return new Date(start.getTime() + (round - 1) * matchMinutes * 60_000).toISOString();
}

type Pairing = { home: number; away: number; group_id: number | null };

/**
 * Espalha os jogos por `balizaCount` balizas ao longo das jornadas.
 *
 * Cada jogo entra na jornada mais cedo (a partir de `minRound`) onde nenhum dos
 * dois já joga e ainda há baliza livre. Como só há um jogo por baliza de cada
 * vez, uma baliza nunca tem dois jogos à mesma hora e ninguém joga dois ao mesmo
 * tempo. A ordem em que chegam os jogos é que dá o bom espaçamento.
 */
function scheduleOntoBalizas(
  pairings: Pairing[],
  balizaCount: number,
  minRound: number,
): { pairing: Pairing; round: number; baliza: number }[] {
  const byRound = new Map<number, { home: number; away: number }[]>();
  const out: { pairing: Pairing; round: number; baliza: number }[] = [];

  const conflict = (round: number, p: Pairing) =>
    (byRound.get(round) ?? []).some(
      (m) => m.home === p.home || m.away === p.home || m.home === p.away || m.away === p.away,
    );

  for (const p of pairings) {
    let round = minRound;
    while (conflict(round, p) || (byRound.get(round)?.length ?? 0) >= balizaCount) {
      round++;
    }
    const inRound = byRound.get(round) ?? [];
    inRound.push({ home: p.home, away: p.away });
    byRound.set(round, inRound);
    out.push({ pairing: p, round, baliza: inRound.length });
  }
  return out;
}

/**
 * Re-espalha jogos por decidir por N balizas, sem nunca pôr um guarda-redes em
 * dois ao mesmo tempo. É o que faz o empréstimo de campos: baliza 1 é o campo de
 * casa, e cada campo emprestado é mais uma baliza. Devolve, por jogo, a nova
 * jornada e a baliza (1..N) onde fica.
 */
export function repackMatches(
  pending: Pick<Match, "id" | "home_participant_id" | "away_participant_id" | "group_id">[],
  balizaCount: number,
  minRound: number,
): { id: number; round: number; baliza: number }[] {
  const pairings: Pairing[] = pending.map((m) => ({
    home: m.home_participant_id as number,
    away: m.away_participant_id as number,
    group_id: m.group_id,
  }));
  // scheduleOntoBalizas mantém a ordem de entrada, por isso o índice liga cada
  // resultado ao jogo que lhe deu origem.
  const scheduled = scheduleOntoBalizas(pairings, balizaCount, minRound);
  return scheduled.map((s, i) => ({ id: pending[i].id, round: s.round, baliza: s.baliza }));
}

/** Quantos se apuram de cada grupo, conforme o formato. */
export function qualifiersPerGroup(category: Pick<Category, "group_count" | "knockout">): number {
  if (category.knockout === "none") return 0;
  if (category.knockout === "final") return category.group_count === 2 ? 1 : 2;
  return category.group_count === 2 ? 2 : 4; // semis
}

/**
 * O calendário completo de um escalão: a fase de grupos (uma ou duas poules,
 * uma ou duas voltas), espalhada pelas balizas do campo, e por cima a
 * eliminatória que o formato pedir.
 */
export function buildCategorySchedule(
  category: Category,
  groups: Group[],
  participants: Participant[],
  start: Date,
  matchMinutes: number,
): PlannedMatch[] {
  const cGroups = groups
    .filter((g) => g.category_id === category.id)
    .sort((a, b) => a.name.localeCompare(b.name));
  if (cGroups.length === 0) return [];

  const planned: PlannedMatch[] = [];

  // --- Fase de grupos: interliga as rondas de cada grupo e espalha nas balizas.
  const roundsPerGroup = cGroups.map((g) => ({
    group: g,
    rounds: groupRounds(
      participants.filter((p) => p.group_id === g.id).map((p) => p.id),
      category.legs,
    ),
  }));

  const pairings: Pairing[] = [];
  const maxRounds = Math.max(0, ...roundsPerGroup.map((r) => r.rounds.length));
  for (let i = 0; i < maxRounds; i++) {
    for (const { group, rounds } of roundsPerGroup) {
      for (const [home, away] of rounds[i] ?? []) {
        pairings.push({ home, away, group_id: group.id });
      }
    }
  }

  const scheduled = scheduleOntoBalizas(pairings, category.baliza_count, 1);
  for (const { pairing, round, baliza } of scheduled) {
    planned.push({
      category_id: category.id,
      stage: "group",
      group_id: pairing.group_id,
      round,
      baliza,
      campo: null,
      slot: null,
      starts_at: slotTime(start, round, matchMinutes),
      home_participant_id: pairing.home,
      away_participant_id: pairing.away,
      home_source: null,
      away_source: null,
      ...EMPTY_RESULT,
    });
  }

  const groupRoundsUsed = scheduled.reduce((max, s) => Math.max(max, s.round), 0);
  if (groupRoundsUsed === 0 || category.knockout === "none") return planned;

  // --- Eliminatória. As fontes são lugares de grupo até haver classificação.
  const groupA = cGroups[0];
  const groupB = cGroups[1];

  const semiPairs: { home: string; away: string }[] = [];
  if (category.knockout === "semis") {
    if (category.group_count === 2 && groupB) {
      semiPairs.push({ home: `group:${groupA.id}:1`, away: `group:${groupB.id}:2` });
      semiPairs.push({ home: `group:${groupB.id}:1`, away: `group:${groupA.id}:2` });
    } else {
      semiPairs.push({ home: `group:${groupA.id}:1`, away: `group:${groupA.id}:4` });
      semiPairs.push({ home: `group:${groupA.id}:2`, away: `group:${groupA.id}:3` });
    }
  }

  let round = groupRoundsUsed;

  if (semiPairs.length > 0) {
    round++;
    const twoBalizas = category.baliza_count >= 2;
    semiPairs.forEach((pair, i) => {
      const semiRound = twoBalizas ? round : round + i;
      planned.push({
        category_id: category.id,
        stage: "semi",
        group_id: null,
        round: semiRound,
        baliza: twoBalizas ? i + 1 : 1,
        campo: null,
        slot: i + 1,
        starts_at: slotTime(start, semiRound, matchMinutes),
        home_participant_id: null,
        away_participant_id: null,
        home_source: pair.home,
        away_source: pair.away,
        ...EMPTY_RESULT,
      });
    });
    round = twoBalizas ? round : round + 1;
  }

  // A final: dos vencedores das meias, ou directa dos primeiros dos grupos.
  round++;
  let finalHome: string;
  let finalAway: string;
  if (category.knockout === "semis") {
    finalHome = "winner:semi:1";
    finalAway = "winner:semi:2";
  } else if (category.group_count === 2 && groupB) {
    finalHome = `group:${groupA.id}:1`;
    finalAway = `group:${groupB.id}:1`;
  } else {
    finalHome = `group:${groupA.id}:1`;
    finalAway = `group:${groupA.id}:2`;
  }

  planned.push({
    category_id: category.id,
    stage: "final",
    group_id: null,
    round,
    baliza: 1,
    campo: null,
    slot: null,
    starts_at: slotTime(start, round, matchMinutes),
    home_participant_id: null,
    away_participant_id: null,
    home_source: finalHome,
    away_source: finalAway,
    ...EMPTY_RESULT,
  });

  return planned;
}

// ---------------------------------------------------------------------------
// Resolução das eliminatórias
// ---------------------------------------------------------------------------

type ResolveContext = {
  categories: Category[];
  groups: Group[];
  participants: Participant[];
  matches: Match[];
  standingsByGroup: Map<number, Standing[]>;
};

export function buildResolveContext(
  categories: Category[],
  groups: Group[],
  participants: Participant[],
  matches: Match[],
): ResolveContext {
  const standingsByGroup = new Map<number, Standing[]>();
  for (const g of groups) {
    standingsByGroup.set(
      g.id,
      computeStandings(
        participants.filter((p) => p.group_id === g.id),
        matches.filter((m) => m.group_id === g.id),
      ),
    );
  }
  return { categories, groups, participants, matches, standingsByGroup };
}

const ORDINAL = ["", "1º", "2º", "3º", "4º"];
const MAX_DEPTH = 4;

function semiOf(ctx: ResolveContext, categoryId: number, slot: number): Match | undefined {
  return ctx.matches.find(
    (m) => m.stage === "semi" && m.category_id === categoryId && m.slot === slot,
  );
}

function resolveSide(
  participantId: number | null,
  source: string | null,
  categoryId: number,
  ctx: ResolveContext,
  depth = 0,
): { participantId: number | null; label: string; pending: boolean } {
  if (depth > MAX_DEPTH) return { participantId: null, label: "—", pending: true };
  if (participantId !== null) {
    const p = ctx.participants.find((x) => x.id === participantId);
    return { participantId, label: p?.name ?? "—", pending: false };
  }
  if (!source) return { participantId: null, label: "—", pending: true };

  const parts = source.split(":");

  if (parts[0] === "group") {
    const groupId = Number(parts[1]);
    const place = Number(parts[2]);
    const group = ctx.groups.find((g) => g.id === groupId);
    const category = ctx.categories.find((c) => c.id === group?.category_id);
    const ord = ORDINAL[place] ?? `${place}º`;
    const label =
      category && category.group_count === 1 ? ord : `${ord} Grupo ${group?.name ?? "?"}`;
    // Enquanto o grupo não fecha, a classificação é provisória: mostra-se o
    // lugar, não um nome. Só o lugar empatado fica à espera depois de fechar.
    if (!isGroupComplete(groupId, ctx.matches)) return { participantId: null, label, pending: true };
    const standing = ctx.standingsByGroup.get(groupId)?.[place - 1];
    if (!standing) return { participantId: null, label, pending: true };
    if (standing.tiedUnresolved) return { participantId: null, label, pending: true };
    return { participantId: standing.participantId, label: standing.name, pending: false };
  }

  if (parts[0] === "winner" && parts[1] === "semi") {
    const slot = Number(parts[2]);
    const feeder = semiOf(ctx, categoryId, slot);
    const label = `Vencedor Meia-final ${slot}`;
    const id = feeder?.winner_participant_id ?? null;
    if (id === null) return { participantId: null, label, pending: true };
    const p = ctx.participants.find((x) => x.id === id);
    return { participantId: id, label: p?.name ?? label, pending: false };
  }

  return { participantId: null, label: "—", pending: true };
}

export function resolveMatch(
  match: Match,
  ctx: ResolveContext,
  now: Date,
  isCurrentOnBaliza: boolean,
): ResolvedMatch {
  return {
    ...match,
    status: matchStatus(match, now, isCurrentOnBaliza),
    home: resolveSide(match.home_participant_id, match.home_source, match.category_id, ctx),
    away: resolveSide(match.away_participant_id, match.away_source, match.category_id, ctx),
  };
}

export function resolveAll(
  matches: Match[],
  categories: Category[],
  groups: Group[],
  participants: Participant[],
  now: Date,
): ResolvedMatch[] {
  const ctx = buildResolveContext(categories, groups, participants, matches);
  const current = currentMatchByCampo(matches, categories);
  return matches.map((m) => resolveMatch(m, ctx, now, current.get(physicalCampo(m, categories)) === m.id));
}

export type KnockoutPatch = {
  id: number;
  home_participant_id: number | null;
  away_participant_id: number | null;
  winner_participant_id?: null;
  home_score?: null;
  away_score?: null;
};

/**
 * Volta a derivar quem joga as eliminatórias a partir da classificação de
 * agora. Corre a cada gravação: se um resultado mudar quem se apurou, o quadro
 * muda com ele, e um vencedor que deixe de fazer sentido é apagado.
 */
export function reconcileKnockouts(
  matches: Match[],
  categories: Category[],
  groups: Group[],
  participants: Participant[],
): KnockoutPatch[] {
  const working = matches.map((m) => ({ ...m }));
  const patches = new Map<number, KnockoutPatch>();

  for (const stage of ["semi", "final"] as const) {
    const ctx = buildResolveContext(categories, groups, participants, working);
    for (const m of working) {
      if (m.stage !== stage) continue;
      const home = resolveSide(null, m.home_source, m.category_id, ctx).participantId;
      const away = resolveSide(null, m.away_source, m.category_id, ctx).participantId;
      if (home === m.home_participant_id && away === m.away_participant_id) continue;

      const patch: KnockoutPatch = {
        id: m.id,
        home_participant_id: home,
        away_participant_id: away,
      };
      if (
        m.winner_participant_id !== null &&
        m.winner_participant_id !== home &&
        m.winner_participant_id !== away
      ) {
        patch.winner_participant_id = null;
        patch.home_score = null;
        patch.away_score = null;
        m.winner_participant_id = null;
        m.home_score = null;
        m.away_score = null;
      }
      m.home_participant_id = home;
      m.away_participant_id = away;
      patches.set(m.id, patch);
    }
  }
  return [...patches.values()];
}

/** O campeão de um escalão: vencedor da final, ou o 1º da poule se não há eliminatória. */
export function championOf(
  category: Category,
  groups: Group[],
  participants: Participant[],
  matches: Match[],
): Participant | null {
  const cMatches = matches.filter((m) => m.category_id === category.id);

  if (category.knockout !== "none") {
    const final = cMatches.find((m) => m.stage === "final");
    const id = final?.winner_participant_id ?? null;
    return id === null ? null : (participants.find((p) => p.id === id) ?? null);
  }

  const group = groups.find((g) => g.category_id === category.id);
  if (!group || !isGroupComplete(group.id, cMatches)) return null;
  const standings = computeStandings(
    participants.filter((p) => p.group_id === group.id),
    cMatches.filter((m) => m.group_id === group.id),
  );
  const top = standings[0];
  if (!top || top.tiedUnresolved) return null;
  return participants.find((p) => p.id === top.participantId) ?? null;
}

/** n participantes → n·(n-1)/2 jogos por volta. */
export function roundsFor(count: number, legs = 1): number {
  return count < 2 ? 0 : ((count * (count - 1)) / 2) * legs;
}

/**
 * Reparte os guarda-redes de um escalão pelos grupos, como no documento: por
 * ordem de número, um para cada grupo à vez. Com dois grupos, os ímpares ficam
 * no A e os pares no B; com poule única, entram todos nela.
 */
export function balancedAssignment(
  groups: Group[],
  participants: Participant[],
): { participantId: number; groupId: number }[] {
  const ordered = [...groups].sort((a, b) => a.name.localeCompare(b.name));
  if (ordered.length === 0) return [];
  const bySeed = [...participants].sort(
    (a, b) => (a.seed ?? Infinity) - (b.seed ?? Infinity) || a.id - b.id,
  );
  return bySeed.map((p, i) => ({
    participantId: p.id,
    groupId: ordered[i % ordered.length].id,
  }));
}
