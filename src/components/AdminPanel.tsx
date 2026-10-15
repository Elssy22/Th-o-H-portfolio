"use client";

import { useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { adminApi } from "./admin/api";
import { useDragSort, useOptimisticOrder } from "./admin/hooks";
import { ArrowUpRightIcon, LogoutIcon, PlusIcon } from "./admin/icons";
import ShootCard from "./admin/ShootCard";
import { AdminUIProvider, errorMessage, useAdminUI } from "./admin/ui";

const SHOOT_MIME = "application/x-th-shoot";

function greeting() {
  const h = new Date().getHours();
  if (h < 5 || h >= 18) return "Bonsoir Théo";
  return "Bonjour Théo";
}

function TopBar() {
  const [leaving, setLeaving] = useState(false);

  async function logout() {
    setLeaving(true);
    try {
      await adminApi.logout();
    } finally {
      window.location.reload();
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-wine bg-black/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 sm:px-8 py-4">
        <div className="flex items-baseline gap-3">
          <span className="font-display text-[19px] uppercase tracking-[0.32em] text-ivory">Théo Hamel</span>
          <span className="hidden sm:inline text-[10px] uppercase tracking-[0.35em] text-white/30">
            Atelier
          </span>
        </div>
        <nav className="flex items-center gap-1 sm:gap-5">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-full px-3 py-2 text-xs text-white/55 transition-colors hover:text-ivory"
          >
            <span className="admin-link">Voir le site</span>
            <ArrowUpRightIcon size={13} />
          </a>
          <button
            type="button"
            onClick={logout}
            disabled={leaving}
            className="flex items-center gap-2 rounded-full border border-white/12 px-3 py-2 text-xs text-white/55 transition-all hover:border-white/35 hover:text-ivory disabled:opacity-50"
            aria-label="Se déconnecter"
          >
            <LogoutIcon size={13} />
            <span className="hidden sm:inline">Déconnexion</span>
          </button>
        </nav>
      </div>
    </header>
  );
}

function CreateShoot({ onCreated }: { onCreated: (id: Id<"shoots">) => void }) {
  const { toast } = useAdminUI();
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (creating) return;
    setCreating(true);
    try {
      const { id } = await adminApi.createShoot(title.trim());
      setTitle("");
      toast("Shoot créé — ajoute tes photos");
      onCreated(id);
    } catch (err) {
      toast(errorMessage(err, "Le shoot n'a pas pu être créé"), "error");
    } finally {
      setCreating(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="admin-rise group flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6"
      style={{ "--delay": "160ms" } as React.CSSProperties}
    >
      <label className="admin-underline flex-1 border-b border-white/15 pb-2 transition-colors focus-within:border-white/25">
        <span className="block text-[10px] uppercase tracking-[0.3em] text-white/35">Nouveau shoot</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Nom du prochain shoot…"
          className="mt-1 w-full bg-transparent font-display text-[26px] sm:text-[32px] text-ivory outline-none placeholder:italic placeholder:text-white/20"
        />
      </label>
      <button
        type="submit"
        disabled={creating}
        className="group/btn flex items-center justify-center gap-3 self-stretch sm:self-auto rounded-full bg-ivory px-7 py-3.5 text-[11px] uppercase tracking-[0.28em] text-black transition-all duration-300 hover:bg-white hover:shadow-[0_0_40px_-8px_rgba(237,230,218,0.6)] active:scale-[0.98] disabled:opacity-50"
      >
        <span className="transition-transform duration-500 group-hover/btn:rotate-90">
          <PlusIcon size={14} />
        </span>
        {creating ? "Création…" : "Créer"}
      </button>
    </form>
  );
}

function Dashboard() {
  const shoots = useQuery(api.shoots.list);
  const { toast } = useAdminUI();
  const [openId, setOpenId] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);

  const { ordered, move } = useOptimisticOrder(shoots ?? [], adminApi.reorderShoots, () =>
    toast("Le nouvel ordre n'a pas pu être enregistré", "error")
  );
  const drag = useDragSort(SHOOT_MIME, move);

  const items = ordered.flatMap((s) => s.items);
  const videos = items.filter((i) => i.type === "video").length;
  const hidden = ordered.filter((s) => s.items.length === 0).length;
  const stats = [
    [ordered.length, ordered.length > 1 ? "shoots" : "shoot"],
    [items.length - videos, items.length - videos > 1 ? "photos" : "photo"],
    [videos, videos > 1 ? "vidéos" : "vidéo"],
  ] as const;

  return (
    <>
      <TopBar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 sm:px-8 pb-28">
        <section className="pt-12 sm:pt-20 pb-12 sm:pb-16">
          <p
            className="admin-rise text-[10px] uppercase tracking-[0.4em] text-white/35"
            suppressHydrationWarning
          >
            {greeting()}
          </p>
          <h1
            className="admin-rise mt-4 font-display text-[56px] sm:text-[96px] leading-[0.9] tracking-[-0.01em] text-ivory"
            style={{ "--delay": "60ms" } as React.CSSProperties}
          >
            Les <em className="font-light">shoots</em>
          </h1>
          <dl
            className="admin-rise mt-8 flex flex-wrap gap-x-10 gap-y-4"
            style={{ "--delay": "110ms" } as React.CSSProperties}
          >
            {stats.map(([value, label]) => (
              <div key={label} className="flex items-baseline gap-2">
                <dt className="sr-only">{label}</dt>
                <dd className="font-display text-4xl italic tabular-nums text-ivory">
                  {shoots === undefined ? "–" : value}
                </dd>
                <span className="text-[10px] uppercase tracking-[0.3em] text-white/35">{label}</span>
              </div>
            ))}
            {hidden > 0 && (
              <p className="self-center text-xs text-ember/90">
                {hidden} shoot{hidden > 1 ? "s" : ""} sans photo, donc invisible{hidden > 1 ? "s" : ""} sur le site
              </p>
            )}
          </dl>
        </section>

        <CreateShoot
          onCreated={(id) => {
            setOpenId(id);
            setFocusId(id);
          }}
        />

        <div className="mt-14 sm:mt-20 mb-3 flex items-end justify-between gap-4">
          <h2 className="text-[10px] uppercase tracking-[0.35em] text-white/35">Ordre d&apos;affichage</h2>
          <p className="hidden sm:block text-[11px] text-white/25">Glisse une ligne ou utilise les flèches</p>
        </div>

        {shoots === undefined && (
          <div className="divide-y divide-white/[0.07] border-y border-white/[0.07]">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-5 px-5 py-5">
                <div
                  className="h-[88px] w-[70px] animate-pulse bg-white/[0.05]"
                  style={{ animationDelay: `${i * 120}ms` }}
                />
                <div className="flex-1 space-y-3">
                  <div className="h-6 w-1/3 animate-pulse bg-white/[0.05]" style={{ animationDelay: `${i * 120}ms` }} />
                  <div className="h-2.5 w-24 animate-pulse bg-white/[0.04]" />
                </div>
              </div>
            ))}
          </div>
        )}

        {shoots && shoots.length === 0 && (
          <div className="admin-rise border-y border-white/[0.07] py-20 text-center">
            <p className="font-display text-4xl italic text-ivory/80">Une page blanche.</p>
            <p className="mt-3 text-sm text-white/40">Donne un nom à ton premier shoot juste au-dessus pour commencer.</p>
          </div>
        )}

        {ordered.length > 0 && (
          <div className="divide-y divide-white/[0.07] border-y border-white/[0.07]">
            {ordered.map((shoot, i) => (
              <ShootCard
                key={shoot._id}
                shoot={shoot}
                index={i}
                total={ordered.length}
                open={openId === shoot._id}
                autoFocus={focusId === shoot._id}
                onToggle={() => {
                  setFocusId(null);
                  setOpenId((cur) => (cur === shoot._id ? null : shoot._id));
                }}
                onMove={move}
                drag={{
                  source: drag.sourceProps(i),
                  target: drag.targetProps(i),
                  indicator: drag.indicator(i),
                  dragging: drag.dragIndex === i,
                }}
              />
            ))}
          </div>
        )}

        <p className="mt-10 text-center text-[11px] text-white/25">
          Chaque modification est publiée instantanément sur le site.
        </p>
      </main>
    </>
  );
}

export default function AdminPanel() {
  return (
    <AdminUIProvider>
      <Dashboard />
    </AdminUIProvider>
  );
}
