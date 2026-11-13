"use client";

import { useQuery } from "convex/react";
import { createContext, useContext } from "react";
import { api } from "../../../convex/_generated/api";

// Jeton de lecture des brouillons, calculé côté serveur dans le layout admin
// (voir src/lib/adminSession.ts et convex/lib/readToken.ts).
const ReadTokenContext = createContext<string | null>(null);

export function ReadTokenProvider({ token, children }: { token: string; children: React.ReactNode }) {
  return <ReadTokenContext.Provider value={token}>{children}</ReadTokenContext.Provider>;
}

// Tous les shoots, brouillons compris, mis à jour en temps réel.
// undefined pendant le chargement.
export function useAdminShoots() {
  const readToken = useContext(ReadTokenContext);
  if (readToken === null) throw new Error("useAdminShoots doit être utilisé dans <ReadTokenProvider>");
  return useQuery(api.shoots.listAll, { readToken });
}

export type AdminShoot = NonNullable<ReturnType<typeof useAdminShoots>>[number];
