"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { setCategoryFormat } from "../../actions";
import { ConfirmDialog } from "@/components/confirm-dialog";
import type { Category } from "@/lib/types";

function Field({
  label,
  name,
  defaultValue,
  options,
}: {
  label: string;
  name: string;
  defaultValue: string | number;
  options: { value: string | number; label: string }[];
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="eyebrow text-smoke">{label}</span>
      <select
        name={name}
        defaultValue={String(defaultValue)}
        className="border border-chalk px-2 py-1.5 text-sm focus:border-ink focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Save() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="border border-ink px-3 py-2 text-xs font-bold tracking-wide uppercase hover:bg-ink hover:text-paper disabled:opacity-50"
    >
      {pending ? "A guardar…" : "Guardar formato"}
    </button>
  );
}

/**
 * O formato de um escalão: quantos grupos, quantas voltas e que eliminatória.
 * Cada campo tem uma só baliza, por isso joga-se um jogo de cada vez. Guardar
 * apaga o calendário deste escalão — a seguir há que gerá-lo outra vez — e, se
 * o número de grupos mudar, reparte de novo os guarda-redes. Por isso, com
 * resultados registados, pergunta antes.
 */
export function FormatPicker({
  category,
  playedCount,
}: {
  category: Category;
  playedCount: number;
}) {
  const [confirming, setConfirming] = useState(false);
  const formId = `formato-${category.id}`;
  const dirtyRisk = playedCount > 0;

  return (
    <div className="mt-2 border-t border-chalk pt-3">
      <p className="eyebrow mb-2 text-smoke">Formato</p>

      <form
        action={setCategoryFormat}
        id={formId}
        onSubmit={(e) => {
          if (dirtyRisk && !confirming) {
            e.preventDefault();
            setConfirming(true);
          }
        }}
        className="flex flex-wrap items-end gap-2"
      >
        <input type="hidden" name="categoryId" value={category.id} />
        <Field
          label="Grupos"
          name="groupCount"
          defaultValue={category.group_count}
          options={[
            { value: 1, label: "Poule única" },
            { value: 2, label: "Dois grupos" },
            { value: 3, label: "Três grupos" },
          ]}
        />
        <Field
          label="Voltas"
          name="legs"
          defaultValue={category.legs}
          options={[
            { value: 1, label: "1 volta" },
            { value: 2, label: "2 voltas" },
          ]}
        />
        <Field
          label="Eliminatória"
          name="knockout"
          defaultValue={category.knockout}
          options={[
            { value: "none", label: "Campeonato" },
            { value: "final", label: "Só final" },
            { value: "semis", label: "Meias + final" },
          ]}
        />
        <Save />
      </form>

      <p className="mt-1.5 text-xs text-smoke">
        Guardar apaga o calendário deste escalão. Gera-o outra vez a seguir.
      </p>

      <ConfirmDialog
        open={confirming}
        onCancel={() => setConfirming(false)}
        formId={formId}
        danger
        title="Mudar o formato?"
        confirmLabel="Mudar na mesma"
        body={
          <>
            <p>
              O escalão {category.name} já tem{" "}
              <span className="font-bold text-ink">
                {playedCount} {playedCount === 1 ? "resultado registado" : "resultados registados"}
              </span>
              .
            </p>
            <p>
              Mudar o formato apaga o calendário deste escalão — e com ele esses resultados. Se
              mudares o número de grupos, os guarda-redes voltam a repartir-se.
            </p>
          </>
        }
      />
    </div>
  );
}
