import Link from "next/link";
import { LiveRefresh } from "@/components/live-refresh";
import { getBattle } from "@/lib/data";
import { dateTimeLabel, dateTimeLocalValue, timeLabel } from "@/lib/format";
import {
  blockingTie,
  categoryProgress,
  computeStandings,
  qualifiersPerGroup,
  resolveAll,
} from "@/lib/tournament";
import type { ResolvedMatch } from "@/lib/types";
import { MatchCard } from "./match-card";
import { StartCard } from "./start-card";

export const dynamic = "force-dynamic";
export const metadata = { title: "Resultados" };

export default async function AdminPage() {
  const { settings, categories, groups, participants, matches } = await getBattle();
  const now = new Date();
  const resolved = resolveAll(matches, categories, groups, participants, now);
  const { currentRound, expectedRound, totalRounds } = categoryProgress(matches, now);

  const campoOf = (categoryId: number) => categories.find((c) => c.id === categoryId);
  const shortOf = (categoryId: number) => campoOf(categoryId)?.short_label ?? "";
  const sortOf = (categoryId: number) => campoOf(categoryId)?.sort_order ?? 0;

  // Uma baliza física — campo + número — só tem um jogo de cada vez: é esse que
  // a mesa vai decidir.
  const balizaKey = (m: ResolvedMatch) => `${m.category_id}:${m.baliza}`;
  const toDecide = resolved
    .filter((m) => m.status === "live" || (m.status === "scheduled" && m.winner_participant_id === null))
    .reduce((acc, m) => {
      const held = acc.get(balizaKey(m));
      if (!held || m.starts_at < held.starts_at) acc.set(balizaKey(m), m);
      return acc;
    }, new Map<string, ResolvedMatch>());

  const open = [...toDecide.values()].sort(
    (a, b) => sortOf(a.category_id) - sortOf(b.category_id) || a.baliza - b.baliza,
  );
  const done = resolved
    .filter((m) => m.winner_participant_id !== null)
    .sort((a, b) => b.starts_at.localeCompare(a.starts_at) || sortOf(a.category_id) - sortOf(b.category_id))
    .slice(0, 8);

  // Empates que travam o apuramento: sem isto resolvido, as meias não avançam.
  const stuck = groups
    .map((group) => {
      const category = categories.find((c) => c.id === group.category_id);
      return {
        group,
        category,
        standings: computeStandings(
          participants.filter((p) => p.group_id === group.id),
          matches.filter((m) => m.group_id === group.id),
        ),
        qualifiers: category ? qualifiersPerGroup(category) : 0,
      };
    })
    .filter((g) => blockingTie(g.standings, g.qualifiers));

  const started = now.getTime() >= new Date(settings.starts_at).getTime();
  // Antes do apito, o "atraso" não quer dizer nada: os jogos podem estar
  // datados de um ensaio antigo. Só depois de começar é que faz sentido.
  const behind = started && currentRound !== null ? expectedRound - currentRound : 0;
  const lastAt = matches.reduce<string | null>(
    (acc, m) => (acc === null || m.starts_at > acc ? m.starts_at : acc),
    null,
  );

  if (matches.length === 0) {
    return (
      <>
        <h1 className="numeral text-3xl uppercase">Resultados</h1>
        <div className="mt-4 border border-ink p-5">
          <p className="font-bold">Ainda não há calendário.</p>
          <p className="mt-1 text-sm text-smoke">
            Confirma os guarda-redes e o formato, e depois gera o calendário de cada escalão.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/admin/grupos"
              className="bg-ink px-4 py-2.5 text-xs font-bold tracking-wide text-paper uppercase"
            >
              Ver guarda-redes
            </Link>
            <Link
              href="/admin/calendario"
              className="border border-ink px-4 py-2.5 text-xs font-bold tracking-wide uppercase"
            >
              Formato e calendário
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <LiveRefresh pollSeconds={45} />

      <header className="flex items-baseline justify-between gap-3">
        <h1 className="numeral text-3xl uppercase">Resultados</h1>
        <p className="eyebrow text-right text-smoke">
          {currentRound === null ? (
            "Torneio terminado"
          ) : (
            <>
              Jornada {currentRound} de {totalRounds}
              {behind > 0 && (
                <span className="mt-0.5 block text-spot">
                  ≈{behind * settings.match_minutes} min de atraso
                </span>
              )}
            </>
          )}
        </p>
      </header>

      <StartCard
        scheduledLabel={dateTimeLabel(settings.starts_at)}
        scheduledValue={dateTimeLocalValue(settings.starts_at)}
        matchMinutes={settings.match_minutes}
        lastLabel={lastAt ? timeLabel(lastAt) : null}
        started={started}
        hasResults={done.length > 0}
      />

      {stuck.length > 0 && (
        <section className="mt-4 border-l-4 border-spot bg-spot/5 p-3" aria-labelledby="empates">
          <h2 id="empates" className="text-sm font-bold">
            {stuck.length === 1 ? "Um grupo precisa" : `${stuck.length} grupos precisam`} de
            desempate
          </h2>
          <p className="mt-1 text-sm text-smoke">
            Nada separa os guarda-redes nos lugares de apuramento, por isso a eliminatória está à
            espera. Decidam os lugares e registem a ordem.
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {stuck.map(({ group, category }) => (
              <li key={group.id}>
                <Link
                  href={`/admin/grupos#grupo-${group.id}`}
                  className="inline-block border border-ink px-3 py-1.5 text-xs font-bold uppercase"
                >
                  {category?.short_label}
                  {category && category.group_count > 1 ? ` · Grupo ${group.name}` : ""}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-5" aria-labelledby="a-decidir">
        <h2 id="a-decidir" className="text-lg font-bold">
          Clica em quem ganhou
        </h2>
        <p className="mt-0.5 mb-2 text-sm text-smoke">
          Uma caixa por baliza, com o jogo que lá está a decorrer. Fica guardado logo e o site
          público actualiza-se sozinho. O resultado em penáltis é opcional.
        </p>
        {open.length === 0 ? (
          <p className="border border-chalk p-6 text-center text-sm text-smoke">
            Não há jogos à espera de resultado.
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {open.map((m) => (
              <MatchCard
                key={m.id}
                match={m}
                campoLabel={shortOf(m.category_id)}
                showBaliza={(campoOf(m.category_id)?.baliza_count ?? 1) > 1}
              />
            ))}
          </div>
        )}
      </section>

      {done.length > 0 && (
        <section className="mt-8" aria-labelledby="ultimos">
          <h2 id="ultimos" className="text-lg font-bold">
            Enganaste-te?
          </h2>
          <p className="mt-0.5 mb-2 text-sm text-smoke">
            Estes são os últimos que registaste. Clica no outro nome para corrigir — a
            classificação e a eliminatória acertam-se sozinhas.
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {done.map((m) => (
              <MatchCard
                key={m.id}
                match={m}
                campoLabel={shortOf(m.category_id)}
                showBaliza={(campoOf(m.category_id)?.baliza_count ?? 1) > 1}
              />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
