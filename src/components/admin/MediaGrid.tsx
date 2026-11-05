"use client";

import { useEffect, useRef, useState } from "react";
import type { Id } from "../../../convex/_generated/dataModel";
import { adminApi, uploadMedia } from "./api";
import { formatSize, prepareImage } from "./compress";
import { useOptimisticOrder } from "./hooks";
import { PlayIcon, PlusIcon, StarIcon, TrashIcon, UploadIcon } from "./icons";
import { SortableGrid, SortableItem } from "./Sortable";
import { errorMessage, useAdminUI } from "./ui";

export type MediaItem = { _id: Id<"items">; type: "image" | "video"; order: number; url: string | null };

type Upload = {
  key: number;
  file: File;
  preview: string;
  kind: "image" | "video";
  stage: "waiting" | "optimizing" | "sending" | "failed";
  progress: number;
};

// Au-delà, l'envoi d'une vidéo risque d'être très long (surtout en 4G) : on prévient
const HEAVY_VIDEO = 200 * 1024 * 1024;

function TileButton({
  label,
  onClick,
  tone = "default",
  children,
}: {
  label: string;
  onClick: () => void;
  tone?: "default" | "danger";
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex h-9 w-9 items-center justify-center rounded-full backdrop-blur-md transition-all duration-200 active:scale-90 ${
        tone === "danger"
          ? "bg-black/60 text-white/85 hover:bg-ember hover:text-white"
          : "bg-black/60 text-white/85 hover:bg-ivory hover:text-black"
      }`}
    >
      {children}
    </button>
  );
}

export default function MediaGrid({
  shootId,
  items,
  onUploadingChange,
}: {
  shootId: Id<"shoots">;
  items: MediaItem[];
  onUploadingChange?: (uploading: boolean) => void;
}) {
  const { toast, confirm } = useAdminUI();
  const { ordered, move } = useOptimisticOrder(items, adminApi.reorderItems, () =>
    toast("Le nouvel ordre n'a pas pu être enregistré", "error")
  );

  const [uploads, setUploads] = useState<Upload[]>([]);
  const [fileOver, setFileOver] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const nextKey = useRef(0);

  const busy = uploads.some((u) => u.stage !== "failed");
  useEffect(() => onUploadingChange?.(busy), [busy, onUploadingChange]);

  // Fermer l'onglet pendant un envoi le couperait : le navigateur demande confirmation
  useEffect(() => {
    if (!busy) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [busy]);

  function patchUpload(key: number, patch: Partial<Upload>) {
    setUploads((list) => list.map((u) => (u.key === key ? { ...u, ...patch } : u)));
  }

  function dropUpload(key: number) {
    setUploads((list) => {
      const target = list.find((u) => u.key === key);
      if (target) URL.revokeObjectURL(target.preview);
      return list.filter((u) => u.key !== key);
    });
  }

  // Les fichiers partent un par un pour garder l'ordre de sélection dans le shoot.
  function enqueue(entries: Upload[]) {
    let done = 0;
    let saved = 0;
    for (const entry of entries) {
      patchUpload(entry.key, { stage: "waiting", progress: 0 });
      queue.current = queue.current.then(async () => {
        try {
          let file = entry.file;
          if (entry.kind === "image") {
            patchUpload(entry.key, { stage: "optimizing" });
            file = await prepareImage(entry.file);
            saved += entry.file.size - file.size;
          }
          patchUpload(entry.key, { stage: "sending" });
          await uploadMedia(file, shootId, (p) => patchUpload(entry.key, { progress: p }));
          dropUpload(entry.key);
          done++;
        } catch (e) {
          patchUpload(entry.key, { stage: "failed" });
          toast(errorMessage(e, `Échec de l'envoi de ${entry.file.name}`), "error");
        }
      });
    }
    queue.current = queue.current.then(() => {
      if (done === 0) return;
      const label = done > 1 ? `${done} fichiers ajoutés` : "Fichier ajouté";
      toast(saved > 1024 * 1024 ? `${label} · ${formatSize(saved)} économisés` : label);
    });
  }

  function addFiles(list: FileList | File[] | null) {
    if (!list) return;
    const all = Array.from(list);
    const media = all.filter((f) => f.type.startsWith("image/") || f.type.startsWith("video/"));
    if (media.length < all.length) {
      toast(`${all.length - media.length} fichier(s) ignoré(s) : seulement photos et vidéos`, "error");
    }
    if (fileInput.current) fileInput.current.value = "";
    if (media.length === 0) return;

    const heavy = media.find((f) => f.type.startsWith("video/") && f.size > HEAVY_VIDEO);
    if (heavy) toast(`Vidéo lourde (${formatSize(heavy.size)}) : l'envoi peut prendre plusieurs minutes`);

    const entries: Upload[] = media.map((file) => ({
      key: ++nextKey.current,
      file,
      preview: URL.createObjectURL(file),
      kind: file.type.startsWith("video") ? "video" : "image",
      stage: "waiting",
      progress: 0,
    }));
    setUploads((u) => [...u, ...entries]);
    enqueue(entries);
  }

  async function deleteItem(item: MediaItem) {
    const ok = await confirm({
      title: item.type === "video" ? "Supprimer cette vidéo ?" : "Supprimer cette photo ?",
      body: "Le fichier sera retiré du site et du stockage.",
    });
    if (!ok) return;
    try {
      await adminApi.deleteItem(item._id);
      toast(item.type === "video" ? "Vidéo supprimée" : "Photo supprimée");
    } catch (e) {
      toast(errorMessage(e, "La suppression a échoué"), "error");
    }
  }

  function makeCover(index: number) {
    move(index, 0);
    toast("Nouvelle couverture");
  }

  const hasFiles = (e: React.DragEvent) => e.dataTransfer.types.includes("Files");
  const empty = ordered.length === 0 && uploads.length === 0;

  const picker = (
    <input
      ref={fileInput}
      type="file"
      accept="image/*,video/*"
      multiple
      className="sr-only"
      onChange={(e) => addFiles(e.target.files)}
    />
  );

  return (
    <div
      className="relative"
      onDragOver={(e) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        setFileOver(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFileOver(false);
      }}
      onDrop={(e) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        setFileOver(false);
        addFiles(e.dataTransfer.files);
      }}
    >
      {empty ? (
        <label className="group flex min-h-[260px] sm:min-h-[320px] cursor-pointer flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-white/20 px-6 text-center text-white/55 transition-all duration-300 hover:border-ivory/60 hover:bg-white/[0.02] hover:text-ivory">
          <span className="flex h-14 w-14 items-center justify-center rounded-full border border-current transition-transform duration-500 group-hover:scale-105">
            <UploadIcon size={20} />
          </span>
          <span className="font-display text-[26px] italic text-ivory">Ajoute tes photos</span>
          <span className="max-w-xs text-[13px] leading-relaxed text-white/40">
            <span className="sm:hidden">Touche ici pour choisir des photos ou vidéos.</span>
            <span className="hidden sm:inline">Glisse-les ici, ou clique pour les choisir.</span> Elles sont
            optimisées automatiquement avant l&apos;envoi.
          </span>
          {picker}
        </label>
      ) : (
        <SortableGrid
          ids={ordered.map((i) => i._id)}
          onMove={move}
          className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3"
        >
          {ordered.map((item, i) => (
            <SortableItem
              key={item._id}
              id={item._id}
              label={`${item.type === "video" ? "Vidéo" : "Photo"} ${i + 1}${i === 0 ? ", couverture" : ""}`}
              className="admin-tile group aspect-[4/5] overflow-hidden rounded-[3px] bg-white/[0.04] cursor-grab active:cursor-grabbing"
            >
              {item.type === "image" ? (
                <img
                  src={item.url ?? ""}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                  className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                />
              ) : (
                <video
                  src={item.url ? `${item.url}#t=0.1` : undefined}
                  muted
                  playsInline
                  preload="metadata"
                  className="pointer-events-none h-full w-full object-cover"
                />
              )}

              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/0 to-black/40" />

              <div className="pointer-events-none absolute top-2 left-2.5 right-2.5 flex items-center justify-between">
                <span className="font-display italic text-[15px] text-white/80">{String(i + 1).padStart(2, "0")}</span>
                <span className="flex items-center gap-1.5">
                  {i === 0 && (
                    <span className="rounded-full bg-ivory px-2 py-[3px] text-[9px] uppercase tracking-[0.2em] text-black">
                      Couverture
                    </span>
                  )}
                  {item.type === "video" && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white">
                      <PlayIcon size={10} />
                    </span>
                  )}
                </span>
              </div>

              <div className="admin-tile-actions absolute bottom-2 left-2 right-2 flex items-center justify-end gap-1.5">
                {i !== 0 && (
                  <TileButton label="Choisir comme couverture" onClick={() => makeCover(i)}>
                    <StarIcon size={14} />
                  </TileButton>
                )}
                <TileButton label="Supprimer" onClick={() => deleteItem(item)} tone="danger">
                  <TrashIcon size={14} />
                </TileButton>
              </div>
            </SortableItem>
          ))}

          {uploads.map((u) => (
            <div key={u.key} className="relative aspect-[4/5] overflow-hidden rounded-[3px] bg-white/[0.04]">
              {u.kind === "image" ? (
                <img src={u.preview} alt="" className="h-full w-full object-cover opacity-40 blur-[1px]" />
              ) : (
                <video src={u.preview} muted playsInline className="h-full w-full object-cover opacity-40" />
              )}
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-3 text-center">
                {u.stage === "failed" ? (
                  <>
                    <span className="text-[10px] uppercase tracking-[0.25em] text-ember">Échec</span>
                    <div className="flex gap-3 text-xs">
                      <button type="button" onClick={() => enqueue([u])} className="admin-link text-ivory">
                        Réessayer
                      </button>
                      <button type="button" onClick={() => dropUpload(u.key)} className="admin-link text-white/50">
                        Retirer
                      </button>
                    </div>
                  </>
                ) : u.stage === "sending" ? (
                  <>
                    <span className="font-display text-2xl italic text-ivory tabular-nums">
                      {Math.round(u.progress * 100)}%
                    </span>
                    <span className="max-w-full truncate text-[10px] text-white/50">{u.file.name}</span>
                  </>
                ) : (
                  <span className="text-[10px] uppercase tracking-[0.25em] text-white/60">
                    {u.stage === "optimizing" ? "Optimisation…" : "En attente"}
                  </span>
                )}
              </div>
              {u.stage === "sending" && (
                <div className="absolute inset-x-0 bottom-0 h-[2px] bg-white/10">
                  <div
                    className="h-full bg-ivory transition-[width] duration-300 ease-out"
                    style={{ width: `${Math.max(u.progress, 0.03) * 100}%` }}
                  />
                </div>
              )}
            </div>
          ))}

          <label className="group relative flex aspect-[4/5] cursor-pointer flex-col items-center justify-center gap-3 rounded-[3px] border border-dashed border-white/15 text-white/45 transition-all duration-300 hover:border-ivory/50 hover:bg-white/[0.02] hover:text-ivory">
            <span className="flex h-11 w-11 items-center justify-center rounded-full border border-current transition-transform duration-500 group-hover:rotate-90">
              <PlusIcon size={16} />
            </span>
            <span className="text-center text-[10px] uppercase leading-relaxed tracking-[0.25em]">
              Ajouter
              <br />
              <span className="normal-case tracking-normal text-[11px] text-white/30">photos ou vidéos</span>
            </span>
            {picker}
          </label>
        </SortableGrid>
      )}

      {fileOver && (
        <div className="admin-backdrop pointer-events-none absolute -inset-3 z-10 flex flex-col items-center justify-center gap-3 rounded-lg border border-ivory/60 bg-black/80 backdrop-blur-sm">
          <UploadIcon size={22} className="text-ivory" />
          <p className="font-display text-2xl italic text-ivory">Dépose tes fichiers ici</p>
        </div>
      )}
    </div>
  );
}
