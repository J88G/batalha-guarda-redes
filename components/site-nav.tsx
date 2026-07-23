"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Agora" },
  { href: "/calendario", label: "Calendário" },
  { href: "/escaloes", label: "Escalões" },
] as const;

/**
 * No telemóvel a navegação vive em baixo, ao alcance do polegar — quem está no
 * recinto usa o site com uma mão só. No ecrã grande sobe para o cabeçalho.
 */
export function SiteNav() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav
      aria-label="Secções"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-chalk bg-paper md:static md:border-0 md:bg-transparent"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto grid max-w-[84rem] grid-cols-3 md:flex md:gap-1">
        {LINKS.map(({ href, label }) => {
          const active = isActive(href);
          return (
            <li key={href} className="md:contents">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={[
                  "flex h-14 items-center justify-center border-t-2 text-xs font-bold tracking-wide uppercase transition-colors",
                  "md:h-auto md:border-t-0 md:border-b-2 md:px-3 md:py-2 md:text-[0.6875rem]",
                  active
                    ? "border-spot text-ink"
                    : "border-transparent text-smoke hover:text-ink",
                ].join(" ")}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
