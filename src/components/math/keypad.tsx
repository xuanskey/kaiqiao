import { useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Delete } from "lucide-react";
import { cn } from "@/lib/utils";
import type { KeypadKind } from "@/lib/math/types";

const DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;

export function Keypad({
  value,
  kind,
  disabled,
  onChange,
  onSubmit,
}: {
  value: string;
  kind: KeypadKind;
  disabled?: boolean;
  onChange: (next: string) => void;
  onSubmit: () => void;
}) {
  const valid = kind === "remainder" ? /^\d+余\d+$/.test(value) : /^\d+(?:\.\d*)?$/.test(value);
  const press = (token: string) => {
    if (disabled) return;
    if (token === "del") {
      onChange(value.slice(0, -1));
      return;
    }
    if (token === "." && value.includes(".")) return;
    if (token === "余" && (!value || value.includes("余"))) return;
    if (value.length >= 10) return;
    onChange(!value && token === "." ? "0." : value + token);
  };

  const keyApi = useRef({ press, onSubmit, valid, disabled, kind });
  keyApi.current = { press, onSubmit, valid, disabled, kind };
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      const api = keyApi.current;
      if (api.disabled || event.ctrlKey || event.metaKey || event.altKey || event.isComposing || event.repeat) return;
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))) return;
      if (/^\d$/.test(event.key)) { event.preventDefault(); api.press(event.key); }
      else if (event.key === "Backspace") { event.preventDefault(); api.press("del"); }
      else if (event.key === "." && api.kind === "dec") { event.preventDefault(); api.press("."); }
      else if (event.key.toLowerCase() === "r" && api.kind === "remainder") { event.preventDefault(); api.press("余"); }
      else if (event.key === "Enter") {
        if (target instanceof HTMLElement && target.closest("button") && !target.closest(".keypad")) return;
        event.preventDefault(); if (api.valid) api.onSubmit();
      }
    };
    document.addEventListener("keydown", keydown);
    return () => document.removeEventListener("keydown", keydown);
  }, []);

  return (
    <div className="keypad" role="group" aria-label="数字键盘">
      {DIGITS.map((d) => (
        <Key key={d} disabled={disabled} onClick={() => press(d)}>
          {d}
        </Key>
      ))}
      {kind === "dec" ? (
        <Key disabled={disabled} onClick={() => press(".")}>
          .
        </Key>
      ) : kind === "remainder" ? (
        <Key disabled={disabled} onClick={() => press("余")}>
          余
        </Key>
      ) : (
        <Key disabled={disabled} onClick={() => press("del")} aria-label="删除">
          <Delete className="size-5" />
        </Key>
      )}
      <Key disabled={disabled} onClick={() => press("0")}>
        0
      </Key>
      {kind === "int" ? (
        <Key variant="ok" disabled={disabled || !valid} onClick={onSubmit}>
          确定
        </Key>
      ) : (
        <Key disabled={disabled} onClick={() => press("del")} aria-label="删除">
          <Delete className="size-5" />
        </Key>
      )}
      {kind !== "int" ? (
        <button
          type="button"
          disabled={disabled || !valid}
          onClick={onSubmit}
          className="keypad-key keypad-key--ok col-span-3"
        >
          确定
        </button>
      ) : null}
    </div>
  );
}

function Key({
  children,
  onClick,
  disabled,
  variant = "plain",
  ...rest
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: "plain" | "ok";
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "keypad-key",
        variant === "ok" && "keypad-key--ok",
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
