import { LiveRefresh } from "@/components/live-refresh";
import { getBattle } from "@/lib/data";
import { timeLabel } from "@/lib/format";
import { resolveAll } from "@/lib/tournament";
import type { Category, ResolvedMatch } from "@/lib/types";

export const revalidate = 3;
export const metadata = { title: "Calendário" };

function stageLabel(m: ResolvedMatch): string | null {
  if (m.stage === "final") return "Final";
  if (m.stage === "semi") return `Meia ${m.slot}`;
  return null;
}

function Cell({ match }: { match: ResolvedMatch }) {
  const winner = match.winner_participant_id;
  const decided = match.status === "finished";
  const stage = stageLabel(match);
  const line = (side: ResolvedMatch["home"], score: number | null) => (
    <span className="flex items-baseline justify-between gap-1">
      <span className={["truncate text-xs leading-tight", side.pending ? "text-smoke italic" : "", decided && winner !== side.participantId ? "text-smoke" : "", winner === side.participantId ? "font-bold" : ""].join(" ")}>
        {side.label}
      </span>
      {score !== null && <span className="font-mono text-[0.625rem] font-bold">{score}</span>}
    </span>
  );
  return (
    <div className={["flex flex-col gap-0.5 border border-chalk p-2", match.status === "live" ? "bg-ink text-paper" : "bg-paper"].join(" ")}>
      <span className="eyebrow mb-0.5 flex justify-between text-smoke">
        <span>{timeLabel(match.starts_at)}</span>
        {stage && <span className="text-spot">{stage}</span>}
      </span>
      {line(match.home, match.home_score)}
      {line(match.away, match.away_score)}
    </div>
  );
}

export default async function CalendarioPage() {
  const { categories, groups, participants, matches } = await getBattle();
  const now = new Date();
  const resolved = resolveAll(matches, categories, groups, participants, now);

  if (matches.length === 0) {
    return (
      <>
        <LiveRefresh />
        <h1 className="numeral text-[clamp(2rem,8vw,3rem)] uppercase">Calendário</h1>
        <p className="mt-6 border border-chalk p-6 text-center text-sm text-smoke">
          O calendário ainda não foi gerado.
        </p>
      </>
    );
  }

  return (
    <>
      <LiveRefresh />
      <h1 className="numeral text-[clamp(2rem,8vw,3rem)] uppercase">Calendário</h1>
      <p className="mt-1 text-sm text-smoke">Cada escalão no seu campo. A verde, o que está a decorrer.</p>

      <div className="mt-5 space-y-8">
        {categories.map((category) => (
          <CampoCalendar key={category.id} category={category} matches={resolved.filter((m) => m.category_id === category.id)} />
        ))}
      </div>
    </>
  );
}

function CampoCalendar({ category, matches }: { category: Category; matches: ResolvedMatch[] }) {
  const rounds = [...new Set(matches.map((m) => m.round))].sort((a, b) => a - b);
  return (
    <section aria-labelledby={`cal-${category.slug}`}>
      <h2 id={`cal-${category.slug}`} className="mb-2 flex items-baseline gap-2 border-b-2 border-ink pb-1">
        <span className="numeral text-xl">{category.short_label}</span>
        <span className="eyebrow text-smoke">Campo {category.campo}</span>
      </h2>
      <div className="space-y-2">
        {rounds.map((round) => {
          const inRound = matches.filter((m) => m.round === round).sort((a, b) => a.baliza - b.baliza);
          return (
            <div key={round}>
              <p className="eyebrow mb-1 text-smoke">Jornada {round} · {timeLabel(inRound[0].starts_at)}</p>
              <div className={`grid grid-cols-1 gap-2 sm:grid-cols-2 ${category.baliza_count >= 4 ? "lg:grid-cols-3" : ""}`}>
                {inRound.map((m) => (
                  <Cell key={m.id} match={m} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
