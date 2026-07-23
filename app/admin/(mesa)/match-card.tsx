"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { clearResult, markStarted, postponeMatch, setResult, unmarkStarted } from "../actions";
import type { ResolvedMatch } from "@/lib/types";
import { timeLabel } from "@/lib/format";

function WinnerButton({
  participantId,
  label,
  selected,
  decided,
}: {
  participantId: number;
  label: string;
  selected: boolean;
  decided: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name="winnerParticipantId"
      value={participantId}
      disabled={pending}
      title={`Venceu ${label}`}
      className={[
        // Alvos grandes e afastados: enganar-se aqui dá trabalho a corrigir.
        "flex min-h-16 w-full items-center gap-2 border-2 px-3 py-2 text-left transition-colors",
        selected
          ? "border-ink bg-ink text-paper"
          : decided
            ? "border-chalk text-smoke hover:border-ink hover:text-ink"
            : "border-ink hover:bg-ink hover:text-paper",
        pending ? "opacity-40" : "",
      ].join(" ")}
    >
      <span className="min-w-0 flex-1 text-[0.9375rem] leading-tight font-bold break-words">
        {label}
      </span>
      {selected && (
        <span aria-hidden className="shrink-0 text-lg">
          ✓
        </span>
      )}
    </button>
  );
}

function SmallAction({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="eyebrow px-2 py-1.5 text-smoke hover:text-ink disabled:opacity-40"
    >
      {pending ? "…" : children}
    </button>
  );
}

/**
 * Uma decisão da mesa. O árbitro diz quem ganhou: clica-se no nome e está
 * gravado. O placard é opcional e está escondido, para não atrasar o caso
 * normal nem dar mais um sítio onde enganar-se.
 */
export function MatchCard({
  match,
  campoLabel,
  showBaliza,
}: {
  match: ResolvedMatch;
  campoLabel: string;
  showBaliza: boolean;
}) {
  const [showScore, setShowScore] = useState(
    match.home_score !== null || match.away_score !== null,
  );

  const decided = match.winner_participant_id !== null;
  const ready = match.home.participantId !== null && match.away.participantId !== null;

  return (
    <article
      className={[
        "flex flex-col border",
        decided ? "border-chalk" : "border-ink",
        !decided && match.status === "live" ? "border-t-4 border-t-spot" : "",
      ].join(" ")}
    >
      <header className="flex items-center gap-2 border-b border-chalk px-2.5 py-1.5">
        <span className="numeral text-xl leading-none">{campoLabel}</span>
        {showBaliza && <span className="eyebrow text-smoke">B{match.baliza}</span>}
        <span className="eyebrow text-smoke">{timeLabel(match.starts_at)}</span>
        {match.stage !== "group" ? (
          <span className="eyebrow ml-auto bg-ink px-1.5 py-0.5 text-paper">
            {match.stage === "final" ? "Final" : `Meia ${match.slot}`}
          </span>
        ) : decided ? (
          <span className="eyebrow ml-auto text-smoke">Guardado</span>
        ) : (
          match.status === "live" && (
            <span className="eyebrow ml-auto flex items-center gap-1 text-spot">
              <span aria-hidden className="pulse-dot size-1.5 rounded-full bg-spot" />
              A decorrer
            </span>
          )
        )}
      </header>

      <div className="p-2.5">
        {!ready ? (
          <p className="py-5 text-center text-sm text-smoke">
            À espera de {match.home.pending ? match.home.label : match.away.label}
          </p>
        ) : (
          <form action={setResult} className="space-y-2">
            <input type="hidden" name="matchId" value={match.id} />

            <WinnerButton
              participantId={match.home.participantId!}
              label={match.home.label}
              selected={match.winner_participant_id === match.home.participantId}
              decided={decided}
            />
            <WinnerButton
              participantId={match.away.participantId!}
              label={match.away.label}
              selected={match.winner_participant_id === match.away.participantId}
              decided={decided}
            />

            {showScore && (
              <div className="border-t border-chalk pt-2">
                <p className="eyebrow mb-1 text-smoke">
                  Penáltis marcados — depois clica no vencedor
                </p>
                <div className="flex items-center gap-2">
                  <input
                    name="homeScore"
                    type="number"
                    min={0}
                    inputMode="numeric"
                    defaultValue={match.home_score ?? ""}
                    aria-label={`Penáltis de ${match.home.label}`}
                    className="w-14 border border-chalk px-2 py-1.5 text-center font-mono text-base focus:border-ink focus:outline-none"
                  />
                  <span className="text-smoke">×</span>
                  <input
                    name="awayScore"
                    type="number"
                    min={0}
                    inputMode="numeric"
                    defaultValue={match.away_score ?? ""}
                    aria-label={`Penáltis de ${match.away.label}`}
                    className="w-14 border border-chalk px-2 py-1.5 text-center font-mono text-base focus:border-ink focus:outline-none"
                  />
                </div>
              </div>
            )}
          </form>
        )}
      </div>

      <footer className="mt-auto flex flex-wrap items-center gap-0.5 border-t border-chalk px-1 py-0.5">
        {ready && !showScore && !decided && (
          <button
            type="button"
            onClick={() => setShowScore(true)}
            className="eyebrow px-2 py-1.5 text-smoke transition-colors hover:text-ink"
          >
            + Resultado
          </button>
        )}

        {/* Opcional: só faz falta se a baliza arrancar antes da hora. Sem isto,
            o site percebe sozinho pelo horário. */}
        {!decided && ready && match.status !== "live" && (
          <form action={markStarted}>
            <input type="hidden" name="matchId" value={match.id} />
            <SmallAction>Já começou</SmallAction>
          </form>
        )}

        {!decided && match.started_at !== null && (
          <form action={unmarkStarted}>
            <input type="hidden" name="matchId" value={match.id} />
            <SmallAction>Afinal não</SmallAction>
          </form>
        )}

        {!decided && ready && (
          <form action={postponeMatch} className="ml-auto">
            <input type="hidden" name="matchId" value={match.id} />
            <SmallAction>Não chegou</SmallAction>
          </form>
        )}

        {decided && (
          <form action={clearResult} className="ml-auto">
            <input type="hidden" name="matchId" value={match.id} />
            <SmallAction>Apagar</SmallAction>
          </form>
        )}
      </footer>
    </article>
  );
}
