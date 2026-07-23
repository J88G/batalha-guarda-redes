"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { setStartTime, startNow } from "../actions";
import { ConfirmDialog } from "@/components/confirm-dialog";

function SaveTime() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="border border-ink px-3 py-2 text-xs font-bold tracking-wide uppercase transition-colors hover:bg-ink hover:text-paper disabled:opacity-50"
    >
      {pending ? "…" : "Mudar"}
    </button>
  );
}

/**
 * O apito inicial.
 *
 * O torneio estava marcado para as 16:30 e arranca às 16:45. Sem isto, as horas
 * ficavam quinze minutos mentirosas até à final, e a única forma de as corrigir
 * era gerar o calendário outra vez — apagando tudo. Aqui, o calendário anda
 * inteiro para a frente e os resultados ficam.
 */
export function StartCard({
  scheduledLabel,
  scheduledValue,
  matchMinutes,
  lastLabel,
  started,
  hasResults,
}: {
  /** A data e hora de início, por extenso: "18 de julho · 16:30". */
  scheduledLabel: string;
  /** A mesma, no formato do input datetime-local: "2026-07-18T16:30". */
  scheduledValue: string;
  matchMinutes: number;
  lastLabel: string | null;
  started: boolean;
  hasResults: boolean;
}) {
  const [confirming, setConfirming] = useState(false);

  return (
    <section
      className={[
        "mt-4 p-4",
        started ? "border border-chalk" : "border-2 border-ink",
      ].join(" ")}
      aria-labelledby="apito"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 id="apito" className="text-lg font-bold">
            {started ? "O torneio começou" : "Ainda não começou"}
          </h2>
          <p className="mt-0.5 text-sm text-smoke">
            {started ? (
              <>
                Arrancou a <span className="font-bold text-ink">{scheduledLabel}</span>. As
                jornadas são de {matchMinutes} em {matchMinutes} minutos
                {lastLabel && <> e o último jogo está marcado para as {lastLabel}</>}.
              </>
            ) : (
              <>
                Está marcado para <span className="font-bold text-ink">{scheduledLabel}</span>.
                Se arrancarem mais tarde, carrega em Começar agora e as horas todas acertam-se.
              </>
            )}
          </p>
        </div>

        {!started && (
          <>
            <form action={startNow} id="apito-agora" className="hidden" />
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="bg-spot px-5 py-3.5 text-sm font-bold tracking-wide text-paper uppercase transition-transform active:scale-[0.98]"
            >
              Começar agora
            </button>
          </>
        )}
      </div>

      <form action={setStartTime} className="mt-3 flex flex-wrap items-center gap-2 border-t border-chalk pt-3">
        <label htmlFor="inicio" className="eyebrow text-smoke">
          {started ? "Corrigir a data e hora de início" : "Ou marcar para outra data e hora"}
        </label>
        <input
          id="inicio"
          name="datetime"
          type="datetime-local"
          required
          defaultValue={scheduledValue}
          className="border border-chalk px-2 py-1.5 font-mono text-sm focus:border-ink focus:outline-none"
        />
        <SaveTime />
        <span className="text-xs text-smoke">
          Move o calendário inteiro. Os resultados já registados ficam.
        </span>
      </form>

      <ConfirmDialog
        open={confirming}
        onCancel={() => setConfirming(false)}
        formId="apito-agora"
        title="Dar início ao torneio?"
        confirmLabel="Começar agora"
        body={
          <>
            <p>
              A primeira jornada passa a ser agora, e as seguintes seguem de {matchMinutes} em{" "}
              {matchMinutes} minutos a partir daqui.
            </p>
            <p>
              O calendário move-se todo em bloco
              {hasResults && " e os resultados já registados ficam onde estão"}. Podes corrigir
              a hora depois, se for preciso.
            </p>
          </>
        }
      />
    </section>
  );
}
