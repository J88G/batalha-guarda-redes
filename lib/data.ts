import { createPublicClient } from "./supabase/public";
import type { Category, Group, Match, Participant, Settings } from "./types";

export type Battle = {
  settings: Settings;
  categories: Category[];
  groups: Group[];
  participants: Participant[];
  matches: Match[];
};

const FALLBACK_SETTINGS: Settings = {
  id: 1,
  tournament_name: "Batalha de Guarda-Redes",
  venue: "RX Soccer Academy",
  starts_at: "2026-07-18T16:30:00+01:00",
  match_minutes: 10,
};

const EMPTY_BATTLE: Battle = {
  settings: FALLBACK_SETTINGS,
  categories: [],
  groups: [],
  participants: [],
  matches: [],
};

/**
 * Tudo o que o site precisa, de uma vez: escalões, grupos, guarda-redes e
 * jogos. São dezenas de linhas — cabem à vontade numa página, e assim a
 * classificação e o quadro saem do mesmo retrato.
 *
 * O build da Vercel constrói as páginas públicas antes de a base de dados estar
 * pronta (ou até antes de as variáveis existirem). Em produção, se algo faltar,
 * devolve-se o estado vazio — o site sobe na mesma e a revalidação enche-o
 * quando a base existir. Em desenvolvimento, o erro fica à vista, para se
 * corrigir logo a configuração.
 */
export async function getBattle(): Promise<Battle> {
  try {
    const supabase = createPublicClient();

    const [settings, categories, groups, participants, matches] = await Promise.all([
      supabase.from("settings").select("*").eq("id", 1).maybeSingle(),
      supabase.from("categories").select("*").order("sort_order"),
      supabase.from("groups").select("*").order("name"),
      supabase.from("participants").select("*").order("seed"),
      supabase.from("matches").select("*").order("starts_at"),
    ]);

    const failed = [settings, categories, groups, participants, matches].find((r) => r.error);
    if (failed?.error) {
      const semTabelas =
        failed.error.code === "PGRST205" ||
        /Could not find the table/i.test(failed.error.message);
      throw new Error(
        semTabelas
          ? "A base de dados do Supabase está vazia. Corre as migrações de supabase/migrations/ " +
            "(supabase db push, ou colando-as no SQL Editor)."
          : `Supabase: ${failed.error.message}`,
      );
    }

    return {
      settings: (settings.data as Settings | null) ?? FALLBACK_SETTINGS,
      categories: (categories.data as Category[]) ?? [],
      groups: (groups.data as Group[]) ?? [],
      participants: (participants.data as Participant[]) ?? [],
      matches: (matches.data as Match[]) ?? [],
    };
  } catch (err) {
    if (process.env.NODE_ENV !== "production") throw err;
    return EMPTY_BATTLE;
  }
}
