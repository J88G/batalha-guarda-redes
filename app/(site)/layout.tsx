import Image from "next/image";
import Link from "next/link";
import { SiteNav } from "@/components/site-nav";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-ink focus:px-3 focus:py-2 focus:text-paper"
      >
        Saltar para o conteúdo
      </a>

      <header className="sticky top-0 z-30 border-b border-ink bg-ink text-paper">
        <div className="mx-auto flex max-w-[84rem] items-center gap-3 px-4 py-2.5">
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/brand/rx-logo-paper.png"
              alt="RX Soccer Academy"
              width={599}
              height={589}
              priority
              className="size-8 shrink-0"
            />
            <span className="flex flex-col leading-none">
              <span className="numeral text-base">BATALHA GR</span>
              <span className="eyebrow mt-0.5 text-paper/55">RX Soccer Academy</span>
            </span>
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-[84rem] px-4 md:border-b md:border-chalk">
        <SiteNav />
      </div>

      {/* Largo o suficiente para as oito balizas e as classificações caberem
          lado a lado num portátil, sem as apertar. */}
      <main id="conteudo" className="mx-auto max-w-[84rem] px-4 pt-4 pb-24 md:pb-12">
        {children}
      </main>

      <footer className="mx-auto max-w-[84rem] px-4 pb-24 md:pb-8">
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-chalk pt-4">
          <p className="eyebrow text-smoke">RX Soccer Academy · Batalha de Guarda-Redes</p>
          <Link href="/admin" className="eyebrow text-smoke hover:text-ink">
            Mesa
          </Link>
        </div>
      </footer>
    </>
  );
}
