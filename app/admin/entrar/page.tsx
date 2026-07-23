import Image from "next/image";
import Link from "next/link";
import { getBattle } from "@/lib/data";
import { countdownLabel, dateLabel, timeLabel } from "@/lib/format";
import { categoryProgress } from "@/lib/tournament";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Entrar na mesa" };

/**
 * Quanto falta para o apito, dito por extenso.
 *
 * Quem abre esta página abre-a uma vez, sentado à mesa, pouco antes de o
 * torneio começar. É a única coisa que ali importa saber, por isso é ela que
 * está no cimo — e não uma frase de boas-vindas.
 */
function estadoDoTorneio(startsAt: string, currentRound: number | null, totalRounds: number) {
  const falta = new Date(startsAt).getTime() - Date.now();

  if (falta > 0) {
    const dias = Math.floor(falta / 86_400_000);
    if (dias >= 1) {
      return {
        titulo: `Faltam ${dias} ${dias === 1 ? "dia" : "dias"}`,
        detalhe: `O apito inicial é às ${timeLabel(startsAt)} de ${dateLabel(startsAt)}.`,
      };
    }
    return {
      titulo: `Faltam ${countdownLabel(falta)}`,
      detalhe: `O apito inicial é às ${timeLabel(startsAt)}.`,
      urgente: true,
    };
  }

  // A hora marcada já passou. Sem calendário, não terminou nada — ainda nem
  // começou: os jogos aparecem quando a mesa os gerar.
  if (totalRounds === 0) {
    return {
      titulo: "Ainda sem calendário",
      detalhe: "Gera os jogos de cada escalão e o torneio arranca.",
    };
  }

  if (currentRound === null) {
    return { titulo: "O torneio terminou", detalhe: "Já não há jogos por decidir." };
  }

  return {
    titulo: `Jornada ${currentRound} de ${totalRounds}`,
    detalhe: "O torneio está a decorrer. Há resultados à espera de ti.",
    urgente: true,
  };
}

export default async function EntrarPage({
  searchParams,
}: {
  searchParams: Promise<{ seguir?: string }>;
}) {
  const { seguir } = await searchParams;

  // O login tem de funcionar mesmo que a base de dados esteja em baixo: sem os
  // dados, mostra-se menos, mas a porta abre à mesma.
  let estado: ReturnType<typeof estadoDoTorneio> | null = null;
  let factos: string | null = null;
  let dataCurta: { dia: string; ano: string } | null = null;

  try {
    const { settings, categories, participants, matches } = await getBattle();
    const { currentRound, totalRounds } = categoryProgress(matches, new Date());
    estado = estadoDoTorneio(settings.starts_at, currentRound, totalRounds);
    factos = [
      `${participants.length} guarda-redes`,
      `${categories.length} escalões`,
      matches.length > 0 ? `${matches.length} jogos` : null,
    ]
      .filter(Boolean)
      .join(" · ");
    const d = new Date(settings.starts_at);
    dataCurta = {
      dia: d
        .toLocaleDateString("pt-PT", { timeZone: "Europe/Lisbon", day: "2-digit", month: "short" })
        .replace(".", "")
        .toUpperCase(),
      ano: d.toLocaleDateString("pt-PT", { timeZone: "Europe/Lisbon", year: "numeric" }),
    };
  } catch {
    estado = null;
  }

  return (
    // Sem esticar: um painel que ocupasse o ecrã todo ficava uma fita alta e
    // estreita com um buraco no meio. Isto é um objecto, e centra-se.
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-4 py-6">
      <div className="border border-chalk">
        {/* A mesma barra preta do site: entrar na mesa é entrar por uma porta
            do mesmo edifício, não aterrar noutro sítio qualquer. */}
        <header className="flex items-center gap-2.5 bg-ink px-4 py-3 text-paper">
          <Image
            src="/brand/rx-logo-paper.png"
            alt=""
            width={599}
            height={589}
            priority
            className="size-9 shrink-0"
          />
          <span className="flex flex-col leading-none">
            <span className="numeral text-base">BATALHA GR</span>
            <span className="eyebrow mt-0.5 text-paper/55">RX Soccer Academy</span>
          </span>
          {dataCurta && (
            <span className="ml-auto text-right font-mono text-[0.625rem] font-semibold tracking-widest text-paper/55">
              {dataCurta.dia}
              <br />
              {dataCurta.ano}
            </span>
          )}
        </header>

        <div className="p-4 sm:p-6">
          <h1 className="numeral text-[clamp(2.5rem,14vw,4rem)] uppercase">Mesa</h1>

          {estado ? (
            <div className="mt-2 border-t-2 border-ink pt-2">
              <p
                className={[
                  "font-mono text-lg font-bold tabular-nums",
                  estado.urgente ? "text-spot" : "",
                ].join(" ")}
              >
                {estado.titulo}
              </p>
              <p className="mt-0.5 text-sm text-smoke">{estado.detalhe}</p>
            </div>
          ) : (
            <p className="mt-2 border-t-2 border-ink pt-2 text-sm text-smoke">
              Batalha de Guarda-Redes · RX Soccer Academy
            </p>
          )}

          {/*
            A assinatura: o formulário está dentro da baliza. A baliza é o
            material de que este site é feito e para chegar à mesa põe-se isto
            na rede.
          */}
          <div className="goal-frame mt-5 px-4 pt-4 pb-4" data-state="empty">
            <LoginForm next={seguir ?? "/admin"} />
          </div>

          {factos && <p className="eyebrow mt-3 text-smoke">{factos}</p>}
        </div>

        <footer className="border-t border-chalk px-4 py-3">
          <p className="text-sm text-smoke">
            Só quem regista os resultados precisa de entrar.{" "}
            <Link
              href="/"
              className="font-medium text-ink underline underline-offset-2 transition-colors hover:text-spot"
            >
              Ver o placard do torneio
            </Link>
          </p>
        </footer>
      </div>
    </main>
  );
}
