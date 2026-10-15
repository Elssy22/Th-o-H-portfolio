"use client";

import { useEffect, useRef, useState } from "react";
import type { Id } from "../../../convex/_generated/dataModel";
import { adminApi } from "./api";
import { ChevronIcon, EyeOffIcon, GripIcon, PlayIcon, TrashIcon } from "./icons";
import MediaGrid, { type MediaItem } from "./MediaGrid";
import { SaveIndicator, errorMessage, useAdminUI, type SaveState } from "./ui";

export type Shoot = {
  _id: Id<"shoots">;
  title: string;
  summary: string;
  order: number;
  items: MediaItem[];
};

type DragBindings = {
  source: React.HTMLAttributes<HTMLElement> & { draggable: boolean };
  target: React.HTMLAttributes<HTMLElement>;
  indicator: "before" | "after" | null;
  dragging: boolean;
};

function countLabel(items: MediaItem[]) {
  const photos = items.filter((i) => i.type === "image").length;
  const videos = items.length - photos;
  const parts = [];
  if (photos) parts.push(`${photos} photo${photos > 1 ? "s" : ""}`);
  if (videos) parts.push(`${videos} vidéo${videos > 1 ? "s" : ""}`);
  return parts.join(" · ") || "Vide";
}

function useAutosave(shoot: Shoot) {
  const { toast } = useAdminUI();
  const [title, setTitle] = useState(shoot.title);
  const [summary, setSummary] = useState(shoot.summary);
  const [state, setState] = useState<SaveState>("idle");
  const latest = useRef({ title: shoot.title, summary: shoot.summary });
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const queue = useRef<Promise<unknown>>(Promise.resolve());

  useEffect(() => () => clearTimeout(timer.current), []);

  function flush() {
    clearTimeout(timer.current);
    if (!dirty.current) return;
    dirty.current = false;
    const { title, summary } = latest.current;
    setState("saving");
    queue.current = queue.current.then(async () => {
      try {
        await adminApi.updateShoot(shoot._id, title, summary);
        if (dirty.current) return;
        setState("saved");
        setTimeout(() => setState((s) => (s === "saved" ? "idle" : s)), 2200);
      } catch (e) {
        dirty.current = true;
        setState("error");
        toast(errorMessage(e, "Les modifications n'ont pas été enregistrées"), "error");
      }
    });
  }

  function edit(next: { title?: string; summary?: string }) {
    latest.current = { ...latest.current, ...next };
    if (next.title !== undefined) setTitle(next.title);
    if (next.summary !== undefined) setSummary(next.summary);
    dirty.current = true;
    setState("dirty");
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, 900);
  }

  function cancel() {
    clearTimeout(timer.current);
    dirty.current = false;
  }

  return { title, summary, state, edit, flush, cancel };
}

export default function ShootCard({
  shoot,
  index,
  total,
  open,
  autoFocus,
  onToggle,
  onMove,
  drag,
}: {
  shoot: Shoot;
  index: number;
  total: number;
  open: boolean;
  autoFocus: boolean;
  onToggle: () => void;
  onMove: (from: number, to: number) => void;
  drag: DragBindings;
}) {
  const { toast, confirm } = useAdminUI();
  const meta = useAutosave(shoot);
  const rootRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  // Le contenu n'est monté qu'à la première ouverture (évite de charger toutes les photos)
  const [everOpened, setEverOpened] = useState(open);
  if (open && !everOpened) setEverOpened(true);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      const el = rootRef.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top;
      if (top < 80 || top > window.innerHeight * 0.55) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      if (autoFocus) titleRef.current?.focus({ preventScroll: true });
    }, 380);
    return () => clearTimeout(t);
  }, [open, autoFocus]);

  async function deleteShoot() {
    const ok = await confirm({
      title: `Supprimer « ${meta.title || "Sans titre"} » ?`,
      body:
        shoot.items.length > 0
          ? `Le shoot et ses ${shoot.items.length} fichier${shoot.items.length > 1 ? "s" : ""} seront définitivement supprimés du site.`
          : "Le shoot sera définitivement supprimé.",
      confirmLabel: "Supprimer le shoot",
    });
    if (!ok) return;
    meta.cancel();
    try {
      await adminApi.deleteShoot(shoot._id);
      toast("Shoot supprimé");
    } catch (e) {
      toast(errorMessage(e, "La suppression a échoué"), "error");
    }
  }

  const cover = shoot.items[0];
  const hidden = shoot.items.length === 0;
  const number = String(index + 1).padStart(2, "0");

  return (
    <article
      ref={rootRef}
      {...drag.target}
      className={`relative scroll-mt-24 transition-[background-color,opacity] duration-500 ${
        open ? "bg-white/[0.025]" : "hover:bg-white/[0.015]"
      } ${drag.dragging ? "opacity-30" : ""}`}
    >
      {drag.indicator && (
        <span
          className={`pointer-events-none absolute inset-x-0 z-10 h-px bg-ivory shadow-[0_0_14px_rgba(237,230,218,0.9)] ${
            drag.indicator === "before" ? "-top-px" : "-bottom-px"
          }`}
        />
      )}

      {/* En-tête : toujours visible */}
      <div
        {...drag.source}
        className="group/row flex items-center gap-3 sm:gap-5 px-3 sm:px-5 py-3.5 sm:py-5 cursor-pointer select-none"
        onClick={onToggle}
      >
        <span
          className="hidden sm:flex -mr-2 text-white/20 transition-colors group-hover/row:text-white/50 cursor-grab active:cursor-grabbing"
          title="Glisser pour réordonner"
        >
          <GripIcon size={14} />
        </span>

        <span
          className={`w-6 sm:w-8 shrink-0 font-display italic text-lg sm:text-xl transition-colors duration-500 ${
            open ? "text-ivory" : "text-white/25"
          }`}
        >
          {number}
        </span>

        <div className="relative h-[68px] w-[54px] sm:h-[88px] sm:w-[70px] shrink-0 overflow-hidden rounded-[2px] bg-white/[0.05]">
          {cover?.type === "image" && (
            <img
              src={cover.url ?? ""}
              alt=""
              draggable={false}
              className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover/row:scale-110"
            />
          )}
          {cover?.type === "video" && (
            <>
              <video
                src={cover.url ? `${cover.url}#t=0.1` : undefined}
                muted
                playsInline
                preload="metadata"
                className="h-full w-full object-cover"
              />
              <span className="absolute bottom-1 right-1 text-white/90">
                <PlayIcon size={10} />
              </span>
            </>
          )}
          {!cover && (
            <span className="absolute inset-0 flex items-center justify-center font-display italic text-white/20 text-lg">
              {number}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <button
            type="button"
            aria-expanded={open}
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            className="block w-full text-left outline-none focus-visible:underline"
          >
            <h2
              className={`font-display text-[22px] sm:text-[30px] leading-[1.05] truncate transition-colors duration-500 ${
                meta.title ? "text-ivory" : "italic text-white/35"
              }`}
            >
              {meta.title || "Sans titre"}
            </h2>
          </button>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] uppercase tracking-[0.22em] text-white/40">
            <span>{countLabel(shoot.items)}</span>
            {hidden && (
              <span className="flex items-center gap-1.5 text-ember/90">
                <EyeOffIcon size={11} /> Invisible sur le site
              </span>
            )}
          </div>
          {meta.summary && (
            <p className="hidden md:block mt-2 max-w-xl truncate text-[13px] text-white/40">{meta.summary}</p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3" onClick={(e) => e.stopPropagation()}>
          <div className="flex flex-col gap-1">
            {(
              [
                ["up", -1, "Monter ce shoot", index === 0],
                ["down", 1, "Descendre ce shoot", index === total - 1],
              ] as const
            ).map(([dir, delta, label, disabled]) => (
              <button
                key={dir}
                type="button"
                onClick={() => onMove(index, index + delta)}
                disabled={disabled}
                aria-label={label}
                title={label}
                className="flex h-7 w-7 items-center justify-center rounded-full text-white/45 transition-all hover:bg-white/10 hover:text-white active:scale-90 disabled:opacity-15 disabled:pointer-events-none"
              >
                <ChevronIcon direction={dir} size={13} />
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={onToggle}
            aria-label={open ? "Replier" : "Modifier"}
            className={`flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full border transition-all duration-500 ${
              open
                ? "border-ivory bg-ivory text-black rotate-180"
                : "border-white/15 text-white/60 group-hover/row:border-white/40 group-hover/row:text-white"
            }`}
          >
            <ChevronIcon direction="down" size={14} />
          </button>
        </div>
      </div>

      {/* Contenu éditable */}
      <div className={`admin-collapse ${open ? "is-open" : ""}`}>
        <div inert={!open}>
          {everOpened && (
            <div className="px-4 sm:px-8 lg:pl-[132px] pt-2 pb-10">
              <div className="flex items-center justify-between gap-4 border-t border-white/[0.07] pt-6">
                <span className="text-[10px] uppercase tracking-[0.3em] text-white/35">Titre</span>
                <SaveIndicator state={meta.state} onRetry={meta.flush} />
              </div>
              <input
                ref={titleRef}
                value={meta.title}
                onChange={(e) => meta.edit({ title: e.target.value })}
                onBlur={meta.flush}
                onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                placeholder="Nom du shoot"
                className="admin-underline mt-2 w-full border-b border-white/10 bg-transparent pb-3 font-display text-[34px] sm:text-[44px] leading-tight text-ivory outline-none placeholder:italic placeholder:text-white/20"
              />

              <div className="mt-7 flex items-baseline justify-between gap-4">
                <label
                  htmlFor={`summary-${shoot._id}`}
                  className="text-[10px] uppercase tracking-[0.3em] text-white/35"
                >
                  Résumé
                </label>
                <span className="text-[10px] tabular-nums text-white/25">{meta.summary.length} car.</span>
              </div>
              <textarea
                id={`summary-${shoot._id}`}
                value={meta.summary}
                onChange={(e) => meta.edit({ summary: e.target.value })}
                onBlur={meta.flush}
                rows={3}
                placeholder="Quelques mots sur le shoot : lieu, client, ambiance… Affiché au survol et dans la galerie."
                className="admin-underline mt-2 w-full resize-none border-b border-white/10 bg-transparent pb-3 text-[15px] leading-relaxed text-white/80 outline-none placeholder:text-white/20"
              />

              <div className="mt-10 mb-4 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <span className="text-[10px] uppercase tracking-[0.3em] text-white/35">Photos & vidéos</span>
                  <p className="mt-1 text-xs text-white/30">
                    La première sert de couverture.{" "}
                    <span className="hidden sm:inline">Glisse les vignettes ou des fichiers pour organiser.</span>
                  </p>
                </div>
              </div>
              <MediaGrid shootId={shoot._id} items={shoot.items} />

              <div className="mt-10 flex items-center justify-between gap-4 border-t border-white/[0.07] pt-5">
                <button
                  type="button"
                  onClick={onToggle}
                  className="admin-link text-xs uppercase tracking-[0.25em] text-white/50 hover:text-ivory"
                >
                  Terminé
                </button>
                <button
                  type="button"
                  onClick={deleteShoot}
                  className="flex items-center gap-2 rounded-full px-3 py-2 text-xs text-white/40 transition-colors hover:bg-ember/10 hover:text-ember"
                >
                  <TrashIcon size={13} /> Supprimer ce shoot
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
