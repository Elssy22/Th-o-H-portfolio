"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { adminApi } from "./api";
import { ChevronIcon, EyeOffIcon, TrashIcon } from "./icons";
import MediaGrid, { type MediaItem } from "./MediaGrid";
import { countLabel } from "./labels";
import { SaveIndicator, errorMessage, useAdminUI, type SaveState } from "./ui";

type Shoot = {
  _id: Id<"shoots">;
  title: string;
  summary: string;
  items: MediaItem[];
};

// Enregistre titre et résumé tout seuls, 0,9 s après la dernière frappe.
function useAutosave(shoot: Shoot) {
  const { toast } = useAdminUI();
  const [title, setTitle] = useState(shoot.title);
  const [summary, setSummary] = useState(shoot.summary);
  const [state, setState] = useState<SaveState>("idle");
  const latest = useRef({ title: shoot.title, summary: shoot.summary });
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const queue = useRef<Promise<unknown>>(Promise.resolve());

  function flush() {
    clearTimeout(timer.current);
    if (!dirty.current) return queue.current;
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
    return queue.current;
  }

  // En quittant la page, on envoie ce qui a été tapé juste avant au lieu de le perdre
  const flushRef = useRef(flush);
  useEffect(() => {
    flushRef.current = flush;
  });
  useEffect(() => () => void flushRef.current(), []);

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

function Editor({ shoot, position, total, isNew }: { shoot: Shoot; position: number; total: number; isNew: boolean }) {
  const router = useRouter();
  const { toast, confirm } = useAdminUI();
  const meta = useAutosave(shoot);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (isNew) titleRef.current?.focus();
  }, [isNew]);

  // Le titre passe à la ligne au lieu d'être coupé (utile sur téléphone) :
  // la zone de saisie grandit avec le texte
  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [meta.title]);

  // Retour à la liste. Un shoot créé puis laissé complètement vide est supprimé
  // en silence, pour ne pas accumuler des « Sans titre » oubliés.
  async function leave(e?: React.MouseEvent) {
    e?.preventDefault();
    const blank = !meta.title.trim() && !meta.summary.trim() && shoot.items.length === 0 && !uploading;
    if (!blank) {
      await meta.flush();
      router.push("/admin");
      return;
    }
    meta.cancel();
    // On part d'abord, sinon la page afficherait « Ce shoot n'existe plus » un instant
    router.push("/admin");
    adminApi.deleteShoot(shoot._id).catch(() => {
      // pas grave : il restera visible dans la liste et pourra être supprimé à la main
    });
  }

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
    router.push("/admin");
    try {
      await adminApi.deleteShoot(shoot._id);
      toast("Shoot supprimé");
    } catch (e) {
      toast(errorMessage(e, "La suppression a échoué"), "error");
    }
  }

  const hidden = shoot.items.length === 0;

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 sm:px-8 pb-24">
      {/* Barre de navigation du shoot, collée sous la barre du haut */}
      <div className="sticky top-[61px] z-30 -mx-4 sm:-mx-8 flex items-center justify-between gap-3 border-b border-white/[0.06] bg-[#050505]/90 px-4 sm:px-8 py-2.5 backdrop-blur-md">
        <Link
          href="/admin"
          onClick={leave}
          className="-ml-2 flex h-10 items-center gap-1.5 rounded-full pl-2 pr-3 text-[11px] uppercase tracking-[0.22em] text-white/60 transition-colors hover:text-ivory"
        >
          <ChevronIcon direction="left" size={14} />
          Shoots
        </Link>
        <span className="hidden sm:inline text-[10px] uppercase tracking-[0.3em] text-white/25">
          Shoot {String(position).padStart(2, "0")} / {String(total).padStart(2, "0")}
        </span>
        <SaveIndicator state={meta.state} onRetry={meta.flush} />
      </div>

      <section className="pt-8 sm:pt-12">
        <label htmlFor="shoot-title" className="text-[10px] uppercase tracking-[0.3em] text-white/35">
          Titre
        </label>
        <textarea
          id="shoot-title"
          ref={titleRef}
          rows={1}
          value={meta.title}
          // Pas de retour à la ligne dans un titre : Entrée valide
          onChange={(e) => meta.edit({ title: e.target.value.replace(/\n/g, " ") })}
          onBlur={meta.flush}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              e.currentTarget.blur();
            }
          }}
          placeholder="Nom du shoot"
          enterKeyHint="done"
          className="admin-underline mt-2 block w-full resize-none overflow-hidden border-b border-white/10 bg-transparent pb-3 font-display text-[34px] sm:text-[48px] leading-tight text-ivory outline-none placeholder:italic placeholder:text-white/20"
        />

        <div className="mt-7 flex items-baseline justify-between gap-4">
          <label htmlFor="shoot-summary" className="text-[10px] uppercase tracking-[0.3em] text-white/35">
            Résumé
          </label>
          <span className="text-[10px] tabular-nums text-white/25">{meta.summary.length} car.</span>
        </div>
        <textarea
          id="shoot-summary"
          value={meta.summary}
          onChange={(e) => meta.edit({ summary: e.target.value })}
          onBlur={meta.flush}
          rows={2}
          placeholder="Lieu, client, ambiance… Affiché au survol et dans la galerie."
          className="admin-underline mt-2 w-full resize-none border-b border-white/10 bg-transparent pb-3 text-[15px] leading-relaxed text-white/80 outline-none [field-sizing:content] placeholder:text-white/20"
        />
      </section>

      <section className="mt-10">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
          <div>
            <h2 className="text-[10px] uppercase tracking-[0.3em] text-white/35">
              Photos & vidéos <span className="text-white/25">· {countLabel(shoot.items)}</span>
            </h2>
            {shoot.items.length > 1 && (
              <p className="mt-1 text-xs text-white/30">
                La première sert de couverture.{" "}
                <span className="admin-touch-only">Maintiens une photo appuyée pour la déplacer.</span>
                <span className="admin-pointer-only">Glisse les vignettes pour changer l&apos;ordre.</span>
              </p>
            )}
          </div>
          {hidden && (
            <p className="flex items-center gap-1.5 text-xs text-ember/90">
              <EyeOffIcon size={12} /> Invisible sur le site tant qu&apos;il n&apos;y a pas de photo
            </p>
          )}
        </div>
        <MediaGrid shootId={shoot._id} items={shoot.items} onUploadingChange={setUploading} />
      </section>

      <div className="mt-14 flex items-center justify-between gap-4 border-t border-white/[0.07] pt-5">
        <Link
          href="/admin"
          onClick={leave}
          className="admin-link text-xs uppercase tracking-[0.25em] text-white/50 hover:text-ivory"
        >
          Terminé
        </Link>
        <button
          type="button"
          onClick={deleteShoot}
          className="flex items-center gap-2 rounded-full px-3 py-2 text-xs text-white/40 transition-colors hover:bg-ember/10 hover:text-ember"
        >
          <TrashIcon size={13} /> Supprimer ce shoot
        </button>
      </div>
    </main>
  );
}

export default function ShootEditor({ id, isNew }: { id: string; isNew: boolean }) {
  const shoots = useQuery(api.shoots.list);

  if (shoots === undefined) {
    return (
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 sm:px-8 pt-20">
        <div className="h-12 w-2/3 animate-pulse bg-white/[0.05]" />
        <div className="mt-8 h-4 w-1/3 animate-pulse bg-white/[0.04]" />
        <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="aspect-[4/5] animate-pulse bg-white/[0.05]" style={{ animationDelay: `${i * 100}ms` }} />
          ))}
        </div>
      </main>
    );
  }

  const index = shoots.findIndex((s) => s._id === id);
  if (index === -1) {
    return (
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-4 py-24 text-center">
        <p className="font-display text-4xl italic text-ivory/80">Ce shoot n&apos;existe plus.</p>
        <Link href="/admin" className="admin-link mt-6 text-xs uppercase tracking-[0.25em] text-white/60 hover:text-ivory">
          Retour aux shoots
        </Link>
      </main>
    );
  }

  // key : repart d'un état propre si on navigue d'un shoot à un autre
  return <Editor key={id} shoot={shoots[index]} position={index + 1} total={shoots.length} isNew={isNew} />;
}
