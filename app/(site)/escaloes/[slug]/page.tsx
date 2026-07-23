import Link from "next/link";
import { notFound } from "next/navigation";
import { Bracket } from "@/components/bracket";
import { LiveRefresh } from "@/components/live-refresh";
import { StandingsTable } from "@/components/standings-table";
import { getBattle } from "@/lib/data";
import { timeLabel } from "@/lib/format";
import {
  championOf,
  computeStandings,
  isGroupComplete,
  qualifiersPerGroup,
  resolveAll,
} from "@/lib/tournament";
import type { ResolvedMatch } from "@/lib/types";

export const revalidate = 3;

export async function generateStaticParams() {
  try {
    const { categories } = await getBattle();
    return categories.map((c) => ({ slug: c.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { categories } = await getBattle();
  const category = categories.find((c) => c.slug === slug);
  return { title: category ? `Escalão ${category.name}` : "Escalão" };
}

function MatchRow({ match }: { match: ResolvedMatch }) {
  const winner = match.winner_participant_id;
  const decided = match.status === "finished";
  return (
    <li className="flex items-center gap-3 border-b border-chalk py-2 last:border-0">
      <span className="w-11 shrink-0 font-mono text-[0.6875rem] text-smoke">{timeLabel(match.starts_at)}</span>
      <span className="grid min-w-0 flex-1 grid-cols-[1fr_auto_1fr] items-baseline gap-2 text-sm">
        <span className={[decided && winner !== match.home.participantId ? "text-smoke" : "", winner === match.home.participantId ? "font-bold" : "", "truncate"].join(" ")}>
          {match.home.label}
        </span>
        <span className="shrink-0 font-mono text-[0.625rem] text-smoke">
          {match.home_score !== null ? `${match.home_score}–${match.away_score}` : "×"}
        </span>
        <span className={[decided && winner !== match.away.participantId ? "text-smoke" : "", winner === match.away.participantId ? "font-bold" : "", "truncate"].join(" ")}>
          {match.away.label}
        </span>
      </span>
      {match.status === "live" && (
        <span className="eyebrow flex shrink-0 items-center gap-1 text-spot">
          <span aria-hidden className="pulse-dot size-1.5 rounded-full bg-spot" /> Agora
        </span>
      )}
    </li>
  );
}

export default async function EscalaoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { settings, categories, groups, participants, matches } = await getBattle();

  const category = categories.find((c) => c.slug === slug);
  if (!category) notFound();

  const now = new Date();
  const cGroups = groups.filter((g) => g.category_id === category.id).sort((a, b) => a.name.localeCompare(b.name));
  const cMatches = matches.filter((m) => m.category_id === category.id);
  const resolved = resolveAll(matches, categories, groups, participants, now).filter((m) => m.category_id === category.id);
  const champion = championOf(category, groups, participants, matches);
  const qualifiers = qualifiersPerGroup(category);
  const anos = category.birth_year_min === category.birth_year_max ? `${category.birth_year_min}` : `${category.birth_year_min}–${category.birth_year_max}`;
  const grupoLabel = category.group_count === 1 ? "Poule única" : `${category.group_count} grupos`;
  const formato =
    category.knockout === "none"
      ? `Campeonato${category.legs === 2 ? " a 2 voltas" : ""}`
      : `${grupoLabel} · ${category.knockout === "semis" ? "meias-finais e final" : "final"}`;

  return (
    <>
      <LiveRefresh />
      <nav className="mb-3">
        <Link href="/escaloes" className="eyebrow text-smoke hover:text-ink">← Escalões</Link>
      </nav>

      <header className="flex items-center gap-4">
        <span className="numeral text-[clamp(3rem,14vw,4.5rem)]">{category.short_label}</span>
        <span>
          <h1 className="text-lg font-bold">Nascidos em {category.name}</h1>
          <p className="eyebrow mt-0.5 text-smoke">
            Campo {category.campo} · {anos} · {participants.filter((p) => p.category_id === category.id).length} guarda-redes
          </p>
          <p className="mt-0.5 text-xs text-smoke">{formato}</p>
        </span>
      </header>

      {champion && (
        <p className="mt-4 flex items-center gap-3 bg-ink p-3 text-paper">
          <span className="eyebrow shrink-0 text-gold">Campeão</span>
          <span className="truncate font-bold">{champion.name}</span>
        </p>
      )}

      {cMatches.length === 0 ? (
        <section className="mt-6">
          <p className="mb-2 border-l-2 border-chalk pl-3 text-sm text-smoke">
            O calendário ainda não foi gerado. Estes são os guarda-redes inscritos.
          </p>
          <div className={cGroups.length > 1 ? (cGroups.length >= 3 ? "grid gap-4 md:grid-cols-2 lg:grid-cols-3" : "grid gap-4 md:grid-cols-2") : ""}>
            {cGroups.map((group) => {
              const gp = participants
                .filter((p) => p.group_id === group.id)
                .sort((a, b) => (a.seed ?? 99) - (b.seed ?? 99));
              return (
                <div key={group.id} className="border border-chalk p-3">
                  {category.group_count > 1 && (
                    <p className="mb-2 text-sm font-bold">Grupo {group.name}</p>
                  )}
                  <ol className="divide-y divide-chalk">
                    {gp.map((p) => (
                      <li key={p.id} className="flex items-baseline gap-2 py-1.5">
                        <span className="w-5 shrink-0 font-mono text-[0.625rem] text-smoke">{p.seed}</span>
                        <span className="min-w-0 flex-1 truncate text-sm">{p.name}</span>
                        <span className="shrink-0 font-mono text-[0.625rem] text-smoke">{p.birth_year}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              );
            })}
          </div>
        </section>
      ) : (
        <>
          <section className="mt-6">
            <h2 className="eyebrow mb-2 text-smoke">Classificação</h2>
            <div className={cGroups.length > 1 ? (cGroups.length >= 3 ? "grid gap-4 md:grid-cols-2 lg:grid-cols-3" : "grid gap-4 md:grid-cols-2") : ""}>
              {cGroups.map((group) => {
                const gp = participants.filter((p) => p.group_id === group.id);
                const standings = computeStandings(gp, cMatches.filter((m) => m.group_id === group.id));
                const complete = isGroupComplete(group.id, cMatches);
                return (
                  <div key={group.id} className="border border-chalk p-3">
                    <p className="mb-2 flex items-baseline justify-between gap-2">
                      <span className="text-sm font-bold">
                        {category.group_count === 1 ? "Classificação" : `Grupo ${group.name}`}
                      </span>
                      {complete && <span className="eyebrow text-smoke">fechado</span>}
                    </p>
                    <StandingsTable standings={standings} qualifiers={qualifiers} complete={complete} />
                  </div>
                );
              })}
            </div>
          </section>

          {category.knockout !== "none" && (
            <section className="mt-6">
              <h2 className="eyebrow mb-2 text-smoke">Eliminatória</h2>
              <Bracket matches={resolved} />
            </section>
          )}

          <section className="mt-6">
            <h2 className="eyebrow mb-2 text-smoke">Todos os jogos</h2>
            <ul className="border border-chalk px-3">
              {[...resolved].sort((a, b) => a.starts_at.localeCompare(b.starts_at)).map((m) => (
                <MatchRow key={m.id} match={m} />
              ))}
            </ul>
          </section>
        </>
      )}

      <p className="mt-6 text-xs text-smoke">
        Cada vitória vale 3 pontos. Jogos de {settings.match_minutes} em {settings.match_minutes} minutos.
      </p>
    </>
  );
}
