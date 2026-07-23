"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * A rede de segurança da mesa.
 *
 * Uma gravação que corre mal não pode deitar abaixo a página com um ecrã de
 * crash — no dia 18, quem está a registar resultados precisa de saber o que
 * aconteceu e continuar. Em produção o erro real fica escondido atrás de um
 * digest, por isso isto não pode contar com a mensagem: lista as causas
 * prováveis, com o que fazer, e dá um botão para tentar de novo.
 *
 * A causa de longe mais comum é a conta não estar na lista da mesa: entrar no
 * site e poder escrever são coisas diferentes.
 */
export default function MesaError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Mesa:", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-lg py-8">
      <h1 className="numeral text-3xl uppercase">Algo correu mal ao gravar</h1>
      <p className="mt-2 text-sm text-smoke">
        A gravação não passou. O torneio não se estragou — nada foi meio-gravado. Vê a
        causa mais provável, resolve, e tenta outra vez.
      </p>

      <ol className="mt-5 space-y-3">
        <li className="border-l-2 border-spot pl-3">
          <p className="text-sm font-bold">A tua conta não está na lista da mesa</p>
          <p className="mt-0.5 text-sm text-smoke">
            É a causa mais comum. Entrar no site e poder gravar são coisas diferentes: só
            quem está na tabela <code className="font-mono text-ink">admins</code> escreve.
            No SQL Editor do Supabase, corre — com o teu email:
          </p>
          <pre className="mt-2 overflow-x-auto border border-chalk bg-chalk/40 p-2 font-mono text-[0.6875rem] leading-relaxed">
            {`insert into public.admins (user_id, email)
select id, email from auth.users
where email = 'o-teu-email';`}
          </pre>
        </li>
        <li className="border-l-2 border-chalk pl-3">
          <p className="text-sm font-bold">A ligação falhou por um instante</p>
          <p className="mt-0.5 text-sm text-smoke">
            Acontece com a rede do recinto. Tenta outra vez — se a segunda passar, era isto.
          </p>
        </li>
      </ol>

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={reset}
          className="bg-ink px-4 py-2.5 text-xs font-bold tracking-wide text-paper uppercase transition-transform active:scale-[0.98]"
        >
          Tentar outra vez
        </button>
        <Link
          href="/admin"
          className="border border-ink px-4 py-2.5 text-xs font-bold tracking-wide uppercase transition-colors hover:bg-ink hover:text-paper"
        >
          Voltar aos resultados
        </Link>
      </div>

      {error.digest && (
        <p className="eyebrow mt-6 text-smoke">Referência do erro · {error.digest}</p>
      )}
    </div>
  );
}
