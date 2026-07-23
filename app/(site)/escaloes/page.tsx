import Link from "next/link";
import { LiveRefresh } from "@/components/live-refresh";
import { getBattle } from "@/lib/data";
import { championOf } from "@/lib/tournament";

export const revalidate = 3;
export const metadata = { title: "Escalões" };

export default async function EscaloesPage() {
  const { categories, groups, participants, matches } = await getBattle();

  return (
    <>
      <LiveRefresh />
      <h1 className="numeral text-[clamp(2rem,8vw,3rem)] uppercase">Escalões</h1>
      <p className="mt-1 text-sm text-smoke">
        Cinco escalões por ano de nascimento, um campo cada. Cada guarda-redes joga no seu.
      </p>

      <ul className="mt-5 grid gap-2 sm:grid-cols-2">
        {categories.map((category) => {
          const count = participants.filter((p) => p.category_id === category.id).length;
          const champion = championOf(category, groups, participants, matches);
          const anos =
            category.birth_year_min === category.birth_year_max
              ? `${category.birth_year_min}`
              : `${category.birth_year_min}–${category.birth_year_max}`;
          const formato =
            category.knockout === "none"
              ? `Campeonato${category.legs === 2 ? " · 2 voltas" : ""}`
              : `${category.group_count === 1 ? "poule única" : `${category.group_count} grupos`} · ${category.knockout === "semis" ? "meias e final" : "final"}`;

          return (
            <li key={category.id}>
              <Link
                href={`/escaloes/${category.slug}`}
                className="group flex h-full items-center gap-4 border border-chalk p-4 transition-colors hover:border-ink"
              >
                <span className="numeral shrink-0 text-[2.75rem] group-hover:text-spot">{category.short_label}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold">Nascidos em {category.name}</span>
                  <span className="eyebrow mt-1 block text-smoke">Campo {category.campo} · {anos} · {count} GR</span>
                  <span className="mt-1 block text-xs text-smoke">{formato}</span>
                  {champion && (
                    <span className="mt-2 flex items-center gap-1.5">
                      <span className="eyebrow text-gold">Campeão</span>
                      <span className="truncate text-sm font-bold">{champion.name}</span>
                    </span>
                  )}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
