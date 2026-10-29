import { cloneElement, useEffect, useId, useRef, useState, type ReactElement } from "react";
import { createPortal } from "react-dom";
import { Button } from "./button";

/** Native HTML dialog supplies background inertness; no blocking browser popup. */
export function ConfirmAction({ children, title, description, confirmLabel, cancelLabel = "取消", onConfirm }: {
  children: ReactElement<{ onClick?: () => void }>;
  title: string; description: string; confirmLabel: string; cancelLabel?: string; onConfirm: () => void;
}) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLElement | null>(null);
  return <>
    {cloneElement(children, { onClick: () => { trigger.current = document.activeElement as HTMLElement; setOpen(true); } })}
    {open ? <Confirmation title={title} description={description} confirmLabel={confirmLabel} cancelLabel={cancelLabel}
      onClose={(confirmed) => { setOpen(false); trigger.current?.focus(); if (confirmed) onConfirm(); }} /> : null}
  </>;
}

function Confirmation({ title, description, confirmLabel, cancelLabel, onClose }: {
  title: string; description: string; confirmLabel: string; cancelLabel: string; onClose: (confirmed: boolean) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const id = useId();
  const close = (confirmed: boolean) => { ref.current?.close(); onClose(confirmed); };
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    cancel.current?.focus();
    return () => dialog.close();
  }, []);
  return createPortal(<dialog ref={ref} className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`}
    onCancel={(event) => { event.preventDefault(); close(false); }}
    onClick={(event) => { if (event.target === event.currentTarget) close(false); }}
    onKeyDown={(event) => {
      event.stopPropagation();
      if (event.key !== "Tab") return;
      const buttons = Array.from(ref.current!.querySelectorAll<HTMLButtonElement>("button"));
      const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
      event.preventDefault();
      buttons[(index + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length].focus();
    }}>
    <div className="confirm-content">
      <h2 id={`${id}-title`}>{title}</h2>
      <p id={`${id}-description`}>{description}</p>
      <div className="confirm-actions">
        <Button ref={cancel} variant="outline" onClick={() => close(false)}>{cancelLabel}</Button>
        <Button onClick={() => close(true)}>{confirmLabel}</Button>
      </div>
    </div>
  </dialog>, document.body);
}
