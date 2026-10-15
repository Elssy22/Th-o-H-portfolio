"use client";

import { useQuery } from "convex/react";
import { useEffect, useRef, useState } from "react";
import { api } from "../../convex/_generated/api";
import { ArrowUpRightIcon, ChevronIcon } from "./admin/icons";

// Les couvertures du portfolio défilent en fondu derrière le formulaire
function CoverSlideshow() {
  const shoots = useQuery(api.shoots.list);
  const covers = (shoots ?? [])
    .map((s) => s.items[0])
    .filter((c) => c?.type === "image" && c.url)
    .slice(0, 6)
    .map((c) => c.url as string);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (covers.length < 2) return;
    const t = setInterval(() => setActive((a) => (a + 1) % covers.length), 6000);
    return () => clearInterval(t);
  }, [covers.length]);

  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      {covers.map((url, i) => (
        <img
          key={url}
          src={url}
          alt=""
          className={`absolute inset-0 h-full w-full object-cover grayscale-[35%] transition-opacity duration-[1800ms] ease-out ${
            i === active ? "admin-kenburns opacity-45" : "scale-[1.18] opacity-0"
          }`}
        />
      ))}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.55)_0%,rgba(0,0,0,0.92)_75%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black" />
    </div>
  );
}

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const fieldRef = useRef<HTMLDivElement>(null);

  function shake() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    fieldRef.current?.animate(
      [0, -6, 6, -6, 6, -3, 0].map((x) => ({ transform: `translateX(${x}px)` })),
      { duration: 480, easing: "cubic-bezier(0.36, 0.07, 0.19, 0.97)" }
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!password || loading) return;
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        setSuccess(true);
        window.location.reload();
        return;
      }
    } catch {
      // réseau indisponible : traité comme un échec
    }
    setError(true);
    setLoading(false);
    shake();
  }

  return (
    <div className="relative flex min-h-[100svh] flex-1 flex-col overflow-hidden">
      <CoverSlideshow />

      <header className="relative z-10 flex items-center justify-between px-5 sm:px-10 py-6">
        <span className="font-display text-[17px] uppercase tracking-[0.32em] text-ivory">Théo Hamel</span>
        <a
          href="/"
          className="flex items-center gap-1.5 text-xs text-white/50 transition-colors hover:text-ivory"
        >
          <span className="admin-link">Retour au site</span>
          <ArrowUpRightIcon size={13} />
        </a>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-6 pb-24">
        <form
          onSubmit={submit}
          className={`w-full max-w-md transition-all duration-700 ${success ? "opacity-0 -translate-y-4" : ""}`}
        >
          <p className="admin-rise text-[10px] uppercase tracking-[0.45em] text-white/40">Atelier — accès privé</p>
          <h1
            className="admin-rise mt-5 font-display text-[64px] sm:text-[84px] leading-[0.9] text-ivory"
            style={{ "--delay": "80ms" } as React.CSSProperties}
          >
            Bon <em className="font-light">retour.</em>
          </h1>

          <div
            className="admin-rise mt-12"
            style={{ "--delay": "180ms" } as React.CSSProperties}
          >
            <label htmlFor="admin-password" className="text-[10px] uppercase tracking-[0.3em] text-white/35">
              Code d&apos;accès
            </label>
            <div
              ref={fieldRef}
              className={`admin-underline mt-2 flex items-center gap-3 border-b pb-2 transition-colors duration-300 ${
                error ? "border-ember/70" : "border-white/20"
              }`}
            >
              <input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(false);
                }}
                autoFocus
                autoComplete="current-password"
                placeholder="••••••••"
                className="min-w-0 flex-1 bg-transparent py-2 text-2xl tracking-[0.3em] text-ivory outline-none placeholder:text-white/15"
              />
              <button
                type="submit"
                disabled={loading || !password}
                aria-label="Entrer"
                className="group flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-ivory/60 text-ivory transition-all duration-300 hover:bg-ivory hover:text-black disabled:border-white/15 disabled:text-white/25 disabled:hover:bg-transparent"
              >
                {loading ? (
                  <span className="h-4 w-4 animate-spin rounded-full border border-current border-t-transparent" />
                ) : (
                  <ChevronIcon
                    direction="right"
                    size={16}
                    className="transition-transform duration-300 group-hover:translate-x-0.5"
                  />
                )}
              </button>
            </div>
            <p
              className={`mt-4 h-5 text-sm transition-opacity duration-300 ${
                error ? "text-ember opacity-100" : "opacity-0"
              }`}
              aria-live="polite"
            >
              Code incorrect, réessaie.
            </p>
          </div>
        </form>
      </main>
    </div>
  );
}
