"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Resultados" },
  { href: "/admin/jogos", label: "Todos os jogos" },
  { href: "/admin/grupos", label: "Guarda-redes" },
  { href: "/admin/calendario", label: "Formato" },
  { href: "/admin/regras", label: "Regras" },
  { href: "/admin/repor", label: "Repor" },
] as const;

export function AdminNav() {
  const pathname = usePathname();

  // O login não faz parte da mesa, por isso não leva navegação.
  if (pathname === "/admin/entrar") return null;

  return (
    // Os separadores nunca partem a meio de uma palavra: se não couberem,
    // deslizam. "Todos os jogos" em três linhas não é um separador.
    <nav
      aria-label="Secções da mesa"
      className="-mx-4 flex gap-1 overflow-x-auto border-b border-chalk px-4"
    >
      {LINKS.map(({ href, label }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={[
              "shrink-0 border-b-2 px-3 py-2.5 text-xs font-bold tracking-wide whitespace-nowrap uppercase transition-colors",
              active ? "border-spot text-ink" : "border-transparent text-smoke hover:text-ink",
            ].join(" ")}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
