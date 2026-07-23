import Link from "next/link";
import { getBattle } from "@/lib/data";
import { dateLabel, timeLabel } from "@/lib/format";
import { POINTS_PER_WIN, qualifiersPerGroup, roundsFor } from "@/lib/tournament";
import type { Category } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Regras e dúvidas" };

function Seccao({
  id,
  titulo,
  children,
}: {
  id: string;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-t`} className="scroll-mt-20">
      <h2 id={`${id}-t`} className="numeral border-b-2 border-ink pb-1 text-xl uppercase">
        {titulo}
      </h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed">{children}</div>
    </section>
  );
}

function Regra({ termo, children }: { termo: string; children: React.ReactNode }) {
  return (
    <div className="border-l-2 border-chalk pl-3">
      <p className="text-sm font-bold">{termo}</p>
      <p className="mt-0.5 text-sm text-smoke">{children}</p>
    </div>
  );
}

function formatoLabel(c: Category): string {
  if (c.knockout === "none") return `Campeonato${c.legs === 2 ? " a 2 voltas" : ""}`;
  const base = c.group_count === 1 ? "poule única" : `${c.group_count} grupos`;
  const remate = c.knockout === "semis" ? "meias e final" : "final";
  return `${base} · ${remate}`;
}

/**
 * O que responder quando alguém pergunta.
 *
 * Os números não estão escritos à mão: saem do torneio que está na base de
 * dados, para esta página não poder mentir quando alguma coisa mudar.
 */
export default async function RegrasPage() {
  const { settings, categories, groups, participants, matches } = await getBattle();

  const start = settings.starts_at;
  const ultimo = matches.reduce<string | null>(
    (acc, m) => (acc === null || m.starts_at > acc ? m.starts_at : acc),
    null,
  );

  const porEscalao = categories.map((c) => {
    const cGroups = groups.filter((g) => g.category_id === c.id);
    const tamanhos = cGroups.map((g) => participants.filter((p) => p.group_id === g.id).length);
    const cMatches = matches.filter((m) => m.category_id === c.id);
    const fim = cMatches.reduce<string | null>(
      (acc, m) => (acc === null || m.starts_at > acc ? m.starts_at : acc),
      null,
    );
    return {
      c,
      tamanhos,
      jogosDeGrupo: tamanhos.map((n) => roundsFor(n, c.legs)),
      qualifiers: qualifiersPerGroup(c),
      fim,
    };
  });

  return (
    <>
      <h1 className="numeral text-3xl uppercase">Regras e dúvidas</h1>
      <p className="mt-1 text-sm text-smoke">
        Para consultar quando alguém perguntar. Os números vêm do torneio que está montado
        agora, não de um texto escrito à mão — se mudares o formato de um escalão, esta página
        muda.
      </p>

      <nav aria-label="Nesta página" className="mt-4 flex flex-wrap gap-x-3 gap-y-1">
        {[
          ["formato", "O formato"],
          ["antes", "Antes de começar"],
          ["durante", "Durante"],
          ["atrasos", "Atrasos"],
          ["empates", "Empates"],
          ["escaloes", "Escalão a escalão"],
        ].map(([id, label]) => (
          <a key={id} href={`#${id}`} className="eyebrow text-smoke hover:text-ink">
            {label}
          </a>
        ))}
      </nav>

      <div className="mt-6 space-y-8">
        <Seccao id="formato" titulo="O formato">
          <ul className="space-y-2">
            {[
              `Cada guarda-redes está no escalão do seu ano de nascimento e joga no campo desse escalão. Nunca muda de escalão.`,
              `Cada escalão tem o seu formato: um ou dois grupos, uma ou duas voltas, e por cima campeonato, só final, ou meias-finais e final.`,
              `Dentro de cada grupo é todos contra todos. Cada vitória vale ${POINTS_PER_WIN} pontos. Não há empates: o penálti resolve-se em morte súbita.`,
              `Onde há eliminatória, apuram-se os primeiros de cada grupo. Onde é campeonato, o 1º da tabela é o campeão.`,
              `Um campo pode ter mais do que uma baliza a jogar ao mesmo tempo — os jogos espalham-se por elas para o escalão acabar mais cedo.`,
            ].map((linha) => (
              <li key={linha} className="flex gap-2">
                <span aria-hidden className="shrink-0 text-chalk">
                  —
                </span>
                <span>{linha}</span>
              </li>
            ))}
          </ul>
          <p className="text-smoke">
            {participants.length} guarda-redes · {categories.length} escalões · {matches.length}{" "}
            jogos · {dateLabel(start)}, a partir das {timeLabel(start)}
            {ultimo && `, último jogo às ${timeLabel(ultimo)}`}. Cada jornada leva{" "}
            {settings.match_minutes} minutos.
          </p>
        </Seccao>

        <Seccao id="antes" titulo="Antes de começar">
          <Regra termo="Guarda-redes">
            Já vêm no escalão certo, pelo ano de nascimento, e nunca mudam de escalão. Em{" "}
            <Link href="/admin/grupos" className="underline underline-offset-2">
              Guarda-redes
            </Link>{" "}
            inscreves quem faltar e, nos escalões com dois grupos, arrasta-los entre o Grupo A e
            o Grupo B.
          </Regra>
          <Regra termo="Formato">
            Em{" "}
            <Link href="/admin/calendario" className="underline underline-offset-2">
              Formato
            </Link>
            , cada escalão escolhe quantos grupos, quantas voltas, que eliminatória e quantas
            balizas. Mudar o formato apaga o calendário desse escalão — o site pergunta antes.
          </Regra>
          <Regra termo="Porque é que um guarda-redes a mais custa tempo">
            Num todos-contra-todos os jogos crescem ao quadrado: 6 dão {roundsFor(6)} jogos, mas
            7 dão {roundsFor(7)}. Mais balizas no campo repartem esses jogos e o escalão acaba
            mais cedo.
          </Regra>
          <Regra termo="Calendário">
            Gera o de cada escalão em Formato. Só depois disto é que há jogos. Gerar outra vez
            apaga os resultados desse escalão — o site pergunta antes.
          </Regra>
        </Seccao>

        <Seccao id="durante" titulo="Durante">
          <p>
            Em <Link href="/admin" className="underline underline-offset-2">Resultados</Link>{" "}
            estão as balizas de cada campo, com o jogo que está a decorrer em cada uma. O árbitro
            diz quem ganhou, clicas no nome, e está feito. O site público actualiza-se em cerca
            de um segundo.
          </p>

          <Regra termo="O apito inicial">
            Estava marcado para as {timeLabel(start)} e só arrancaram mais tarde? Em Resultados,
            carrega em <strong>Começar agora</strong>. O calendário inteiro desloca-se, as horas
            voltam a bater certo e os resultados já registados ficam. Também dá para marcar uma
            hora à mão.
          </Regra>
          <Regra termo="O resultado em penáltis é opcional">
            Só o vencedor é obrigatório. Mas vale a pena registá-lo quando o souberes: sem golos
            não há diferença de golos, e um empate a pontos entre três guarda-redes pode ficar
            sem critério de desempate.
          </Regra>
          <Regra termo="Enganaste-te?">
            Clica no outro nome. A classificação e a eliminatória acertam-se sozinhas — e se o
            vencedor de uma meia deixar de fazer sentido, esse resultado é apagado em vez de
            ficar lá errado.
          </Regra>
          <Regra termo="Guarda-redes atrasado?">
            Carrega em <strong>Não chegou</strong>. O jogo troca de lugar com o seguinte daquela
            baliza. Se ainda não chegar, carregas outra vez.
          </Regra>
          <Regra termo="Todos os jogos">
            O torneio inteiro numa lista, para conferir e corrigir.
          </Regra>
        </Seccao>

        <Seccao id="atrasos" titulo="Atrasos">
          <p>
            O site <strong>não</strong> decide pelo relógio o que está a decorrer. Em cada
            baliza, o jogo a decorrer é o primeiro que ainda não tem vencedor. Como registas os
            vencedores à medida que acontecem, o site segue o campo real e absorve os atrasos
            sozinho. Depois compara a jornada real com a do horário e mostra o atraso estimado.
          </p>
        </Seccao>

        <Seccao id="empates" titulo="Empates sem desempate possível">
          <p>
            Se três guarda-redes ganharem um ao outro em ciclo e não houver penáltis, nada os
            separa — nenhum critério, e inventar uma ordem seria mentir. Nesse caso o site
            marca-os com <span className="font-mono font-bold text-spot">=</span>, congela o
            apuramento e pede a decisão à mesa (sorteio, penáltis extra, o que decidirem).
            Regista-se a ordem em Guarda-redes.
          </p>
          <ol className="space-y-1">
            {[
              `Pontos (${POINTS_PER_WIN} por vitória)`,
              "Confronto directo entre os empatados: pontos, depois diferença de golos, depois golos",
              "Diferença de golos no grupo",
              "Golos marcados no grupo",
              "Decisão da mesa",
            ].map((criterio, i) => (
              <li key={criterio} className="flex gap-2.5">
                <span className="w-4 shrink-0 font-mono text-[0.625rem] font-bold text-smoke">
                  {i + 1}º
                </span>
                <span>{criterio}</span>
              </li>
            ))}
          </ol>
        </Seccao>

        <Seccao id="escaloes" titulo="Escalão a escalão">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="eyebrow border-b border-chalk text-left text-smoke">
                  <th className="py-1.5 font-semibold">Escalão</th>
                  <th className="py-1.5 font-semibold">Campo</th>
                  <th className="py-1.5 font-semibold">Formato</th>
                  <th className="py-1.5 font-semibold">Grupos</th>
                  <th className="py-1.5 font-semibold">Jogos de grupo</th>
                  <th className="py-1.5 text-right font-semibold">Acaba</th>
                </tr>
              </thead>
              <tbody>
                {porEscalao.map(({ c, tamanhos, jogosDeGrupo, fim }) => (
                  <tr key={c.id} className="border-b border-chalk last:border-0">
                    <td className="py-2">
                      <span className="numeral text-base">{c.short_label}</span>
                    </td>
                    <td className="py-2 font-mono text-xs text-smoke">{c.campo}</td>
                    <td className="py-2 text-xs text-smoke">{formatoLabel(c)}</td>
                    <td className="py-2 font-mono text-xs text-smoke">
                      {tamanhos.join(" e ")} GR
                    </td>
                    <td className="py-2 font-mono text-xs text-smoke">
                      {jogosDeGrupo.join(" e ")}
                    </td>
                    <td className="py-2 text-right font-mono text-xs">
                      {fim ? timeLabel(fim) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Seccao>
      </div>

      <p className="mt-10 border-t border-chalk pt-4 text-xs text-smoke">
        Se alguma coisa aqui não bater certo com o que o site faz, o site é que manda — e avisa
        quem o fez.
      </p>
    </>
  );
}
