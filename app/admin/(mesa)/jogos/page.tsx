import { LiveRefresh } from "@/components/live-refresh";
import { getBattle } from "@/lib/data";
import { timeLabel } from "@/lib/format";
import { categoryProgress, resolveAll } from "@/lib/tournament";
import { MatchLine } from "./match-line";

export const dynamic = "force-dynamic";
export const metadata = { title: "Todos os jogos" };

export default async function JogosPage() {
  const { categories, groups, participants, matches } = await getBattle();
  const now = new Date();
  const resolved = resolveAll(matches, categories, groups, participants, now);
  const { currentRound } = categoryProgress(matches, now);

  const sortOf = (categoryId: number) =>
    categories.find((c) => c.id === categoryId)?.sort_order ?? 0;

  const rounds = [...new Set(matches.map((m) => m.round))].sort((a, b) => a - b);
  const decided = matches.filter((m) => m.winner_participant_id !== null).length;

  if (matches.length === 0) {
    return (
      <>
        <h1 className="numeral text-3xl uppercase">Todos os jogos</h1>
        <p className="mt-6 border border-chalk p-6 text-center text-sm text-smoke">
          Ainda não há calendário. Gera-o primeiro em Formato.
        </p>
      </>
    );
  }

  return (
    <>
      <LiveRefresh pollSeconds={45} />

      <h1 className="numeral text-3xl uppercase">Todos os jogos</h1>
      <p className="mt-1 text-sm text-smoke">
        O torneio inteiro, jornada a jornada. Os que ainda não aconteceram aparecem em branco.
        Serve para conferir — se algo estiver errado, abre o Editar dessa linha.
      </p>
      <p className="eyebrow mt-2 text-smoke">
        {decided} de {matches.length} jogos registados · {rounds.length} jornadas
      </p>

      <div className="mt-4 space-y-3">
        {rounds.map((round) => {
          const inRound = resolved
            .filter((m) => m.round === round)
            .sort((a, b) => sortOf(a.category_id) - sortOf(b.category_id) || a.baliza - b.baliza);
          const isNow = round === currentRound;
          const allDone = inRound.every((m) => m.winner_participant_id !== null);

          return (
            <section
              key={round}
              aria-labelledby={`j-${round}`}
              className={isNow ? "border-2 border-spot" : "border border-chalk"}
            >
              <h2
                id={`j-${round}`}
                className="flex items-baseline justify-between gap-2 border-b border-chalk px-2.5 py-1.5"
              >
                <span className="text-sm font-bold">
                  Jornada {round}
                  <span className="eyebrow ml-2 font-normal text-smoke">
                    {timeLabel(inRound[0].starts_at)}
                  </span>
                </span>
                <span className="eyebrow text-smoke">
                  {isNow && <span className="mr-2 text-spot">A decorrer</span>}
                  {allDone
                    ? "Completa"
                    : `${inRound.filter((m) => m.winner_participant_id !== null).length}/${inRound.length}`}
                </span>
              </h2>
              <ul>
                {inRound.map((m) => (
                  <MatchLine
                    key={m.id}
                    match={m}
                    category={categories.find((c) => c.id === m.category_id)}
                  />
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </>
  );
}
