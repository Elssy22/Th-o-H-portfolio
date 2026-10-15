"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { CheckIcon } from "./icons";

type Toast = { id: number; message: string; tone: "default" | "error" };
type ConfirmOptions = { title: string; body?: string; confirmLabel?: string };
type PendingConfirm = ConfirmOptions & { resolve: (ok: boolean) => void };

const UIContext = createContext<{
  toast: (message: string, tone?: Toast["tone"]) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
} | null>(null);

// Message lisible pour Théo à partir d'une erreur des routes admin
export function errorMessage(e: unknown, fallback: string) {
  return e instanceof Error && e.message === "session"
    ? "Session expirée : recharge la page pour te reconnecter"
    : fallback;
}

export function useAdminUI() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useAdminUI doit être utilisé dans <AdminUIProvider>");
  return ctx;
}

export function AdminUIProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const nextId = useRef(0);

  const toast = useCallback((message: string, tone: Toast["tone"] = "default") => {
    const id = ++nextId.current;
    setToasts((t) => [...t.slice(-2), { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === "error" ? 5000 : 2600);
  }, []);

  const confirm = useCallback(
    (options: ConfirmOptions) => new Promise<boolean>((resolve) => setPending({ ...options, resolve })),
    []
  );

  const settle = useCallback(
    (ok: boolean) => {
      pending?.resolve(ok);
      setPending(null);
    },
    [pending]
  );

  return (
    <UIContext.Provider value={{ toast, confirm }}>
      {children}

      <div
        className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[70] flex flex-col items-center gap-2 w-[calc(100%-2.5rem)] max-w-sm pointer-events-none"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`admin-toast pointer-events-auto flex items-center gap-3 rounded-full border px-5 py-2.5 text-[13px] backdrop-blur-md shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)] ${
              t.tone === "error"
                ? "border-ember/50 bg-[#1a0507]/90 text-[#f3c9c4]"
                : "border-white/15 bg-black/80 text-ivory"
            }`}
          >
            {t.tone === "error" ? (
              <span className="h-1.5 w-1.5 rounded-full bg-ember shrink-0" />
            ) : (
              <CheckIcon size={13} className="shrink-0 text-ivory/70" />
            )}
            {t.message}
          </div>
        ))}
      </div>

      {pending && <ConfirmDialog options={pending} onSettle={settle} />}
    </UIContext.Provider>
  );
}

function ConfirmDialog({ options, onSettle }: { options: ConfirmOptions; onSettle: (ok: boolean) => void }) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onSettle(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onSettle]);

  return (
    <div
      className="admin-backdrop fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-4"
      onClick={() => onSettle(false)}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="admin-confirm-title"
        className="admin-pop w-full max-w-md border border-white/10 bg-[#0b0b0b] rounded-2xl p-7 sm:p-8 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)]"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-[10px] uppercase tracking-[0.35em] text-ember mb-3">Action définitive</p>
        <h2 id="admin-confirm-title" className="font-display text-[28px] leading-tight text-ivory">
          {options.title}
        </h2>
        {options.body && <p className="mt-3 text-sm leading-relaxed text-white/50">{options.body}</p>}
        <div className="mt-8 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <button
            ref={cancelRef}
            onClick={() => onSettle(false)}
            className="rounded-full px-5 py-3 sm:py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={() => onSettle(true)}
            className="rounded-full px-5 py-3 sm:py-2.5 text-sm bg-ember/90 text-white hover:bg-ember transition-colors"
          >
            {options.confirmLabel ?? "Supprimer"}
          </button>
        </div>
      </div>
    </div>
  );
}

export type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

export function SaveIndicator({ state, onRetry }: { state: SaveState; onRetry: () => void }) {
  const label = {
    idle: "À jour",
    dirty: "Modifié",
    saving: "Enregistrement",
    saved: "Enregistré",
    error: "Échec — réessayer",
  }[state];

  return (
    <button
      type="button"
      onClick={state === "error" ? onRetry : undefined}
      tabIndex={state === "error" ? 0 : -1}
      className={`flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] transition-colors duration-500 ${
        state === "error"
          ? "text-ember cursor-pointer"
          : state === "saved"
            ? "text-ivory cursor-default"
            : "text-white/35 cursor-default"
      }`}
      aria-live="polite"
    >
      <span className="relative flex h-1.5 w-1.5">
        {state === "saving" && (
          <span className="absolute inset-0 rounded-full bg-ivory/70 animate-ping" />
        )}
        <span
          className={`relative h-1.5 w-1.5 rounded-full transition-colors duration-500 ${
            state === "error"
              ? "bg-ember"
              : state === "dirty" || state === "saving"
                ? "bg-ivory/70"
                : state === "saved"
                  ? "bg-ivory"
                  : "bg-white/25"
          }`}
        />
      </span>
      {label}
    </button>
  );
}
