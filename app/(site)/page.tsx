import Link from "next/link";
import { GoalPanel } from "@/components/goal-panel";
import { LiveRefresh } from "@/components/live-refresh";
import { getBattle } from "@/lib/data";
import { dateLabel } from "@/lib/format";
import { championOf, resolveAll } from "@/lib/tournament";
import type { Category, ResolvedMatch } from "@/lib/types";

export const revalidate = 3;

/** O que mostrar nas balizas de um campo: o que está a decorrer, senão o que aí vem. */
function onBalizas(matches: ResolvedMatch[], balizaCount: number): (ResolvedMatch | undefined)[] {
  const live = matches.filter((m) => m.status === "live");
  let show = live;
  if (show.length === 0) {
    const scheduled = matches.filter((m) => m.status === "scheduled");
    if (scheduled.length > 0) {
      const nextRound = Math.min(...scheduled.map((m) => m.round));
      show = scheduled.filter((m) => m.round === nextRound);
    }
  }
  show = [...show].sort((a, b) => a.baliza - b.baliza).slice(0, balizaCount);
  return Array.from({ length: balizaCount }, (_, i) => show.find((m) => m.baliza === i + 1) ?? show[i]);
}

export default async function AgoraPage() {
  const { settings, categories, groups, participants, matches } = await getBattle();
  const now = new Date();
  const resolved = resolveAll(matches, categories, groups, participants, now);
  const hasSchedule = matches.length > 0;

  const champions = categories
    .map((c) => ({ category: c, champion: championOf(c, groups, participants, matches) }))
    .filter((x) => x.champion);

  return (
    <>
      <LiveRefresh />

      <section>
        <h1 className="numeral text-[clamp(2.75rem,13vw,5.5rem)] uppercase">
          Batalha de
          <br />
          <span className="text-spot">Guarda-Redes</span>
        </h1>
        <p className="mt-3 max-w-lg text-sm text-smoke">
          {dateLabel(settings.starts_at)} · {settings.venue} · {participants.length} guarda-redes em{" "}
          {categories.length} escalões
        </p>
      </section>

      {champions.length > 0 && (
        <section className="mt-6">
          <h2 className="eyebrow mb-2 text-smoke">Campeões</h2>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {champions.map(({ category, champion }) => (
              <li key={category.id} className="flex items-center gap-2.5 bg-ink p-2.5 text-paper">
                <span className="numeral shrink-0 text-xl text-gold">{category.short_label}</span>
                <span className="min-w-0">
                  <span className="eyebrow block text-paper/50">Campeão</span>
                  <span className="block truncate text-sm font-bold">{champion!.name}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!hasSchedule ? (
        <div className="mt-8 border border-chalk p-6 text-center">
          <p className="font-medium">O calendário ainda não foi gerado.</p>
          <p className="mt-1 text-sm text-smoke">Os jogos aparecem aqui assim que a mesa o gerar.</p>
          <Link href="/escaloes" className="mt-4 inline-block border border-ink px-4 py-2.5 text-xs font-bold tracking-wide uppercase hover:bg-ink hover:text-paper">
            Ver os escalões
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          {categories.map((category) => (
            <CampoRow
              key={category.id}
              category={category}
              matches={resolved.filter((m) => m.category_id === category.id)}
            />
          ))}
        </div>
      )}
    </>
  );
}

function CampoRow({ category, matches }: { category: Category; matches: ResolvedMatch[] }) {
  // Um campo, uma baliza: o jogo que lá está agora (ou o que aí vem).
  const [current] = onBalizas(matches, 1);

  return (
    <section aria-labelledby={`campo-${category.slug}`}>
      <h2 id={`campo-${category.slug}`} className="mb-1.5 flex items-baseline gap-2 border-b-2 border-ink pb-1">
        <span className="numeral text-xl">{category.short_label}</span>
        <span className="eyebrow text-smoke">Campo {category.campo}</span>
        <Link href={`/escaloes/${category.slug}`} className="eyebrow ml-auto text-smoke hover:text-ink">
          Classificação →
        </Link>
      </h2>
      <GoalPanel match={current} label="Baliza" />
    </section>
  );
}
