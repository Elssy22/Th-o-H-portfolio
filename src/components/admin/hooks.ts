"use client";

import { useRef, useState } from "react";

// Affiche immédiatement le nouvel ordre pendant que le serveur l'enregistre.
// Les requêtes sont envoyées les unes après les autres pour que la dernière gagne toujours.
export function useOptimisticOrder<T extends { _id: string }>(
  items: T[],
  persist: (orderedIds: string[]) => Promise<unknown>,
  onError: () => void
) {
  const [override, setOverride] = useState<string[] | null>(null);
  const queue = useRef<Promise<unknown>>(Promise.resolve());

  const serverIds = items.map((i) => i._id);
  const synced =
    override !== null &&
    override.length === serverIds.length &&
    override.every((id, i) => id === serverIds[i]);
  // Le serveur a rattrapé l'ordre local : on rend la main aux données réelles.
  if (synced) setOverride(null);

  let ordered = items;
  if (override && !synced) {
    const byId = new Map(items.map((i) => [i._id, i]));
    const kept = override.flatMap((id) => byId.get(id) ?? []);
    const added = items.filter((i) => !override.includes(i._id));
    ordered = [...kept, ...added];
  }

  function move(from: number, to: number) {
    if (from === to || to < 0 || to >= ordered.length) return;
    const ids = ordered.map((i) => i._id);
    const [moved] = ids.splice(from, 1);
    ids.splice(to, 0, moved);
    setOverride(ids);
    queue.current = queue.current
      .then(() => persist(ids))
      .catch(() => {
        setOverride(null);
        onError();
      });
  }

  return { ordered, move };
}
