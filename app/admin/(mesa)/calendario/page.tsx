import { getBattle } from "@/lib/data";
import { timeLabel } from "@/lib/format";
import { GenerateButton } from "./generate-button";
import { FormatPicker } from "./format-picker";

export const dynamic = "force-dynamic";
export const metadata = { title: "Formato" };

export default async function AdminCalendarioPage() {
  const { settings, categories, groups, participants, matches } = await getBattle();

  return (
    <>
      <h1 className="numeral text-3xl uppercase">Formato e calendário</h1>
      <p className="mt-1 text-sm text-smoke">
        Cada escalão tem o seu formato — quantos grupos, quantas voltas e que eliminatória. Cada
        campo tem uma baliza, por isso joga-se um jogo de cada vez. Depois gera-se o calendário.
        Começa às {timeLabel(settings.starts_at)} e cada jornada leva {settings.match_minutes}{" "}
        minutos.
      </p>

      <div className="mt-5 space-y-2">
        {categories.map((category) => {
          const cGroups = groups.filter((g) => g.category_id === category.id);
          const cMatches = matches.filter((m) => m.category_id === category.id);
          const played = cMatches.filter((m) => m.winner_participant_id !== null).length;
          const sizes = cGroups.map(
            (g) => participants.filter((p) => p.group_id === g.id).length,
          );
          const canGenerate =
            sizes.length === category.group_count && sizes.every((n) => n >= 2);

          const last = cMatches.reduce<string | null>(
            (acc, m) => (acc === null || m.starts_at > acc ? m.starts_at : acc),
            null,
          );

          const formato =
            category.knockout === "none"
              ? `Campeonato${category.legs === 2 ? " a 2 voltas" : ""}`
              : `${category.group_count === 1 ? "poule única" : `${category.group_count} grupos`} · ${
                  category.knockout === "semis" ? "meias e final" : "final"
                }`;

          return (
            <section
              key={category.id}
              className="border border-chalk p-3"
              aria-labelledby={`c-${category.slug}`}
            >
              <div className="flex flex-wrap items-center gap-3">
                <span className="numeral text-2xl">{category.short_label}</span>
                <span className="min-w-0 flex-1">
                  <h2 id={`c-${category.slug}`} className="text-sm font-bold">
                    Escalão {category.name} · Campo {category.campo}
                  </h2>
                  <p className="eyebrow mt-0.5 text-smoke">
                    {formato} ·{" "}
                    {cGroups
                      .map((g, i) =>
                        category.group_count === 1
                          ? `${sizes[i]} GR`
                          : `Grupo ${g.name}: ${sizes[i]}`,
                      )
                      .join(" · ")}
                  </p>
                </span>
                <GenerateButton
                  categoryId={category.id}
                  categoryName={category.name}
                  disabled={!canGenerate}
                  playedCount={played}
                />
              </div>

              {!canGenerate && (
                <p className="mt-2 text-xs text-spot">
                  {category.group_count === 1
                    ? "A poule precisa de pelo menos 2 guarda-redes."
                    : "Cada grupo precisa de pelo menos 2 guarda-redes."}
                </p>
              )}

              {cMatches.length > 0 && (
                <p className="mt-2 border-t border-chalk pt-2 text-xs text-smoke">
                  {cMatches.length} jogos · {played} decididos · último às{" "}
                  {last ? timeLabel(last) : "—"}
                </p>
              )}

              <FormatPicker category={category} playedCount={played} />
            </section>
          );
        })}
      </div>
    </>
  );
}
