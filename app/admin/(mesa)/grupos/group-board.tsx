"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import {
  balanceGroups,
  removeParticipant,
  renameParticipant,
  setParticipantGroup,
  setParticipantYear,
} from "../../actions";
import { ConfirmDialog } from "@/components/confirm-dialog";
import type { Group, Participant } from "@/lib/types";
import { roundsFor } from "@/lib/tournament";

type Move = { participantId: number; groupId: number | null };

function BalanceButton({ total, groupCount }: { total: number; groupCount: number }) {
  const { pending } = useFormStatus();
  const per = Math.ceil(total / groupCount);
  return (
    <button
      type="submit"
      disabled={pending}
      className="border border-ink px-3 py-1.5 text-xs font-bold tracking-wide uppercase hover:bg-ink hover:text-paper disabled:opacity-50"
    >
      {pending
        ? "A repartir…"
        : groupCount === 1
          ? "Pôr todos na poule"
          : `Repartir ${per} e ${total - per}`}
    </button>
  );
}

/** Uma linha de guarda-redes: número, nome (editável), ano, e o que se lhe faz. */
function ParticipantRow({
  participant,
  otherGroup,
  matchCount,
  arrow,
  onMove,
  onDragStart,
  dragging,
}: {
  participant: Participant;
  otherGroup: Group | undefined;
  matchCount: number;
  arrow: "→" | "←" | null;
  onMove: (groupId: number) => void;
  onDragStart: () => void;
  dragging: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const draggable = otherGroup !== undefined && !editing;

  return (
    <li
      draggable={draggable}
      onDragStart={(e) => {
        if (!draggable) return;
        e.dataTransfer.setData("text/plain", String(participant.id));
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      className={[
        "flex items-center gap-1.5 border-b border-chalk px-2 py-2 last:border-0",
        draggable ? "cursor-grab active:cursor-grabbing" : "",
        dragging ? "opacity-30" : "hover:bg-chalk/40",
      ].join(" ")}
    >
      {otherGroup && (
        <span aria-hidden className="shrink-0 font-mono text-xs leading-none text-chalk">
          ⠿
        </span>
      )}
      <span className="w-4 shrink-0 font-mono text-[0.5625rem] text-smoke">{participant.seed}</span>

      {editing ? (
        <div className="flex min-w-0 flex-1 items-center gap-1">
          <form
            action={renameParticipant}
            onSubmit={() => setEditing(false)}
            className="flex min-w-0 flex-1"
          >
            <input type="hidden" name="participantId" value={participant.id} />
            <input
              name="name"
              defaultValue={participant.name}
              autoFocus
              aria-label={`Nome de ${participant.name}`}
              onKeyDown={(e) => e.key === "Escape" && setEditing(false)}
              className="min-w-0 flex-1 border border-ink px-1.5 py-0.5 text-sm"
            />
          </form>
          <form action={setParticipantYear} onSubmit={() => setEditing(false)}>
            <input type="hidden" name="participantId" value={participant.id} />
            <input
              name="birthYear"
              type="number"
              defaultValue={participant.birth_year}
              aria-label={`Ano de ${participant.name}`}
              className="w-16 border border-chalk px-1 py-0.5 text-center font-mono text-xs"
            />
          </form>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          title={`${participant.name} — clicar para corrigir`}
          className="flex min-w-0 flex-1 items-baseline gap-2 text-left hover:underline"
        >
          <span className="min-w-0 truncate text-sm">{participant.name}</span>
          <span className="shrink-0 font-mono text-[0.625rem] text-smoke">
            {participant.birth_year}
          </span>
        </button>
      )}

      <form action={removeParticipant} id={`remover-${participant.id}`} className="shrink-0">
        <input type="hidden" name="participantId" value={participant.id} />
      </form>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        aria-label={`Remover ${participant.name}`}
        title="Remover"
        className="shrink-0 px-1.5 py-1 font-mono text-xs text-smoke hover:text-spot"
      >
        ×
      </button>
      <ConfirmDialog
        open={confirming}
        onCancel={() => setConfirming(false)}
        formId={`remover-${participant.id}`}
        title={`Remover ${participant.name}?`}
        danger
        confirmLabel="Remover"
        body={
          matchCount > 0 ? (
            <>
              <p>
                Este guarda-redes tem {matchCount} {matchCount === 1 ? "jogo" : "jogos"} no
                calendário. Ao removê-lo, esses jogos são apagados.
              </p>
              <p>O calendário deste escalão tem de ser gerado outra vez.</p>
            </>
          ) : (
            <p>Ainda não tem jogos, por isso não se perde nada.</p>
          )
        }
      />

      {/* Arrastar é para o rato. A seta serve o teclado e o toque. */}
      {otherGroup && arrow && (
        <button
          type="button"
          onClick={() => onMove(otherGroup.id)}
          aria-label={`Passar ${participant.name} para o Grupo ${otherGroup.name}`}
          title={`Passar para o Grupo ${otherGroup.name}`}
          className="shrink-0 border border-chalk px-2 py-1 font-mono text-xs text-smoke hover:border-ink hover:bg-ink hover:text-paper"
        >
          {arrow}
        </button>
      )}
    </li>
  );
}

/**
 * Os guarda-redes de um escalão, pelos grupos que o formato tiver. Com dois
 * grupos, arrastam-se de um lado para o outro e o desequilíbrio aparece pela
 * consequência que tem. Com poule única, é uma lista só.
 */
export function GroupBoard({
  groups,
  participants,
  matchCounts,
  matchMinutes,
  startsAt,
  hasKnockout,
}: {
  groups: Group[];
  participants: Participant[];
  matchCounts: Record<number, number>;
  matchMinutes: number;
  startsAt: string;
  hasKnockout: boolean;
}) {
  const [, startTransition] = useTransition();
  const [dragging, setDragging] = useState<number | null>(null);
  const [over, setOver] = useState<number | "none" | null>(null);

  const [shown, applyMove] = useOptimistic(participants, (state: Participant[], move: Move) =>
    state.map((p) => (p.id === move.participantId ? { ...p, group_id: move.groupId } : p)),
  );

  const move = (participantId: number, groupId: number | null) => {
    const form = new FormData();
    form.set("participantId", String(participantId));
    form.set("groupId", groupId === null ? "" : String(groupId));
    startTransition(async () => {
      applyMove({ participantId, groupId });
      await setParticipantGroup(form);
    });
  };

  const ordered = [...groups].sort((a, b) => a.name.localeCompare(b.name));
  const single = ordered.length === 1;
  const categoryId = ordered[0]?.category_id;
  const unassigned = shown.filter((p) => p.group_id === null);
  const sizeOf = (g: Group) => shown.filter((p) => p.group_id === g.id).length;
  const sizes = ordered.map(sizeOf);

  const lopsided =
    !single && Math.abs(sizes[0] - sizes[1]) > 1 && sizes.every((n) => n > 0);
  const tooSmall = single ? sizes[0] < 2 : sizes.some((n) => n < 2);

  const endLabel = (rounds: number) =>
    new Date(new Date(startsAt).getTime() + (rounds + 1) * matchMinutes * 60_000).toLocaleTimeString(
      "pt-PT",
      { timeZone: "Europe/Lisbon", hour: "2-digit", minute: "2-digit" },
    );
  const worstRounds = Math.max(...sizes.map((n) => roundsFor(n)));
  const idealRounds = roundsFor(Math.ceil((sizes.reduce((a, b) => a + b, 0) + unassigned.length) / ordered.length));

  const dropProps = (groupId: number | null, key: number | "none") => ({
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setOver(key);
    },
    onDragLeave: () => setOver((v) => (v === key ? null : v)),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      setOver(null);
      setDragging(null);
      const id = Number(e.dataTransfer.getData("text/plain"));
      if (Number.isFinite(id)) move(id, groupId);
    },
  });

  return (
    <div onDragEnd={() => { setDragging(null); setOver(null); }}>
      {(lopsided || tooSmall || unassigned.length > 0) && (
        <div className="mb-2 border-l-4 border-spot bg-spot/5 p-3">
          {tooSmall && (
            <p className="text-sm font-bold">
              {single
                ? "A poule precisa de pelo menos 2 guarda-redes para haver jogos."
                : "Cada grupo precisa de pelo menos 2 guarda-redes para haver jogos."}
            </p>
          )}
          {lopsided && (
            <>
              <p className="text-sm font-bold">
                Grupos desequilibrados: {sizes[0]} contra {sizes[1]}.
              </p>
              <p className="mt-1 text-sm text-smoke">
                O Grupo {ordered[0].name} leva {roundsFor(sizes[0])} jogos e o Grupo{" "}
                {ordered[1].name} leva {roundsFor(sizes[1])}.
                {hasKnockout && (
                  <>
                    {" "}
                    A eliminatória espera pelos dois grupos, por isso este escalão só acabaria às{" "}
                    <span className="font-bold text-ink">{endLabel(worstRounds)}</span>
                    {idealRounds < worstRounds && <> em vez das {endLabel(idealRounds)}</>}.
                  </>
                )}
              </p>
            </>
          )}
          {unassigned.length > 0 && (
            <p className={lopsided || tooSmall ? "mt-2 text-sm" : "text-sm font-bold"}>
              {unassigned.length === 1
                ? "Um guarda-redes está sem grupo e não vai jogar."
                : `${unassigned.length} guarda-redes estão sem grupo e não vão jogar.`}
            </p>
          )}
          <form action={balanceGroups} className="mt-2">
            <input type="hidden" name="categoryId" value={categoryId} />
            <BalanceButton
              total={sizes.reduce((a, b) => a + b, 0) + unassigned.length}
              groupCount={ordered.length}
            />
          </form>
        </div>
      )}

      <div className={single ? "" : "grid gap-2 sm:grid-cols-2"}>
        {ordered.map((group, index) => {
          const other = single ? undefined : ordered[index === 0 ? 1 : 0];
          const inGroup = shown
            .filter((p) => p.group_id === group.id)
            .sort((a, b) => (a.seed ?? 99) - (b.seed ?? 99));

          return (
            <section
              key={group.id}
              id={`grupo-${group.id}`}
              aria-labelledby={`h-${group.id}`}
              {...(single ? {} : dropProps(group.id, group.id))}
              className={[
                "scroll-mt-20 border transition-colors",
                over === group.id ? "border-ink bg-chalk/50" : "border-chalk",
              ].join(" ")}
            >
              <header className="flex items-baseline justify-between gap-2 border-b border-chalk px-2 py-1.5">
                <h4 id={`h-${group.id}`} className="text-sm font-bold">
                  {single ? "Poule única" : `Grupo ${group.name}`}
                </h4>
                <span className="eyebrow text-smoke">
                  {inGroup.length} GR · {roundsFor(inGroup.length)} jogos
                </span>
              </header>

              {inGroup.length === 0 ? (
                <p className="px-2 py-6 text-center text-xs text-smoke">
                  {single ? "Sem guarda-redes" : "Arrasta guarda-redes para aqui"}
                </p>
              ) : (
                <ul>
                  {inGroup.map((participant) => (
                    <ParticipantRow
                      key={participant.id}
                      participant={participant}
                      otherGroup={other}
                      matchCount={matchCounts[participant.id] ?? 0}
                      arrow={single ? null : index === 0 ? "→" : "←"}
                      onMove={(gid) => move(participant.id, gid)}
                      onDragStart={() => setDragging(participant.id)}
                      dragging={dragging === participant.id}
                    />
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      {!single && unassigned.length > 0 && (
        <section
          aria-label="Guarda-redes sem grupo"
          {...dropProps(null, "none")}
          className={[
            "mt-2 border transition-colors",
            over === "none" ? "border-ink bg-chalk/50" : "border-spot",
          ].join(" ")}
        >
          <header className="border-b border-chalk px-2 py-1.5">
            <h4 className="text-sm font-bold">Sem grupo — não jogam</h4>
          </header>
          <ul>
            {unassigned
              .sort((a, b) => (a.seed ?? 99) - (b.seed ?? 99))
              .map((participant) => (
                <li
                  key={participant.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", String(participant.id));
                    setDragging(participant.id);
                  }}
                  className={[
                    "flex cursor-grab items-center gap-1.5 border-b border-chalk px-2 py-2 last:border-0",
                    dragging === participant.id ? "opacity-30" : "",
                  ].join(" ")}
                >
                  <span aria-hidden className="shrink-0 font-mono text-xs text-chalk">
                    ⠿
                  </span>
                  <span className="w-4 shrink-0 font-mono text-[0.5625rem] text-smoke">
                    {participant.seed}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm">{participant.name}</span>
                  {ordered.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => move(participant.id, g.id)}
                      aria-label={`Pôr ${participant.name} no Grupo ${g.name}`}
                      className="border border-chalk px-2 py-1 text-xs font-bold hover:bg-ink hover:text-paper"
                    >
                      {g.name}
                    </button>
                  ))}
                </li>
              ))}
          </ul>
        </section>
      )}
    </div>
  );
}
