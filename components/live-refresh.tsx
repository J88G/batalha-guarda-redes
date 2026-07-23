"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Liga o site público à mesa. O Supabase avisa por websocket assim que um
 * resultado é gravado, e a página volta a desenhar-se sozinha.
 *
 * Há centenas de telemóveis no recinto a ver isto ao mesmo tempo, e todos
 * recebem o mesmo aviso no mesmo instante. Se cada um pedisse a página logo,
 * seriam centenas de pedidos no mesmo segundo — e as 8 balizas fecham quase
 * juntas, por isso seriam oito rajadas dessas. Daí:
 *
 * - os avisos que chegam seguidos contam como um só (as 8 balizas dão um
 *   pedido, não oito);
 * - cada telemóvel espera um bocado à sorte antes de pedir, para os pedidos
 *   se espalharem em vez de baterem todos ao mesmo tempo.
 *
 * O intervalo é a rede de segurança: o plano gratuito do Supabase só aguenta
 * 200 websockets em simultâneo, por isso quem ficar de fora nunca recebe
 * avisos — e tem de continuar a ver o placard certo na mesma.
 */
const AGRUPAR_AVISOS_MS = 400;
const ESPALHAR_ATE_MS = 2_500;

export function LiveRefresh({ pollSeconds = 25 }: { pollSeconds?: number }) {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    const refreshSoon = () => {
      if (timer.current) clearTimeout(timer.current);
      const espera = AGRUPAR_AVISOS_MS + Math.random() * ESPALHAR_ATE_MS;
      timer.current = setTimeout(() => {
        if (!cancelled) router.refresh();
      }, espera);
    };

    const channel = supabase.channel("batalha-gr");
    for (const table of ["matches", "participants", "groups", "categories"]) {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, refreshSoon);
    }
    channel.subscribe();

    // A rede de segurança também é espalhada, senão os telemóveis que abriram
    // o site ao mesmo tempo voltavam a bater todos juntos.
    const intervalo = setInterval(
      () => router.refresh(),
      (pollSeconds + Math.random() * 10) * 1000,
    );

    // Quem volta ao site depois de bloquear o telemóvel tem de ver o estado de
    // agora, não o de há dez minutos.
    const aoVoltar = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    document.addEventListener("visibilitychange", aoVoltar);

    return () => {
      cancelled = true;
      if (timer.current) clearTimeout(timer.current);
      clearInterval(intervalo);
      document.removeEventListener("visibilitychange", aoVoltar);
      supabase.removeChannel(channel);
    };
  }, [router, pollSeconds]);

  return null;
}
