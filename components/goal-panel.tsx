import type { ResolvedMatch } from "@/lib/types";
import { timeLabel } from "@/lib/format";

function Side({
  side,
  score,
  won,
  decided,
}: {
  side: ResolvedMatch["home"];
  score: number | null;
  won: boolean;
  decided: boolean;
}) {
  return (
    <div className="flex items-start gap-2">
      <span
        className={[
          "min-w-0 flex-1 text-[0.9375rem] leading-tight break-words",
          side.pending ? "text-smoke italic" : "",
          decided && !won ? "text-smoke" : "",
          won ? "font-bold" : "font-medium",
        ].join(" ")}
      >
        {side.label}
      </span>
      {score !== null && <span className="font-mono text-sm font-bold">{score}</span>}
    </div>
  );
}

function stageLabel(m: ResolvedMatch): string | null {
  if (m.stage === "final") return "Final";
  if (m.stage === "semi") return `Meia ${m.slot}`;
  return null;
}

/**
 * Uma baliza do campo: o jogo que lá está agora. `label` diz que baliza é
 * (útil quando o campo tem mais do que uma).
 */
export function GoalPanel({ match, label }: { match: ResolvedMatch | undefined; label?: string }) {
  const live = match?.status === "live";
  const finished = match?.status === "finished";
  const winner = match?.winner_participant_id ?? null;
  const stage = match ? stageLabel(match) : null;

  return (
    <article className="flex h-full flex-col border border-chalk bg-paper">
      <header className="flex items-center justify-between gap-1.5 border-b border-chalk px-2.5 py-1.5">
        <span className="eyebrow text-smoke">{label ?? "Baliza"}</span>
        {stage && <span className="eyebrow bg-ink px-1.5 py-0.5 text-paper">{stage}</span>}
      </header>

      <div className="flex flex-1 flex-col p-2.5">
        {match ? (
          <div className={live ? "text-spot" : "text-ink"}>
            <div
              className="goal-frame px-2.5 pt-2.5 pb-3.5"
              data-state={match.status === "scheduled" ? "scheduled" : match.status === "live" ? "live" : "free"}
            >
              <div className="space-y-1.5 text-ink">
                <Side side={match.home} score={match.home_score} won={winner === match.home.participantId} decided={finished} />
                <Side side={match.away} score={match.away_score} won={winner === match.away.participantId} decided={finished} />
              </div>
            </div>
          </div>
        ) : (
          <p className="py-6 text-center text-sm text-smoke">Sem jogo agora</p>
        )}

        {match && (
          <p className="eyebrow mt-2.5 flex items-center gap-1.5">
            {live && (
              <>
                <span aria-hidden className="pulse-dot size-1.5 rounded-full bg-spot" />
                <span className="text-spot">A decorrer</span>
              </>
            )}
            {finished && <span className="text-smoke">Terminado</span>}
            {match.status === "scheduled" && (
              <span className="text-smoke">Começa às {timeLabel(match.starts_at)}</span>
            )}
          </p>
        )}
      </div>
    </article>
  );
}
