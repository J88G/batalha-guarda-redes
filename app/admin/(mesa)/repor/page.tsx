import Link from "next/link";
import { getBattle } from "@/lib/data";
import { dateLabel, timeLabel } from "@/lib/format";
import { ResetPanel } from "./reset-panel";

export const dynamic = "force-dynamic";
export const metadata = { title: "Repor" };

/**
 * As acções sem volta, numa página só delas.
 *
 * Estavam no fundo do Calendário, que é uma página sobre outra coisa. Apagar o
 * torneio não é um rodapé.
 */
export default async function ReporPage() {
  const { settings, participants, matches } = await getBattle();
  const decididos = matches.filter((m) => m.winner_participant_id !== null).length;

  return (
    <>
      <h1 className="numeral text-3xl uppercase">Repor</h1>
      <p className="mt-1 max-w-2xl text-sm text-smoke">
        Para limpar o que ficou dos ensaios e chegar ao dia {dateLabel(settings.starts_at)}{" "}
        com tudo em branco. Nenhuma destas acções tem volta.
      </p>

      <dl className="mt-5 grid gap-px border border-chalk bg-chalk sm:grid-cols-3">
        {[
          ["Guarda-redes", `${participants.length}`],
          ["Jogos no calendário", `${matches.length}`],
          ["Resultados registados", `${decididos}`],
        ].map(([termo, valor]) => (
          <div key={termo} className="bg-paper p-3">
            <dt className="eyebrow text-smoke">{termo}</dt>
            <dd className="numeral mt-1 text-2xl">{valor}</dd>
          </div>
        ))}
      </dl>

      <p className="eyebrow mt-2 text-smoke">
        O torneio está marcado para {dateLabel(settings.starts_at)} às{" "}
        {timeLabel(settings.starts_at)}
      </p>

      <ResetPanel matchCount={matches.length} resultCount={decididos} />

      <p className="mt-8 border-t border-chalk pt-4 text-sm text-smoke">
        Os guarda-redes nunca são apagados por aqui. Para tirar ou juntar guarda-redes, vai a{" "}
        <Link href="/admin/grupos" className="text-ink underline underline-offset-2">
          Guarda-redes
        </Link>
        .
      </p>
    </>
  );
}
