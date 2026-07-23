"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { lendCampo, returnCampo } from "../actions";
import { ConfirmDialog } from "@/components/confirm-dialog";

type Free = { campo: number; categoryId: number; label: string; pending: number };
type Loan = { campo: number; label: string };

function ReturnButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="eyebrow px-2 py-1 text-smoke hover:text-ink disabled:opacity-40"
    >
      {pending ? "…" : "Devolver"}
    </button>
  );
}

function LendItem({ item }: { item: Free }) {
  const [asking, setAsking] = useState(false);
  const formId = `emprestar-${item.campo}-${item.categoryId}`;

  return (
    <li className="flex flex-wrap items-center gap-2 border border-chalk px-3 py-2">
      <span className="text-sm">
        <span className="font-bold">Campo {item.campo}</span> livre — dá para emprestar ao{" "}
        <span className="font-bold">{item.label}</span>, que ainda tem {item.pending} jogos de
        grupo por decidir.
      </span>
      <form action={lendCampo} id={formId} className="hidden">
        <input type="hidden" name="campo" value={item.campo} />
        <input type="hidden" name="categoryId" value={item.categoryId} />
      </form>
      <button
        type="button"
        onClick={() => setAsking(true)}
        className="ml-auto shrink-0 border border-ink px-3 py-1.5 text-xs font-bold tracking-wide uppercase hover:bg-ink hover:text-paper"
      >
        Emprestar ao {item.label}
      </button>
      <ConfirmDialog
        open={asking}
        onCancel={() => setAsking(false)}
        formId={formId}
        title={`Emprestar o campo ${item.campo} ao ${item.label}?`}
        confirmLabel="Emprestar"
        body={
          <>
            <p>
              Um grupo do {item.label} passa a jogar no campo {item.campo}, em paralelo com o
              campo dele. Os dois grupos têm guarda-redes diferentes, por isso nunca chocam.
            </p>
            <p>
              Os jogos que faltam são re-marcados a partir de agora. Os resultados já
              registados ficam. Podes devolver o campo depois.
            </p>
          </>
        }
      />
    </li>
  );
}

/**
 * Empréstimo de campos: quando um campo fica sem jogos, a mesa pode mandar para
 * lá um grupo de outro escalão que ainda tenha muito por jogar. Só sugere, quem
 * decide é a mesa.
 */
export function LendingPanel({ free, loans }: { free: Free[]; loans: Loan[] }) {
  if (free.length === 0 && loans.length === 0) return null;

  return (
    <section className="mt-4 border-l-4 border-ink bg-chalk/30 p-3" aria-labelledby="emprestimos">
      <h2 id="emprestimos" className="text-sm font-bold">
        Campos e empréstimos
      </h2>

      {loans.length > 0 && (
        <ul className="mt-2 space-y-1">
          {loans.map((loan) => (
            <li
              key={loan.campo}
              className="flex flex-wrap items-center gap-2 border border-chalk px-3 py-2"
            >
              <span className="text-sm">
                <span className="font-bold">Campo {loan.campo}</span> a receber jogos do{" "}
                <span className="font-bold">{loan.label}</span>.
              </span>
              <form action={returnCampo} className="ml-auto">
                <input type="hidden" name="campo" value={loan.campo} />
                <ReturnButton />
              </form>
            </li>
          ))}
        </ul>
      )}

      {free.length > 0 && (
        <ul className="mt-2 space-y-1">
          {free.map((item) => (
            <LendItem key={`${item.campo}-${item.categoryId}`} item={item} />
          ))}
        </ul>
      )}
    </section>
  );
}
