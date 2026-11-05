"use client";

import Link from "next/link";
import { useState } from "react";
import { adminApi } from "./api";
import { ArrowUpRightIcon, LogoutIcon } from "./icons";
import { AdminUIProvider } from "./ui";

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
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-8 py-3">
        <Link href="/admin" className="flex items-baseline gap-3">
          <span className="font-display text-[17px] uppercase tracking-[0.32em] text-ivory">Théo Hamel</span>
          <span className="hidden sm:inline text-[10px] uppercase tracking-[0.35em] text-white/30">Atelier</span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-4">
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
            className="flex h-9 items-center gap-2 rounded-full border border-white/12 px-3 text-xs text-white/55 transition-all hover:border-white/35 hover:text-ivory disabled:opacity-50"
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

// Cadre commun à toutes les pages admin : barre du haut + toasts/confirmations.
// Placé dans le layout, il reste monté quand on passe de la liste à un shoot,
// donc un toast (« Shoot supprimé ») survit au changement de page.
export default function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <AdminUIProvider>
      <TopBar />
      {children}
    </AdminUIProvider>
  );
}
