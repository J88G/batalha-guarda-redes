import { getBattle } from "@/lib/data";
import { blockingTie, computeStandings, qualifiersPerGroup } from "@/lib/tournament";
import { AddParticipant } from "./add-participant";
import { GroupBoard } from "./group-board";
import { TiebreakPanel } from "./tiebreak-panel";

export const dynamic = "force-dynamic";
export const metadata = { title: "Guarda-redes" };

export default async function GruposPage() {
  const { settings, categories, groups, participants, matches } = await getBattle();

  const matchCounts: Record<number, number> = {};
  for (const m of matches) {
    if (m.home_participant_id) matchCounts[m.home_participant_id] = (matchCounts[m.home_participant_id] ?? 0) + 1;
    if (m.away_participant_id) matchCounts[m.away_participant_id] = (matchCounts[m.away_participant_id] ?? 0) + 1;
  }

  return (
    <>
      <h1 className="numeral text-3xl uppercase">Guarda-redes</h1>
      <p className="mt-1 text-sm text-smoke">
        Cada guarda-redes está no escalão do seu ano de nascimento e nunca muda de escalão. Nos
        escalões com dois grupos, reparte-os pelos grupos. Depois de mexer, gera o calendário do
        escalão em Formato.
      </p>

      <div className="mt-5 space-y-8">
        {categories.map((category) => {
          const cGroups = groups.filter((g) => g.category_id === category.id);
          const cParticipants = participants.filter((p) => p.category_id === category.id);
          const played = matches.filter(
            (m) => m.category_id === category.id && m.winner_participant_id !== null,
          ).length;
          const qualifiers = qualifiersPerGroup(category);

          const tiedGroups = cGroups
            .map((group) => ({
              group,
              standings: computeStandings(
                participants.filter((p) => p.group_id === group.id),
                matches.filter((m) => m.group_id === group.id),
              ),
            }))
            .filter(({ standings }) => standings.some((s) => s.tiedUnresolved));

          const anos =
            category.birth_year_min === category.birth_year_max
              ? `${category.birth_year_min}`
              : `${category.birth_year_min}–${category.birth_year_max}`;

          return (
            <section key={category.id} aria-labelledby={`g-${category.slug}`}>
              <h2 id={`g-${category.slug}`} className="mb-2 flex flex-wrap items-baseline gap-3">
                <span className="numeral text-2xl">{category.short_label}</span>
                <span className="eyebrow text-smoke">
                  {cParticipants.length} GR · Campo {category.campo} · {anos} ·{" "}
                  {category.group_count === 1 ? "poule única" : "dois grupos"}
                </span>
              </h2>

              {played > 0 && (
                <p className="mb-2 border-l-2 border-spot px-3 py-1.5 text-xs text-smoke">
                  Este escalão já tem {played} {played === 1 ? "resultado" : "resultados"}. Mudar
                  os grupos obriga a gerar o calendário outra vez, e isso apaga-os.
                </p>
              )}

              <GroupBoard
                groups={cGroups}
                participants={cParticipants}
                matchCounts={matchCounts}
                matchMinutes={settings.match_minutes}
                startsAt={settings.starts_at}
                hasKnockout={category.knockout !== "none"}
              />

              <AddParticipant
                categoryId={category.id}
                groups={cGroups}
                yearMin={category.birth_year_min}
                yearMax={category.birth_year_max}
              />

              {tiedGroups.length > 0 && (
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {tiedGroups.map(({ group, standings }) => (
                    <div
                      key={group.id}
                      id={`desempate-${group.id}`}
                      className="scroll-mt-20 border border-spot p-3"
                    >
                      <p className="text-sm font-bold">
                        {category.group_count === 1 ? "Poule única" : `Grupo ${group.name}`}
                      </p>
                      <TiebreakPanel
                        groupId={group.id}
                        standings={standings}
                        blocking={blockingTie(standings, qualifiers)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}
