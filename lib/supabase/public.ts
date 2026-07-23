import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/** Falta configuração. Distingue-se da base de dados não responder. */
export class MissingSupabaseConfig extends Error {}

/**
 * O cliente do site público. Não lê cookies de propósito.
 *
 * Quem está no recinto a ver o placard não tem sessão nenhuma — lê o que as
 * políticas de leitura deixam ler, e mais nada. E como não toca em cookies, o
 * Next pode guardar a página em cache e servir o mesmo desenho a toda a gente,
 * em vez de a construir outra vez para cada telemóvel. Com centenas de pessoas
 * ao mesmo tempo, é a diferença entre uma consulta à base de dados e centenas.
 */
export function createPublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Sem isto, a falha aparece como "supabaseUrl is required" no meio de um
  // ficheiro compilado, e ninguém percebe o que fazer.
  if (!url || !key) {
    const emFalta = [
      !url && "NEXT_PUBLIC_SUPABASE_URL",
      !key && "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    ]
      .filter(Boolean)
      .join(" e ");

    throw new MissingSupabaseConfig(
      `Falta ${emFalta}. ` +
        "Na Vercel: Settings → Environment Variables, com os valores de " +
        "Supabase → Project Settings → API. Localmente: copia .env.example para " +
        ".env.local e preenche.",
    );
  }

  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
