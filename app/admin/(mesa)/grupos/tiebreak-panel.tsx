"use client";

import { useState } from "react";
import { clearTiebreakOrder, setTiebreakOrder } from "../../actions";
import type { Standing } from "@/lib/types";

/**
 * Quando três guarda-redes ganham um ao outro em ciclo e não há penáltis,
 * nenhum critério os separa — inventar uma ordem seria mentir. A mesa decide
 * (sorteio, penáltis extra) e regista aqui.
 */
export function TiebreakPanel({
  groupId,
  standings,
  blocking,
}: {
  groupId: number;
  standings: Standing[];
  blocking: boolean;
}) {
  const tied = standings.filter((s) => s.tiedUnresolved);
  const [order, setOrder] = useState<number[]>(tied.map((s) => s.participantId));

  const move = (index: number, by: number) => {
    const next = [...order];
    const target = index + by;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setOrder(next);
  };

  const nameOf = (participantId: number) =>
    standings.find((s) => s.participantId === participantId)?.name ?? "";

  return (
    <div className="mt-3 border-t border-chalk pt-3">
      <p className="text-sm font-bold">
        {blocking ? "Desempate necessário" : "Guarda-redes empatados"}
      </p>
      <p className="mt-1 text-xs text-smoke">
        {blocking
          ? "O empate é nos lugares que decidem o apuramento, por isso a eliminatória está à espera."
          : "O empate não afecta o apuramento, mas podem fixar a ordem."}{" "}
        Ganham todos o mesmo número de jogos e não há penáltis que os separem.
      </p>

      <ol className="mt-2 space-y-1">
        {order.map((participantId, i) => (
          <li key={participantId} className="flex items-center gap-2 border border-chalk px-2 py-1.5">
            <span className="w-4 shrink-0 font-mono text-[0.625rem] font-bold">{i + 1}º</span>
            <span className="min-w-0 flex-1 truncate text-sm">{nameOf(participantId)}</span>
            <button
              type="button"
              onClick={() => move(i, -1)}
              disabled={i === 0}
              aria-label={`Subir ${nameOf(participantId)}`}
              className="px-2 py-0.5 text-smoke hover:text-ink disabled:opacity-25"
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => move(i, 1)}
              disabled={i === order.length - 1}
              aria-label={`Descer ${nameOf(participantId)}`}
              className="px-2 py-0.5 text-smoke hover:text-ink disabled:opacity-25"
            >
              ↓
            </button>
          </li>
        ))}
      </ol>

      <div className="mt-2 flex flex-wrap gap-2">
        <form action={setTiebreakOrder}>
          <input type="hidden" name="order" value={order.join(",")} />
          <button
            type="submit"
            className="bg-ink px-3 py-2 text-xs font-bold tracking-wide text-paper uppercase"
          >
            Guardar esta ordem
          </button>
        </form>
        <form action={clearTiebreakOrder}>
          <input type="hidden" name="groupId" value={groupId} />
          <button type="submit" className="eyebrow px-2 py-2 text-smoke hover:text-ink">
            Anular desempate
          </button>
        </form>
      </div>
    </div>
  );
}
