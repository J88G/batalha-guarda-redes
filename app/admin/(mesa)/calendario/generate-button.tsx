"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { generateSchedule } from "../../actions";
import { ConfirmDialog } from "@/components/confirm-dialog";

function Submit({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="shrink-0 border border-ink px-3 py-2 text-xs font-bold tracking-wide uppercase hover:bg-ink hover:text-paper disabled:cursor-not-allowed disabled:border-chalk disabled:text-smoke disabled:hover:bg-transparent"
    >
      {pending ? "A gerar…" : "Gerar"}
    </button>
  );
}

export function GenerateButton({
  categoryId,
  categoryName,
  disabled,
  playedCount,
}: {
  categoryId: number;
  categoryName: string;
  disabled: boolean;
  playedCount: number;
}) {
  const [confirming, setConfirming] = useState(false);
  const formId = `gerar-${categoryId}`;

  // Gerar apaga os jogos que lá estão. Sem resultados isso não custa nada, por
  // isso não vale a pena pôr uma pergunta no caminho.
  if (playedCount === 0) {
    return (
      <form action={generateSchedule}>
        <input type="hidden" name="categoryId" value={categoryId} />
        <span className="sr-only">Gerar calendário do escalão {categoryName}</span>
        <Submit disabled={disabled} />
      </form>
    );
  }

  return (
    <>
      <form action={generateSchedule} id={formId} className="hidden">
        <input type="hidden" name="categoryId" value={categoryId} />
      </form>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        disabled={disabled}
        className="shrink-0 border border-ink px-3 py-2 text-xs font-bold tracking-wide uppercase hover:bg-ink hover:text-paper disabled:cursor-not-allowed disabled:border-chalk disabled:text-smoke"
      >
        Gerar
      </button>
      <ConfirmDialog
        open={confirming}
        onCancel={() => setConfirming(false)}
        formId={formId}
        danger
        title="Apagar os resultados?"
        confirmLabel="Gerar na mesma"
        body={
          <>
            <p>
              O escalão {categoryName} já tem{" "}
              <span className="font-bold text-ink">
                {playedCount}{" "}
                {playedCount === 1 ? "resultado registado" : "resultados registados"}
              </span>
              .
            </p>
            <p>
              Gerar o calendário outra vez cria os jogos de raiz, por isso esses resultados
              perdem-se e não há como os recuperar.
            </p>
          </>
        }
      />
    </>
  );
}
