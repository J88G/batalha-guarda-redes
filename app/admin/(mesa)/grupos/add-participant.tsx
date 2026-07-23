"use client";

import { useRef } from "react";
import { useFormStatus } from "react-dom";
import { addParticipant } from "../../actions";
import type { Group } from "@/lib/types";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="shrink-0 bg-ink px-3 py-2 text-xs font-bold tracking-wide text-paper uppercase disabled:opacity-50"
    >
      {pending ? "…" : "Inscrever"}
    </button>
  );
}

/** Uma inscrição de última hora, já no escalão certo. */
export function AddParticipant({
  categoryId,
  groups,
  yearMin,
  yearMax,
}: {
  categoryId: number;
  groups: Group[];
  yearMin: number;
  yearMax: number;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const twoGroups = groups.length > 1;

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await addParticipant(formData);
        formRef.current?.reset();
      }}
      className="flex flex-wrap items-center gap-2 border-t border-chalk p-3"
    >
      <input type="hidden" name="categoryId" value={categoryId} />
      <label className="sr-only" htmlFor={`nome-${categoryId}`}>
        Nome do guarda-redes
      </label>
      <input
        id={`nome-${categoryId}`}
        name="name"
        required
        placeholder="Nome do guarda-redes"
        autoComplete="off"
        className="min-w-0 flex-1 border border-chalk px-2 py-2 text-sm focus:border-ink focus:outline-none"
      />
      <label className="sr-only" htmlFor={`ano-${categoryId}`}>
        Ano de nascimento
      </label>
      <input
        id={`ano-${categoryId}`}
        name="birthYear"
        type="number"
        required
        min={yearMin}
        max={yearMax}
        placeholder="Ano"
        inputMode="numeric"
        className="w-20 border border-chalk px-2 py-2 text-center font-mono text-sm focus:border-ink focus:outline-none"
      />
      {twoGroups && (
        <>
          <label className="sr-only" htmlFor={`grupo-${categoryId}`}>
            Grupo
          </label>
          <select
            id={`grupo-${categoryId}`}
            name="groupId"
            defaultValue=""
            className="border border-chalk px-2 py-2 text-sm focus:border-ink focus:outline-none"
          >
            <option value="">Sem grupo</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                Grupo {g.name}
              </option>
            ))}
          </select>
        </>
      )}
      {!twoGroups && groups[0] && (
        <input type="hidden" name="groupId" value={groups[0].id} />
      )}
      <Submit />
    </form>
  );
}
