"use client";

import { useQuery } from "convex/react";
import { useEffect, useRef, useState } from "react";
import { api } from "../../convex/_generated/api";
import Header from "@/components/Header";

const LAYOUTS = [
  { key: "list", cols: "grid-cols-1 md:grid-cols-2", icon: "list" },
  { key: "grid", cols: "grid-cols-2 md:grid-cols-4", icon: "grid" },
  { key: "dense", cols: "grid-cols-3 md:grid-cols-6", icon: "dense" },
] as const;

function LayoutIcon({ kind }: { kind: string }) {
  if (kind === "list") {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="2" width="14" height="3" fill="currentColor" />
        <rect x="1" y="7" width="14" height="3" fill="currentColor" />
        <rect x="1" y="12" width="14" height="2" fill="currentColor" />
      </svg>
    );
  }
  if (kind === "grid") {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="1" width="6" height="6" fill="currentColor" />
        <rect x="9" y="1" width="6" height="6" fill="currentColor" />
        <rect x="1" y="9" width="6" height="6" fill="currentColor" />
        <rect x="9" y="9" width="6" height="6" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      {[0, 1, 2].map((r) =>
        [0, 1, 2].map((c) => (
          <rect key={`${r}-${c}`} x={c * 5.5 + 1} y={r * 5.5 + 1} width="4" height="4" fill="currentColor" />
        ))
      )}
    </svg>
  );
}

function useRevealOnScroll(count: number) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.1 }
    );

    refs.current.forEach((el, i) => {
      if (!el) return;
      if (prefersReduced) {
        el.classList.add("is-visible");
        return;
      }
      el.style.transitionDelay = `${Math.min(i % 12, 11) * 40}ms`;
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, [count]);

  return refs;
}

export default function Home() {
  const shoots = useQuery(api.shoots.list);
  const visibleShoots = shoots?.filter((s) => s.items.length > 0) ?? [];

  const [activeShoot, setActiveShoot] = useState<number | null>(null);
  const [activePhoto, setActivePhoto] = useState(0);
  const [closing, setClosing] = useState(false);
  const [layout, setLayout] = useState<typeof LAYOUTS[number]["key"]>("grid");

  const refs = useRevealOnScroll(visibleShoots.length);
  const currentLayout = LAYOUTS.find((l) => l.key === layout) ?? LAYOUTS[1];
  const openShoot = activeShoot !== null ? visibleShoots[activeShoot] : null;

  function openAt(i: number) {
    setClosing(false);
    setActivePhoto(0);
    setActiveShoot(i);
  }

  function closeLightbox() {
    setClosing(true);
    setTimeout(() => {
      setActiveShoot(null);
      setClosing(false);
    }, 250);
  }

  function nextPhoto(e?: React.MouseEvent) {
    e?.stopPropagation();
    if (!openShoot) return;
    setActivePhoto((p) => (p + 1) % openShoot.items.length);
  }

  function prevPhoto(e?: React.MouseEvent) {
    e?.stopPropagation();
    if (!openShoot) return;
    setActivePhoto((p) => (p - 1 + openShoot.items.length) % openShoot.items.length);
  }

  useEffect(() => {
    if (!openShoot) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowRight") nextPhoto();
      if (e.key === "ArrowLeft") prevPhoto();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openShoot]);

  return (
    <>
      <Header />
      <main className="flex-1 pb-20">
        {shoots === undefined && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-[2px]">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[3/4] bg-white/5 animate-pulse"
                style={{ animationDelay: `${(i % 4) * 120}ms` }}
              />
            ))}
          </div>
        )}
        {shoots && visibleShoots.length === 0 && (
          <p className="text-center py-20 text-white/50">
            Le portfolio arrive bientôt.
          </p>
        )}
        <div
          className={`grid ${currentLayout.cols} gap-[2px] select-none`}
          onContextMenu={(e) => e.preventDefault()}
        >
          {visibleShoots.map((shoot, i) => {
            const cover = shoot.items[0];
            return (
              <button
                key={shoot._id}
                ref={(el) => {
                  refs.current[i] = el;
                }}
                onClick={() => openAt(i)}
                className="reveal relative aspect-[3/4] overflow-hidden bg-[#0a0a0a] group"
              >
                {cover.type === "image" ? (
                  <img
                    src={cover.url ?? ""}
                    alt=""
                    draggable={false}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <video
                    src={cover.url ?? ""}
                    muted
                    loop
                    playsInline
                    autoPlay
                    controlsList="nodownload"
                    disablePictureInPicture
                    className="w-full h-full object-cover"
                  />
                )}
                {(shoot.title || shoot.summary) && (
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/55 transition-colors duration-300 flex items-center justify-center">
                    <div className="px-6 opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100 transition-all duration-300 text-center">
                      {shoot.title && (
                        <p className="text-sm uppercase tracking-wide">{shoot.title}</p>
                      )}
                      {shoot.summary && (
                        <p className="text-xs text-white/70 mt-1 line-clamp-4">{shoot.summary}</p>
                      )}
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </main>

      {visibleShoots.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex gap-1 bg-black/80 border border-white/15 rounded-full px-2 py-2 backdrop-blur">
          {LAYOUTS.map((l) => (
            <button
              key={l.key}
              aria-label={l.key}
              onClick={() => setLayout(l.key)}
              className={`p-2 rounded-full transition-colors ${
                layout === l.key ? "bg-white text-black" : "text-white/60 hover:text-white"
              }`}
            >
              <LayoutIcon kind={l.icon} />
            </button>
          ))}
        </div>
      )}

      {openShoot && (
        <div
          className={`lightbox-backdrop fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-6 select-none ${
            closing ? "" : "is-open"
          }`}
          onClick={closeLightbox}
          onContextMenu={(e) => e.preventDefault()}
        >
          {openShoot.items.length > 1 && (
            <button
              onClick={prevPhoto}
              aria-label="Photo précédente"
              className="absolute left-3 md:left-8 top-1/2 -translate-y-1/2 text-white/70 hover:text-white text-3xl px-3 py-2 z-10"
            >
              ‹
            </button>
          )}

          {openShoot.items[activePhoto].type === "image" ? (
            <img
              src={openShoot.items[activePhoto].url ?? ""}
              alt=""
              draggable={false}
              className={`lightbox-media max-h-[80vh] max-w-full object-contain ${closing ? "" : "is-open"}`}
              onClick={(e) => e.stopPropagation()}
              onContextMenu={(e) => e.preventDefault()}
            />
          ) : (
            <video
              src={openShoot.items[activePhoto].url ?? ""}
              controls
              controlsList="nodownload"
              disablePictureInPicture
              autoPlay
              className={`lightbox-media max-h-[80vh] max-w-full object-contain ${closing ? "" : "is-open"}`}
              onClick={(e) => e.stopPropagation()}
              onContextMenu={(e) => e.preventDefault()}
            />
          )}

          {openShoot.items.length > 1 && (
            <button
              onClick={nextPhoto}
              aria-label="Photo suivante"
              className="absolute right-3 md:right-8 top-1/2 -translate-y-1/2 text-white/70 hover:text-white text-3xl px-3 py-2 z-10"
            >
              ›
            </button>
          )}

          {(openShoot.title || openShoot.summary) && (
            <div
              className="absolute bottom-6 left-0 right-0 text-center px-6"
              onClick={(e) => e.stopPropagation()}
            >
              {openShoot.title && <p className="uppercase tracking-wide text-sm">{openShoot.title}</p>}
              {openShoot.summary && (
                <p className="text-white/60 text-xs mt-1 max-w-xl mx-auto">{openShoot.summary}</p>
              )}
            </div>
          )}

          {openShoot.items.length > 1 && (
            <div
              className="absolute top-4 right-4 text-xs text-white/50"
              onClick={(e) => e.stopPropagation()}
            >
              {activePhoto + 1} / {openShoot.items.length}
            </div>
          )}
        </div>
      )}
    </>
  );
}
