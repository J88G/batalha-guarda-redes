// Batalha de Guarda-Redes — o modelo de dados.
//
// Guarda-redes individuais, por escalão de ano de nascimento. Cada escalão joga
// no seu campo, com o formato dado por três escolhas: quantos grupos (1 ou 2),
// que eliminatória em cima (nenhuma, só final, ou meias + final), e quantas
// balizas (jogos em simultâneo).

/** A eliminatória que remata um escalão, depois da fase de grupos. */
export type Knockout = "none" | "final" | "semis";

export type Category = {
  id: number;
  slug: string;
  name: string;
  short_label: string;
  sort_order: number;
  /** O campo onde este escalão joga. */
  campo: number;
  /** Quantos jogos correm ao mesmo tempo no campo. */
  baliza_count: number;
  /** 1 (poule única) ou 2 grupos. */
  group_count: number;
  /** Quantas voltas: cada par joga 1 ou 2 vezes. */
  legs: number;
  knockout: Knockout;
  birth_year_min: number;
  birth_year_max: number;
};

export type Group = {
  id: number;
  category_id: number;
  name: string;
};

export type Participant = {
  id: number;
  category_id: number;
  group_id: number | null;
  name: string;
  birth_year: number;
  seed: number | null;
  tiebreak_order: number | null;
};

export type Stage = "group" | "semi" | "final";

export type Match = {
  id: number;
  category_id: number;
  stage: Stage;
  group_id: number | null;
  round: number;
  /** Que baliza do campo — 1..baliza_count. */
  baliza: number;
  slot: number | null;
  starts_at: string;
  home_participant_id: number | null;
  away_participant_id: number | null;
  home_source: string | null;
  away_source: string | null;
  started_at: string | null;
  winner_participant_id: number | null;
  home_score: number | null;
  away_score: number | null;
  updated_at: string;
};

export type Settings = {
  id: number;
  tournament_name: string;
  venue: string;
  starts_at: string;
  match_minutes: number;
};

export type MatchStatus = "scheduled" | "live" | "finished";

export type Standing = {
  participantId: number;
  name: string;
  played: number;
  wins: number;
  losses: number;
  scored: number;
  conceded: number;
  diff: number;
  points: number;
  position: number;
  /** Empatado com o vizinho e sem critério que os separe. Tem de se ver. */
  tiedUnresolved: boolean;
};

/** Um jogo com os dois lados já traduzidos para um nome, pronto a desenhar. */
export type ResolvedMatch = Match & {
  status: MatchStatus;
  home: { participantId: number | null; label: string; pending: boolean };
  away: { participantId: number | null; label: string; pending: boolean };
};
