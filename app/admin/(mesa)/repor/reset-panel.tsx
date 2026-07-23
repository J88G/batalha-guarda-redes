"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { clearAllResults, deleteAllMatches, resetTournament } from "../../actions";
import { ConfirmDialog } from "@/components/confirm-dialog";

type Kind = "resultados" | "calendario" | "tudo" | null;

function Trigger({
  onClick,
  children,
  detalhe,
}: {
  onClick: () => void;
  children: React.ReactNode;
  detalhe: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="flex h-full flex-col items-start gap-1 border border-chalk p-3 text-left transition-colors hover:border-spot disabled:opacity-40"
    >
      <span className="text-sm font-bold">{children}</span>
      <span className="text-xs text-smoke">{detalhe}</span>
    </button>
  );
}

/**
 * Limpar depois de ensaiar. São acções sem volta, por isso cada uma diz ao
 * certo o que apaga e o que deixa ficar.
 */
export function ResetPanel({
  matchCount,
  resultCount,
}: {
  matchCount: number;
  resultCount: number;
}) {
  const [asking, setAsking] = useState<Kind>(null);
  const close = () => setAsking(null);

  return (
    <section className="mt-6" aria-labelledby="repor">
      <h2 id="repor" className="sr-only">
        Acções
      </h2>
      <div className="grid gap-2 sm:grid-cols-3">
        <form action={clearAllResults} id="repor-resultados" className="contents">
          <Trigger onClick={() => setAsking("resultados")} detalhe="Os jogos voltam a ficar por decidir. O calendário fica.">Apagar resultados</Trigger>
        </form>
        <form action={deleteAllMatches} id="repor-calendario" className="contents">
          <Trigger onClick={() => setAsking("calendario")} detalhe="Apaga os jogos todos. Os guarda-redes e os grupos ficam.">Apagar calendário</Trigger>
        </form>
        <form action={resetTournament} id="repor-tudo" className="contents">
          <Trigger onClick={() => setAsking("tudo")} detalhe="Sem jogos, e os guarda-redes repartidos como no documento.">Repor tudo de início</Trigger>
        </form>
      </div>

      <ConfirmDialog
        open={asking === "resultados"}
        onCancel={close}
        formId="repor-resultados"
        danger
        title="Apagar os resultados?"
        confirmLabel="Apagar resultados"
        body={
          <>
            <p>
              Os {resultCount} resultados registados são apagados e todos os jogos voltam a
              ficar por decidir.
            </p>
            <p>O calendário, os guarda-redes e os grupos ficam como estão.</p>
          </>
        }
      />

      <ConfirmDialog
        open={asking === "calendario"}
        onCancel={close}
        formId="repor-calendario"
        danger
        title="Apagar o calendário?"
        confirmLabel="Apagar calendário"
        body={
          <>
            <p>
              Os {matchCount} jogos são apagados, com os resultados que tiverem. Fica sem
              calendário até o gerares outra vez.
            </p>
            <p>Os guarda-redes e os grupos ficam como estão.</p>
          </>
        }
      />

      <ConfirmDialog
        open={asking === "tudo"}
        onCancel={close}
        formId="repor-tudo"
        danger
        title="Repor tudo de início?"
        confirmLabel="Repor tudo"
        body={
          <>
            <p>Apaga os {matchCount} jogos e volta a repartir os guarda-redes pelos grupos como no documento — ímpares no Grupo A, pares no Grupo B.</p>
            <p>
              Os guarda-redes que tenhas adicionado ou renomeado continuam cá, repartidos pelo
              mesmo critério.
            </p>
          </>
        }
      />
    </section>
  );
}
