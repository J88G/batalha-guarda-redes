import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AdminNav } from "./admin-nav";
import { signOut } from "../actions";

export const metadata = { title: "Mesa" };

/**
 * Quem está aqui dentro, e se pode gravar.
 *
 * Entrar no site e poder gravar são coisas diferentes: só quem está na tabela
 * `admins` escreve. Mostrar o email — e avisar quando a conta não é da mesa —
 * torna isso visível de relance, em vez de aparecer como um erro de gravação a
 * meio do dia.
 */
async function quemEsta() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.from("admins").select("user_id").eq("user_id", user.id).maybeSingle();
  return { email: user.email ?? "?", podeGravar: data !== null };
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const conta = await quemEsta();

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-ink bg-ink text-paper">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-2.5">
          <Link href="/admin" className="numeral text-base">
            MESA
          </Link>
          <span className="eyebrow hidden text-paper/50 sm:inline">Batalha de Guarda-Redes</span>
          {conta && (
            <span className="eyebrow ml-auto truncate text-paper/55" title={conta.email}>
              {conta.email}
            </span>
          )}
          <form action={signOut} className={conta ? "" : "ml-auto"}>
            <button type="submit" className="eyebrow shrink-0 text-paper/60 hover:text-paper">
              Sair
            </button>
          </form>
        </div>
      </header>

      {/* A conta entrou mas não é da mesa: toda a gravação vai falhar. Diz-se já,
          em cima, em vez de deixar rebentar no primeiro clique. */}
      {conta && !conta.podeGravar && (
        <div className="border-b border-spot bg-spot/5">
          <div className="mx-auto max-w-4xl px-4 py-2 text-sm">
            <span className="font-bold">Esta conta não pode gravar.</span>{" "}
            <span className="text-smoke">
              A conta {conta.email} não está na lista da mesa, por isso registar resultados vai
              falhar. Entra com uma conta da mesa, ou adiciona esta à tabela{" "}
              <code className="font-mono text-ink">admins</code> no Supabase.
            </span>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-4xl px-4">
        <AdminNav />
      </div>

      <main className="mx-auto max-w-4xl px-4 pt-4 pb-24">{children}</main>

      <p className="mx-auto max-w-4xl px-4 pb-8 text-center">
        <Link href="/" className="eyebrow text-smoke hover:text-ink">
          Ver o site público →
        </Link>
      </p>
    </div>
  );
}
