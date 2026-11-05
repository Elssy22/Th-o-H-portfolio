"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import { adminApi } from "./api";
import { useOptimisticOrder } from "./hooks";
import { EyeOffIcon, PlayIcon, PlusIcon } from "./icons";
import { countLabel } from "./labels";
import { SortableGrid, SortableItem } from "./Sortable";
import { errorMessage, useAdminUI } from "./ui";

function NewShootButton({ className }: { className?: string }) {
  const router = useRouter();
  const { toast } = useAdminUI();
  const [creating, setCreating] = useState(false);

  // Crée un shoot vide et ouvre directement sa page, curseur dans le titre
  async function create() {
    if (creating) return;
    setCreating(true);
    try {
      const { id } = await adminApi.createShoot("");
      router.push(`/admin/shoot/${id}?nouveau=1`);
    } catch (e) {
      toast(errorMessage(e, "Le shoot n'a pas pu être créé"), "error");
      setCreating(false);
    }
  }

  return (
    <button
      type="button"
      onClick={create}
      disabled={creating}
      className={`group/btn flex items-center justify-center gap-2.5 rounded-full bg-ivory px-6 py-3 text-[11px] uppercase tracking-[0.25em] text-black transition-all duration-300 hover:bg-white hover:shadow-[0_0_40px_-8px_rgba(237,230,218,0.6)] active:scale-[0.98] disabled:opacity-60 ${className ?? ""}`}
    >
      <span className="transition-transform duration-500 group-hover/btn:rotate-90">
        <PlusIcon size={14} />
      </span>
      {creating ? "Création…" : "Nouveau shoot"}
    </button>
  );
}

export default function ShootsDashboard() {
  const shoots = useQuery(api.shoots.list);
  const { toast } = useAdminUI();
  const { ordered, move } = useOptimisticOrder(shoots ?? [], adminApi.reorderShoots, () =>
    toast("Le nouvel ordre n'a pas pu être enregistré", "error")
  );

  const items = ordered.flatMap((s) => s.items);
  const videos = items.filter((i) => i.type === "video").length;
  const photos = items.length - videos;
  const hidden = ordered.filter((s) => s.items.length === 0).length;

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 sm:px-8 pt-8 sm:pt-12 pb-28">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div>
          <h1 className="font-display text-[44px] sm:text-[56px] leading-none text-ivory">
            Les <em className="font-light">shoots</em>
          </h1>
          <p className="mt-3 text-[11px] uppercase tracking-[0.25em] text-white/40">
            {shoots === undefined
              ? "Chargement…"
              : `${ordered.length} shoot${ordered.length > 1 ? "s" : ""} · ${photos} photo${photos > 1 ? "s" : ""} · ${videos} vidéo${videos > 1 ? "s" : ""}`}
          </p>
        </div>
        <NewShootButton className="hidden sm:flex" />
      </div>

      {hidden > 0 && (
        <p className="mt-5 flex items-center gap-2 text-xs text-ember/90">
          <EyeOffIcon size={12} />
          {hidden} shoot{hidden > 1 ? "s" : ""} sans photo, donc invisible{hidden > 1 ? "s" : ""} sur le site
        </p>
      )}

      {ordered.length > 1 && (
        <p className="mt-8 text-[11px] text-white/30">
          <span className="admin-touch-only">Maintiens une carte appuyée puis glisse pour changer l&apos;ordre du site.</span>
          <span className="admin-pointer-only">Glisse une carte pour changer l&apos;ordre du site.</span>
        </p>
      )}

      {shoots === undefined && (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-3 gap-y-6 sm:gap-x-5 sm:gap-y-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i}>
              <div
                className="aspect-[4/5] animate-pulse rounded-[3px] bg-white/[0.05]"
                style={{ animationDelay: `${i * 120}ms` }}
              />
              <div className="mt-3 h-5 w-2/3 animate-pulse bg-white/[0.05]" />
            </div>
          ))}
        </div>
      )}

      {shoots && shoots.length === 0 && (
        <div className="admin-rise mt-10 border-y border-white/[0.07] py-20 text-center">
          <p className="font-display text-4xl italic text-ivory/80">Une page blanche.</p>
          <p className="mt-3 text-sm text-white/40">Crée ton premier shoot pour commencer.</p>
        </div>
      )}

      {ordered.length > 0 && (
        <SortableGrid
          ids={ordered.map((s) => s._id)}
          onMove={move}
          className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-3 gap-y-6 sm:gap-x-5 sm:gap-y-8"
        >
          {ordered.map((shoot, i) => {
            const cover = shoot.items[0];
            const empty = shoot.items.length === 0;
            return (
              <SortableItem key={shoot._id} id={shoot._id} label={`${shoot.title || "Sans titre"}, position ${i + 1}`}>
                <Link
                  href={`/admin/shoot/${shoot._id}`}
                  draggable={false}
                  className="group block outline-none focus-visible:ring-1 focus-visible:ring-ivory/60 rounded-[3px]"
                >
                  <div className="admin-card-cover relative aspect-[4/5] overflow-hidden rounded-[3px] bg-white/[0.05]">
                    {cover?.type === "image" && (
                      <img
                        src={cover.url ?? ""}
                        alt=""
                        draggable={false}
                        loading={i < 8 ? "eager" : "lazy"}
                        className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                      />
                    )}
                    {cover?.type === "video" && (
                      <video
                        src={cover.url ? `${cover.url}#t=0.1` : undefined}
                        muted
                        playsInline
                        preload="metadata"
                        className="pointer-events-none h-full w-full object-cover"
                      />
                    )}
                    {empty && (
                      <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 border border-dashed border-white/10 text-white/30">
                        <PlusIcon size={18} />
                        <span className="text-[10px] uppercase tracking-[0.25em]">Ajouter des photos</span>
                      </span>
                    )}
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/50 via-black/0 to-black/0" />
                    <span className="absolute top-2 left-2.5 font-display italic text-[15px] text-white/80">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {cover?.type === "video" && (
                      <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white">
                        <PlayIcon size={10} />
                      </span>
                    )}
                    {empty && (
                      <span className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-ember/90 px-2 py-[3px] text-[9px] uppercase tracking-[0.18em] text-white">
                        <EyeOffIcon size={10} /> Invisible
                      </span>
                    )}
                  </div>
                  <h2
                    className={`mt-3 font-display text-[19px] sm:text-[22px] leading-tight line-clamp-2 ${
                      shoot.title ? "text-ivory" : "italic text-white/35"
                    }`}
                  >
                    {shoot.title || "Sans titre"}
                  </h2>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-white/40">{countLabel(shoot.items)}</p>
                </Link>
              </SortableItem>
            );
          })}
        </SortableGrid>
      )}

      <p className="mt-14 text-center text-[11px] text-white/25">Chaque modification est publiée instantanément sur le site.</p>

      {/* Sur téléphone, le bouton de création reste sous le pouce */}
      <div className="fixed inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black via-black/80 to-transparent px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-8 sm:hidden">
        <NewShootButton className="w-full py-3.5" />
      </div>
    </main>
  );
}
