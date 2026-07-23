import type { Standing } from "@/lib/types";

/**
 * A classificação de uma poule. Os `qualifiers` primeiros passam à eliminatória
 * (0 num campeonato, onde a tabela decide tudo).
 */
export function StandingsTable({
  standings,
  qualifiers,
  complete,
}: {
  standings: Standing[];
  qualifiers: number;
  complete: boolean;
}) {
  const anyScores = standings.some((s) => s.scored > 0 || s.conceded > 0);

  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="eyebrow border-b border-chalk text-smoke">
          <th scope="col" className="w-6 py-1.5 text-left font-semibold">#</th>
          <th scope="col" className="py-1.5 text-left font-semibold">Guarda-redes</th>
          <th scope="col" className="w-8 py-1.5 text-center font-semibold">J</th>
          <th scope="col" className="w-8 py-1.5 text-center font-semibold">V</th>
          <th scope="col" className="w-8 py-1.5 text-center font-semibold">D</th>
          {anyScores && <th scope="col" className="w-10 py-1.5 text-center font-semibold">Dif</th>}
          <th scope="col" className="w-9 py-1.5 text-right font-semibold">Pts</th>
        </tr>
      </thead>
      <tbody>
        {standings.map((s) => {
          const qualifies = qualifiers > 0 && s.position <= qualifiers;
          return (
            <tr
              key={s.participantId}
              className={[
                "border-b border-chalk last:border-0",
                qualifies ? "font-medium" : "text-smoke",
              ].join(" ")}
            >
              <td className="py-2">
                <span
                  className={[
                    "flex size-5 items-center justify-center font-mono text-[0.625rem] font-bold",
                    qualifies && complete ? "bg-ink text-paper" : "",
                    qualifies && !complete ? "border border-ink text-ink" : "",
                  ].join(" ")}
                >
                  {s.position}
                </span>
              </td>
              <td className="py-2 pr-2">
                <span className="flex items-center gap-1.5">
                  <span className="truncate">{s.name}</span>
                  {s.tiedUnresolved && (
                    <span
                      title="Empatado — falta desempatar"
                      className="shrink-0 font-mono text-[0.625rem] font-bold text-spot"
                    >
                      =
                    </span>
                  )}
                </span>
              </td>
              <td className="py-2 text-center font-mono text-xs">{s.played}</td>
              <td className="py-2 text-center font-mono text-xs">{s.wins}</td>
              <td className="py-2 text-center font-mono text-xs">{s.losses}</td>
              {anyScores && (
                <td className="py-2 text-center font-mono text-xs">
                  {s.diff > 0 ? `+${s.diff}` : s.diff}
                </td>
              )}
              <td className="py-2 text-right font-mono text-sm font-bold text-ink">{s.points}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
