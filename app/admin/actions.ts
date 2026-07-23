"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TZ } from "@/lib/format";
import {
  balancedAssignment,
  buildCategorySchedule,
  reconcileKnockouts,
} from "@/lib/tournament";
import type { Category, Group, Knockout, Match, Participant, Settings } from "@/lib/types";

export type ActionResult = { ok: true } | { ok: false; error: string };

function refreshEverything() {
  // Um resultado mexe na classificação, no quadro e no placard da entrada.
  revalidatePath("/", "layout");
}

async function loadAll() {
  const supabase = await createClient();
  const [settings, categories, groups, participants, matches] = await Promise.all([
    supabase.from("settings").select("*").eq("id", 1).single(),
    supabase.from("categories").select("*").order("sort_order"),
    supabase.from("groups").select("*").order("name"),
    supabase.from("participants").select("*").order("seed"),
    supabase.from("matches").select("*").order("starts_at"),
  ]);
  return {
    supabase,
    settings: settings.data as Settings,
    categories: (categories.data ?? []) as Category[],
    groups: (groups.data ?? []) as Group[],
    participants: (participants.data ?? []) as Participant[],
    matches: (matches.data ?? []) as Match[],
  };
}

/**
 * Depois de cada escrita, o quadro é derivado outra vez a partir da
 * classificação de agora. É isto que faz uma correcção na mesa chegar às
 * meias-finais e à final.
 */
async function reconcile() {
  const { supabase, categories, groups, participants, matches } = await loadAll();
  const patches = reconcileKnockouts(matches, categories, groups, participants);
  for (const patch of patches) {
    const { id } = patch;
    // O vencedor sai primeiro: a base de dados não deixa ficar em campo quem
    // já não joga o jogo.
    if ("winner_participant_id" in patch) {
      await supabase
        .from("matches")
        .update({ winner_participant_id: null, home_score: null, away_score: null })
        .eq("id", id);
    }
    await supabase
      .from("matches")
      .update({
        home_participant_id: patch.home_participant_id,
        away_participant_id: patch.away_participant_id,
      })
      .eq("id", id);
  }
}

// ---------------------------------------------------------------------------
// Resultados
// ---------------------------------------------------------------------------

/**
 * O que a mesa faz a seguir a cada jogo: o árbitro diz quem ganhou. O placard
 * é opcional — quando vem, é ele que manda (o trigger na base de dados
 * confirma-o).
 */
export async function setResult(formData: FormData): Promise<void> {
  const matchId = Number(formData.get("matchId"));
  const winnerId = Number(formData.get("winnerParticipantId"));
  const homeRaw = String(formData.get("homeScore") ?? "").trim();
  const awayRaw = String(formData.get("awayScore") ?? "").trim();

  const supabase = await createClient();
  const hasScore = homeRaw !== "" && awayRaw !== "";

  const update: Record<string, number | null> = { winner_participant_id: winnerId };
  if (hasScore) {
    update.home_score = Number(homeRaw);
    update.away_score = Number(awayRaw);
  } else {
    update.home_score = null;
    update.away_score = null;
  }

  const { error } = await supabase.from("matches").update(update).eq("id", matchId);
  if (error) throw new Error(error.message);

  await reconcile();
  refreshEverything();
}

/**
 * "Este já começou." Opcional: o site descobre sozinho o que está a decorrer,
 * por isso isto só serve quando uma baliza arranca antes da hora marcada.
 */
export async function markStarted(formData: FormData): Promise<void> {
  const matchId = Number(formData.get("matchId"));
  const supabase = await createClient();
  const { error } = await supabase
    .from("matches")
    .update({ started_at: new Date().toISOString() })
    .eq("id", matchId);
  if (error) throw new Error(error.message);
  refreshEverything();
}

/** Enganou-se a marcar o arranque: volta a deduzir-se pelo horário. */
export async function unmarkStarted(formData: FormData): Promise<void> {
  const matchId = Number(formData.get("matchId"));
  const supabase = await createClient();
  const { error } = await supabase.from("matches").update({ started_at: null }).eq("id", matchId);
  if (error) throw new Error(error.message);
  refreshEverything();
}

/** Apaga o resultado e devolve o jogo a "por jogar". */
export async function clearResult(formData: FormData): Promise<void> {
  const matchId = Number(formData.get("matchId"));
  const supabase = await createClient();

  const { error } = await supabase
    .from("matches")
    .update({ winner_participant_id: null, home_score: null, away_score: null })
    .eq("id", matchId);
  if (error) throw new Error(error.message);

  await reconcile();
  refreshEverything();
}

/**
 * O guarda-redes ainda não chegou: joga-se o seguinte da mesma baliza e este
 * fica para o lugar desse. Troca as horas dos dois — mais nada se mexe.
 */
export async function postponeMatch(formData: FormData): Promise<void> {
  const matchId = Number(formData.get("matchId"));
  const { supabase, matches } = await loadAll();

  const match = matches.find((m) => m.id === matchId);
  if (!match) throw new Error("Jogo não encontrado.");

  // O próximo jogo por decidir na mesma baliza deste campo.
  const next = matches
    .filter(
      (m) =>
        m.category_id === match.category_id &&
        m.baliza === match.baliza &&
        m.round > match.round &&
        m.winner_participant_id === null,
    )
    .sort((a, b) => a.round - b.round)[0];
  if (!next) throw new Error("Não há jogo seguinte nesta baliza para trocar.");

  const a = await supabase
    .from("matches")
    .update({ round: next.round, starts_at: next.starts_at, started_at: null })
    .eq("id", match.id);
  if (a.error) throw new Error(a.error.message);

  const b = await supabase
    .from("matches")
    .update({ round: match.round, starts_at: match.starts_at, started_at: null })
    .eq("id", next.id);
  if (b.error) throw new Error(b.error.message);

  refreshEverything();
}

// ---------------------------------------------------------------------------
// Guarda-redes
// ---------------------------------------------------------------------------

/**
 * Uma inscrição de última hora. Fica logo no grupo escolhido, mas só entra em
 * campo depois de o calendário do escalão ser gerado outra vez.
 */
export async function addParticipant(formData: FormData): Promise<void> {
  const categoryId = Number(formData.get("categoryId"));
  const name = String(formData.get("name") ?? "").trim();
  const year = Number(formData.get("birthYear"));
  const raw = String(formData.get("groupId") ?? "");
  const groupId = raw === "" ? null : Number(raw);

  if (name === "") throw new Error("O guarda-redes precisa de um nome.");
  if (!Number.isFinite(year)) throw new Error("Falta o ano de nascimento.");

  const { supabase, categories } = await loadAll();
  const category = categories.find((c) => c.id === categoryId);
  if (!category) throw new Error("Escalão não encontrado.");
  if (year < category.birth_year_min || year > category.birth_year_max) {
    throw new Error(
      `Este escalão é de ${category.birth_year_min} a ${category.birth_year_max}. ${year} não cabe aqui.`,
    );
  }

  // O número segue a ordem de inscrição: o próximo livre no escalão.
  const { data: existing } = await supabase
    .from("participants")
    .select("seed")
    .eq("category_id", categoryId)
    .order("seed", { ascending: false })
    .limit(1);
  const seed = (existing?.[0]?.seed ?? 0) + 1;

  const { error } = await supabase
    .from("participants")
    .insert({ category_id: categoryId, group_id: groupId, name, birth_year: year, seed });

  if (error) {
    throw new Error(
      error.code === "23505"
        ? `Já existe um guarda-redes chamado "${name}" neste escalão.`
        : error.message,
    );
  }

  refreshEverything();
}

export async function renameParticipant(formData: FormData): Promise<void> {
  const participantId = Number(formData.get("participantId"));
  const name = String(formData.get("name") ?? "").trim();
  if (name === "") throw new Error("O guarda-redes precisa de um nome.");

  const supabase = await createClient();
  const { error } = await supabase.from("participants").update({ name }).eq("id", participantId);
  if (error) {
    throw new Error(
      error.code === "23505" ? `Já existe um guarda-redes chamado "${name}".` : error.message,
    );
  }

  refreshEverything();
}

/** Corrige o ano de nascimento (o escalão continua o mesmo). */
export async function setParticipantYear(formData: FormData): Promise<void> {
  const participantId = Number(formData.get("participantId"));
  const year = Number(formData.get("birthYear"));
  if (!Number.isFinite(year)) throw new Error("Ano de nascimento inválido.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("participants")
    .update({ birth_year: year })
    .eq("id", participantId);
  if (error) throw new Error(error.message);

  refreshEverything();
}

/**
 * Um guarda-redes que desistiu. Os jogos dele vão atrás — a base de dados
 * apaga-os em cascata — por isso o calendário do escalão tem de ser gerado
 * outra vez.
 */
export async function removeParticipant(formData: FormData): Promise<void> {
  const participantId = Number(formData.get("participantId"));
  const supabase = await createClient();
  const { error } = await supabase.from("participants").delete().eq("id", participantId);
  if (error) throw new Error(error.message);

  await reconcile();
  refreshEverything();
}

export async function setParticipantGroup(formData: FormData): Promise<void> {
  const participantId = Number(formData.get("participantId"));
  const raw = String(formData.get("groupId") ?? "");
  const groupId = raw === "" ? null : Number(raw);

  const supabase = await createClient();
  const { error } = await supabase
    .from("participants")
    .update({ group_id: groupId })
    .eq("id", participantId);
  if (error) throw new Error(error.message);

  refreshEverything();
}

/** Reparte os guarda-redes do escalão pelos grupos, como no documento. */
export async function balanceGroups(formData: FormData): Promise<void> {
  const categoryId = Number(formData.get("categoryId"));
  const { supabase, groups, participants } = await loadAll();

  const assignment = balancedAssignment(
    groups.filter((g) => g.category_id === categoryId),
    participants.filter((p) => p.category_id === categoryId),
  );

  for (const { participantId, groupId } of assignment) {
    const { error } = await supabase
      .from("participants")
      .update({ group_id: groupId })
      .eq("id", participantId);
    if (error) throw new Error(error.message);
  }

  refreshEverything();
}

/**
 * Ordem manual para um empate que nenhum critério resolve. Só se usa quando o
 * site marca os guarda-redes com "=", e a ordem é a que a organização decidir.
 */
export async function setTiebreakOrder(formData: FormData): Promise<void> {
  const ordered = String(formData.get("order") ?? "")
    .split(",")
    .map(Number)
    .filter((n) => Number.isFinite(n));

  const supabase = await createClient();
  for (const [index, participantId] of ordered.entries()) {
    const { error } = await supabase
      .from("participants")
      .update({ tiebreak_order: index + 1 })
      .eq("id", participantId);
    if (error) throw new Error(error.message);
  }

  await reconcile();
  refreshEverything();
}

export async function clearTiebreakOrder(formData: FormData): Promise<void> {
  const groupId = Number(formData.get("groupId"));
  const supabase = await createClient();
  const { error } = await supabase
    .from("participants")
    .update({ tiebreak_order: null })
    .eq("group_id", groupId);
  if (error) throw new Error(error.message);

  await reconcile();
  refreshEverything();
}

// ---------------------------------------------------------------------------
// Formato do escalão
// ---------------------------------------------------------------------------

const KNOCKOUTS: Knockout[] = ["none", "final", "semis"];

/**
 * O formato de um escalão: quantos grupos, quantas voltas, que eliminatória e
 * quantas balizas correm em simultâneo. Mudar o formato torna o calendário
 * velho, por isso os jogos desse escalão são apagados — a página avisa antes.
 * Se o número de grupos mudar, os grupos são refeitos e os guarda-redes voltam
 * a repartir-se.
 */
export async function setCategoryFormat(formData: FormData): Promise<void> {
  const categoryId = Number(formData.get("categoryId"));
  const groupCount = Number(formData.get("groupCount")) === 1 ? 1 : 2;
  const legs = Number(formData.get("legs")) === 2 ? 2 : 1;
  const knockoutRaw = String(formData.get("knockout"));
  const knockout: Knockout = KNOCKOUTS.includes(knockoutRaw as Knockout)
    ? (knockoutRaw as Knockout)
    : "none";

  const { supabase, categories, groups, participants } = await loadAll();
  const category = categories.find((c) => c.id === categoryId);
  if (!category) throw new Error("Escalão não encontrado.");

  // Cada campo tem uma só baliza: um jogo de cada vez no escalão.
  const upd = await supabase
    .from("categories")
    .update({
      group_count: groupCount,
      legs,
      knockout,
      baliza_count: 1,
    })
    .eq("id", categoryId);
  if (upd.error) throw new Error(upd.error.message);

  // O calendário deste escalão fica velho: apaga-se para se gerar de novo.
  const delMatches = await supabase.from("matches").delete().eq("category_id", categoryId);
  if (delMatches.error) throw new Error(delMatches.error.message);

  // Se o número de grupos mudar, refazem-se os grupos e reparte-se toda a gente.
  if (groupCount !== category.group_count) {
    const delGroups = await supabase.from("groups").delete().eq("category_id", categoryId);
    if (delGroups.error) throw new Error(delGroups.error.message);

    const names = groupCount === 2 ? ["A", "B"] : ["Única"];
    const insGroups = await supabase
      .from("groups")
      .insert(names.map((name) => ({ category_id: categoryId, name })))
      .select();
    if (insGroups.error) throw new Error(insGroups.error.message);

    const assignment = balancedAssignment(
      (insGroups.data ?? []) as Group[],
      participants.filter((p) => p.category_id === categoryId),
    );
    for (const { participantId, groupId } of assignment) {
      const { error } = await supabase
        .from("participants")
        .update({ group_id: groupId, tiebreak_order: null })
        .eq("id", participantId);
      if (error) throw new Error(error.message);
    }
  }

  refreshEverything();
}

// ---------------------------------------------------------------------------
// Calendário
// ---------------------------------------------------------------------------

/**
 * Gera o calendário de um escalão a partir dos grupos de agora. Apaga o que lá
 * estava, por isso os resultados desse escalão perdem-se — a página avisa antes.
 */
export async function generateSchedule(formData: FormData): Promise<void> {
  const categoryId = Number(formData.get("categoryId"));
  const { supabase, settings, categories, groups, participants } = await loadAll();

  const category = categories.find((c) => c.id === categoryId);
  if (!category) throw new Error("Escalão não encontrado.");

  const planned = buildCategorySchedule(
    category,
    groups.filter((g) => g.category_id === categoryId),
    participants.filter((p) => p.category_id === categoryId),
    new Date(settings.starts_at),
    settings.match_minutes,
  );
  if (planned.length === 0) {
    throw new Error("Este escalão não tem guarda-redes suficientes para gerar jogos.");
  }

  const del = await supabase.from("matches").delete().eq("category_id", categoryId);
  if (del.error) throw new Error(del.error.message);

  const ins = await supabase.from("matches").insert(planned);
  if (ins.error) throw new Error(ins.error.message);

  refreshEverything();
}

// ---------------------------------------------------------------------------
// A hora a que se começa mesmo
// ---------------------------------------------------------------------------

/**
 * Desloca o calendário inteiro para uma hora nova. Estava marcado para as 16:30,
 * arrancou às 16:45: os jogos todos andam esses 15 minutos para a frente e as
 * horas voltam a bater certo, sem regerar nada e sem perder resultados.
 */
async function shiftTo(start: Date): Promise<void> {
  const { supabase, settings, matches } = await loadAll();

  const earliest = matches.reduce<number | null>((acc, m) => {
    const t = new Date(m.starts_at).getTime();
    return acc === null || t < acc ? t : acc;
  }, null);

  // A âncora é o primeiro jogo se já houver calendário; senão, o início marcado.
  const anchor = earliest ?? new Date(settings.starts_at).getTime();
  const delta = start.getTime() - anchor;

  const setStart = await supabase
    .from("settings")
    .update({ starts_at: start.toISOString() })
    .eq("id", 1);
  if (setStart.error) throw new Error(setStart.error.message);

  for (const m of matches) {
    const when = new Date(new Date(m.starts_at).getTime() + delta).toISOString();
    const { error } = await supabase.from("matches").update({ starts_at: when }).eq("id", m.id);
    if (error) throw new Error(error.message);
  }

  refreshEverything();
}

/**
 * Muda quanto dura cada jogo e re-marca o calendário com esse compasso. A hora
 * de início fica na mesma; só o espaçamento entre jornadas é que muda. Serve
 * para acertar o dia — jogos mais curtos, torneio a acabar mais cedo.
 */
export async function setMatchMinutes(formData: FormData): Promise<void> {
  const minutes = Math.max(1, Math.min(60, Number(formData.get("minutes")) || 10));
  const { supabase, settings, matches } = await loadAll();

  const upd = await supabase.from("settings").update({ match_minutes: minutes }).eq("id", 1);
  if (upd.error) throw new Error(upd.error.message);

  const start = new Date(settings.starts_at).getTime();
  for (const m of matches) {
    const when = new Date(start + (m.round - 1) * minutes * 60_000).toISOString();
    const { error } = await supabase.from("matches").update({ starts_at: when }).eq("id", m.id);
    if (error) throw new Error(error.message);
  }

  refreshEverything();
}

/** "Começamos agora." Ao minuto certo, para as horas ficarem redondas. */
export async function startNow(): Promise<void> {
  const agora = new Date();
  agora.setSeconds(0, 0);
  await shiftTo(agora);
}

/**
 * Marcar a data e a hora de início à mão.
 *
 * É a data inteira, não só a hora: sem isto, se o início for movido para o dia
 * errado — carregar em "Começar agora" num dia de testes, por exemplo — não
 * havia forma de o repor pela mesa, e o torneio parecia estar a decorrer com
 * horas de atraso.
 */
export async function setStartTime(formData: FormData): Promise<void> {
  // O input datetime-local dá a hora do recinto, sem fuso: "2026-07-18T16:30".
  const quando = String(formData.get("datetime") ?? "").trim();
  const match = quando.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/);
  if (!match) throw new Error("Data e hora inválidas.");

  const alvo = new Date(`${quando}:00${lisbonOffset(new Date(`${quando}:00Z`))}`);
  if (Number.isNaN(alvo.getTime())) throw new Error("Data e hora inválidas.");

  await shiftTo(alvo);
}

/** O desvio de Lisboa naquele dia — em Julho é +01:00, mas não se adivinha. */
function lisbonOffset(reference: Date): string {
  const label = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    timeZoneName: "longOffset",
  })
    .formatToParts(reference)
    .find((p) => p.type === "timeZoneName")?.value;
  const match = label?.match(/GMT([+-]\d{2}:\d{2})/);
  return match ? match[1] : "+00:00";
}

// ---------------------------------------------------------------------------
// Limpar depois dos testes
// ---------------------------------------------------------------------------

/** Volta a pôr todos os jogos por decidir, sem tocar no calendário. */
export async function clearAllResults(): Promise<void> {
  const supabase = await createClient();

  const results = await supabase
    .from("matches")
    .update({ winner_participant_id: null, home_score: null, away_score: null })
    .gte("id", 0);
  if (results.error) throw new Error(results.error.message);

  // As eliminatórias tinham guarda-redes fixados a partir dos grupos: sem
  // resultados, esses lugares voltam a "1º Grupo A".
  const knockouts = await supabase
    .from("matches")
    .update({ home_participant_id: null, away_participant_id: null })
    .neq("stage", "group");
  if (knockouts.error) throw new Error(knockouts.error.message);

  const tiebreaks = await supabase
    .from("participants")
    .update({ tiebreak_order: null })
    .gte("id", 0);
  if (tiebreaks.error) throw new Error(tiebreaks.error.message);

  refreshEverything();
}

/** Apaga os jogos todos. Os guarda-redes e os grupos ficam. */
export async function deleteAllMatches(): Promise<void> {
  const supabase = await createClient();

  const del = await supabase.from("matches").delete().gte("id", 0);
  if (del.error) throw new Error(del.error.message);

  const tiebreaks = await supabase
    .from("participants")
    .update({ tiebreak_order: null })
    .gte("id", 0);
  if (tiebreaks.error) throw new Error(tiebreaks.error.message);

  refreshEverything();
}

/**
 * Estado inicial: sem jogos e com os guarda-redes repartidos como no documento.
 * Quem foi adicionado à mão continua cá, repartido pelo mesmo critério.
 */
export async function resetTournament(): Promise<void> {
  const { supabase, categories, groups, participants } = await loadAll();

  const del = await supabase.from("matches").delete().gte("id", 0);
  if (del.error) throw new Error(del.error.message);

  for (const category of categories) {
    const assignment = balancedAssignment(
      groups.filter((g) => g.category_id === category.id),
      participants.filter((p) => p.category_id === category.id),
    );
    for (const { participantId, groupId } of assignment) {
      const { error } = await supabase
        .from("participants")
        .update({ group_id: groupId, tiebreak_order: null })
        .eq("id", participantId);
      if (error) throw new Error(error.message);
    }
  }

  refreshEverything();
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/entrar");
}
