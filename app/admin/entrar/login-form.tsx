"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function Campo({
  id,
  label,
  type,
  autoComplete,
  hint,
}: {
  id: string;
  label: string;
  type: string;
  autoComplete: string;
  hint?: string;
}) {
  return (
    <label htmlFor={id} className="block">
      <span className="eyebrow text-smoke">{label}</span>
      <input
        id={id}
        name={id}
        type={type}
        required
        autoComplete={autoComplete}
        // 16px é o mínimo para o iPhone não dar zoom ao tocar no campo.
        className="mt-1 w-full border-2 border-chalk bg-paper px-3 py-2.5 text-base transition-colors focus:border-ink focus:outline-none"
      />
      {hint && <span className="mt-1 block text-xs text-smoke">{hint}</span>}
    </label>
  );
}

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [aEntrar, setAEntrar] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAEntrar(true);
    setErro(null);

    const form = new FormData(event.currentTarget);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: String(form.get("email")).trim(),
      password: String(form.get("password")),
    });

    if (error) {
      // Um erro diz o que aconteceu e o que fazer. Não pede desculpa nem fala
      // por códigos.
      setErro(
        error.message === "Invalid login credentials"
          ? "O email ou a palavra-passe não batem certo. Tenta outra vez."
          : error.message === "Failed to fetch"
            ? "Não consegui falar com o servidor. Vê a ligação à internet."
            : error.message,
      );
      setAEntrar(false);
      return;
    }

    router.push(next as Parameters<typeof router.push>[0]);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-3.5 text-ink">
      <Campo id="email" label="Email" type="email" autoComplete="username" />
      <Campo id="password" label="Palavra-passe" type="password" autoComplete="current-password" />

      {erro && (
        <p role="alert" className="border-l-2 border-spot bg-spot/5 px-3 py-2 text-sm">
          {erro}
        </p>
      )}

      <button
        type="submit"
        disabled={aEntrar}
        className="w-full bg-ink px-4 py-3.5 text-sm font-bold tracking-wide text-paper uppercase transition-transform active:scale-[0.99] disabled:opacity-50"
      >
        {aEntrar ? "A entrar…" : "Entrar na mesa"}
      </button>
    </form>
  );
}
