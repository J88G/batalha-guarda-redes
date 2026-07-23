import type { ResolvedMatch } from "@/lib/types";
import { timeLabel } from "@/lib/format";

function Side({ side, winnerId, decided }: {
  side: ResolvedMatch["home"];
  winnerId: number | null;
  decided: boolean;
}) {
  const won = winnerId !== null && winnerId === side.participantId;
  return (
    <div className="flex items-center gap-2 py-1.5">
      <span
        className={[
          "min-w-0 flex-1 truncate text-sm",
          side.pending ? "text-smoke italic" : "",
          decided && !won ? "text-smoke" : "",
          won ? "font-bold" : "",
        ].join(" ")}
      >
        {side.label}
      </span>
      {won && <span className="eyebrow shrink-0 bg-ink px-1 py-0.5 text-paper">Vence</span>}
    </div>
  );
}

function Tie({ match, title, strong = false }: { match: ResolvedMatch; title: string; strong?: boolean }) {
  return (
    <div className={strong ? "border-2 border-ink p-3" : "border border-chalk p-3"}>
      <p className="eyebrow mb-1 flex items-center justify-between gap-2 text-smoke">
        <span className={strong ? "text-ink" : ""}>{title}</span>
        <span>{timeLabel(match.starts_at)}</span>
      </p>
      <div className="divide-y divide-chalk">
        <Side side={match.home} winnerId={match.winner_participant_id} decided={match.status === "finished"} />
        <Side side={match.away} winnerId={match.winner_participant_id} decided={match.status === "finished"} />
      </div>
    </div>
  );
}

/** O quadro de eliminatórias de um escalão. */
export function Bracket({ matches }: { matches: ResolvedMatch[] }) {
  const semi1 = matches.find((m) => m.stage === "semi" && m.slot === 1);
  const semi2 = matches.find((m) => m.stage === "semi" && m.slot === 2);
  const final = matches.find((m) => m.stage === "final");
  if (!semi1 && !semi2 && !final) return null;

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {semi1 && <Tie match={semi1} title="Meia-final 1" />}
      {semi2 && <Tie match={semi2} title="Meia-final 2" />}
      {final && (
        <div className="sm:col-span-2">
          <Tie match={final} title="Final" strong />
        </div>
      )}
    </div>
  );
}
