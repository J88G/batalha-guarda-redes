"use client";

import { useEffect, useRef } from "react";

/**
 * A confirmação de uma acção que custa a desfazer.
 *
 * Usa o `<dialog>` do browser em vez de um `div`: prende o foco, fecha com
 * Escape e é anunciado como diálogo pelos leitores de ecrã — coisas que dão
 * trabalho a acertar à mão. O botão que confirma vive fora do formulário e
 * liga-se a ele pelo `form=`, para o submit continuar a ser um submit.
 */
export function ConfirmDialog({
  open,
  onCancel,
  title,
  body,
  confirmLabel,
  formId,
  danger = false,
}: {
  open: boolean;
  onCancel: () => void;
  title: string;
  body: React.ReactNode;
  confirmLabel: string;
  formId: string;
  danger?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
      onClick={(e) => {
        // Clicar fora do painel fecha, como se espera de um modal.
        if (e.target === ref.current) onCancel();
      }}
      aria-labelledby={`${formId}-titulo`}
      className="m-auto w-[min(30rem,calc(100vw-2rem))] border-2 border-ink bg-paper p-0 text-ink backdrop:bg-ink/70"
    >
      <div className="p-5">
        <h2 id={`${formId}-titulo`} className="numeral text-2xl uppercase">
          {title}
        </h2>
        <div className="mt-2 space-y-2 text-sm text-smoke">{body}</div>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="border border-chalk px-4 py-2.5 text-xs font-bold tracking-wide uppercase hover:border-ink"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form={formId}
            onClick={onCancel}
            className={[
              "px-4 py-2.5 text-xs font-bold tracking-wide uppercase text-paper",
              danger ? "bg-spot" : "bg-ink",
            ].join(" ")}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
