"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { clearResult, setResult } from "../../actions";
import type { Category, ResolvedMatch } from "@/lib/types";
import { timeLabel } from "@/lib/format";

function PickButton({ participantId, label }: { participantId: number; label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name="winnerParticipantId"
      value={participantId}
      disabled={pending}
      className="border border-ink px-2.5 py-1.5 text-xs font-bold hover:bg-ink hover:text-paper disabled:opacity-40"
    >
      Venceu {label}
    </button>
  );
}

function Side({ side, winnerId, decided }: {
  side: ResolvedMatch["home"];
  winnerId: number | null;
  decided: boolean;
}) {
  const won = winnerId !== null && winnerId === side.participantId;
  return (
    <span
      className={[
        "truncate",
        side.pending ? "text-smoke italic" : "",
        decided && !won ? "text-smoke" : "",
        won ? "font-bold" : "",
      ].join(" ")}
    >
      {side.label}
    </span>
  );
}

/**
 * Uma linha da lista de todos os jogos. Serve para ler e conferir; a edição só
 * aparece quando é pedida, para a lista continuar a ler-se de um relance.
 */
export function MatchLine({
  match,
  category,
}: {
  match: ResolvedMatch;
  category: Category | undefined;
}) {
  const [editing, setEditing] = useState(false);
  const decided = match.winner_participant_id !== null;
  const ready = match.home.participantId !== null && match.away.participantId !== null;

  return (
    <li
      className={[
        "border-b border-chalk px-2 py-1.5 last:border-0",
        match.status === "live" && !decided ? "border-l-2 border-l-spot" : "",
      ].join(" ")}
    >
      <div className="flex items-center gap-2">
        <span className="numeral w-9 shrink-0 truncate text-center text-sm text-smoke">
          {category?.short_label}
        </span>
        <span className="w-10 shrink-0 font-mono text-[0.625rem] text-smoke">
          {timeLabel(match.starts_at)}
        </span>

        <span className="grid min-w-0 flex-1 grid-cols-[1fr_auto_1fr] items-baseline gap-2 text-sm">
          <Side side={match.home} winnerId={match.winner_participant_id} decided={decided} />
          <span className="shrink-0 font-mono text-[0.625rem] text-smoke">
            {match.home_score !== null ? `${match.home_score}–${match.away_score}` : "×"}
          </span>
          <Side side={match.away} winnerId={match.winner_participant_id} decided={decided} />
        </span>

        {match.stage !== "group" && (
          <span className="eyebrow shrink-0 bg-ink px-1 py-0.5 text-paper">
            {match.stage === "final" ? "Final" : `Meia ${match.slot}`}
          </span>
        )}

        <span className="eyebrow w-16 shrink-0 text-right">
          {decided ? (
            <span className="text-smoke">Guardado</span>
          ) : match.status === "live" ? (
            <span className="text-spot">A decorrer</span>
          ) : (
            <span className="text-chalk">Por jogar</span>
          )}
        </span>

        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          disabled={!ready}
          aria-expanded={editing}
          className="eyebrow w-12 shrink-0 px-1 py-1 text-right text-smoke hover:text-ink disabled:opacity-30"
        >
          {editing ? "Fechar" : "Editar"}
        </button>
      </div>

      {editing && ready && (
        <div className="mt-1.5 flex flex-wrap items-center gap-2 border-t border-chalk pt-2 pl-7">
          <form action={setResult} className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="matchId" value={match.id} />
            <PickButton participantId={match.home.participantId!} label={match.home.label} />
            <PickButton participantId={match.away.participantId!} label={match.away.label} />
            <span className="eyebrow text-smoke">Penáltis</span>
            <input
              name="homeScore"
              type="number"
              min={0}
              defaultValue={match.home_score ?? ""}
              aria-label={`Penáltis de ${match.home.label}`}
              className="w-12 border border-chalk px-1 py-1 text-center font-mono text-sm"
            />
            <span className="text-smoke">×</span>
            <input
              name="awayScore"
              type="number"
              min={0}
              defaultValue={match.away_score ?? ""}
              aria-label={`Penáltis de ${match.away.label}`}
              className="w-12 border border-chalk px-1 py-1 text-center font-mono text-sm"
            />
          </form>
          {decided && (
            <form action={clearResult} className="ml-auto">
              <input type="hidden" name="matchId" value={match.id} />
              <button type="submit" className="eyebrow px-2 py-1 text-smoke hover:text-spot">
                Apagar resultado
              </button>
            </form>
          )}
        </div>
      )}
    </li>
  );
}
