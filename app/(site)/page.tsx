import Link from "next/link";
import { GoalPanel } from "@/components/goal-panel";
import { LiveRefresh } from "@/components/live-refresh";
import { getBattle } from "@/lib/data";
import { dateLabel } from "@/lib/format";
import { championOf, physicalCampo, resolveAll } from "@/lib/tournament";
import type { Category, ResolvedMatch } from "@/lib/types";

export const revalidate = 3;

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
        <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {[...categories]
            .sort((a, b) => a.campo - b.campo)
            .map((owner) => (
              <CampoRow key={owner.campo} owner={owner} resolved={resolved} categories={categories} />
            ))}
        </div>
      )}
    </>
  );
}

function CampoRow({
  owner,
  resolved,
  categories,
}: {
  owner: Category;
  resolved: ResolvedMatch[];
  categories: Category[];
}) {
  // O jogo que está neste campo físico agora — pode ser do escalão dono do campo
  // ou um emprestado de outro. Senão, o que aí vem.
  const here = resolved.filter((m) => physicalCampo(m, categories) === owner.campo);
  const current =
    here.find((m) => m.status === "live") ??
    here
      .filter((m) => m.status === "scheduled")
      .sort((a, b) => a.round - b.round || a.starts_at.localeCompare(b.starts_at))[0];

  const playing = current ? categories.find((c) => c.id === current.category_id) : undefined;
  const borrowed = current?.campo != null && playing?.id !== owner.id;
  const label = playing ?? owner;

  return (
    <section aria-labelledby={`campo-${owner.campo}`} className="flex h-full flex-col">
      <h2 id={`campo-${owner.campo}`} className="mb-1.5 flex items-baseline gap-2 border-b-2 border-ink pb-1">
        <span className="numeral text-xl">{label.short_label}</span>
        <span className="eyebrow text-smoke">Campo {owner.campo}</span>
        <Link href={`/escaloes/${label.slug}`} className="eyebrow ml-auto text-smoke hover:text-ink">
          Classificação →
        </Link>
      </h2>
      <GoalPanel match={current} label={borrowed ? "Baliza emprestada" : "Baliza"} />
    </section>
  );
}
