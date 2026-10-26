"use client";

function InstagramIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9h4v12H3V9zm7 0h3.6v1.64h.05c.5-.95 1.73-1.95 3.56-1.95 3.81 0 4.51 2.5 4.51 5.76V21h-4v-5.5c0-1.31-.02-3-1.83-3-1.83 0-2.11 1.43-2.11 2.9V21h-4V9z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2.5" y="4.5" width="19" height="15" rx="2" />
      <path d="M3 6l9 7 9-7" />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 10.5 12 3l8.5 7.5" />
      <path d="M5.5 9.5V20a1 1 0 0 0 1 1H9a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1h2.5a1 1 0 0 0 1-1V9.5" />
    </svg>
  );
}

export default function Header() {
  return (
    <header className="header-fade-in sticky top-0 z-50 flex items-center justify-between px-5 py-4 border-b border-[#3a0d12] bg-black/90 backdrop-blur">
      <button
        aria-label="Retour en haut"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className="flex items-center justify-center w-6 text-white hover:opacity-70 transition-opacity"
      >
        <HomeIcon />
      </button>
      <a href="/" className="text-sm tracking-[0.3em] uppercase font-serif absolute left-1/2 -translate-x-1/2">
        Théo Hamel
      </a>
      <div className="flex items-center gap-4 text-white">
        <a
          href="https://instagram.com/_hamelthe_"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Instagram"
          className="hover:opacity-70 transition-opacity"
        >
          <InstagramIcon />
        </a>
        <a
          href="https://www.linkedin.com/in/hamelthe"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="LinkedIn"
          className="hover:opacity-70 transition-opacity"
        >
          <LinkedInIcon />
        </a>
        <a href="/contact" aria-label="Contact" className="hover:opacity-70 transition-opacity">
          <MailIcon />
        </a>
      </div>
    </header>
  );
}
