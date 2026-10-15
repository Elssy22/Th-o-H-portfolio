import Header from "@/components/Header";

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-5xl font-serif mb-4">404</p>
          <p className="text-white/50 mb-6">Cette page n&apos;existe pas.</p>
          <a href="/" className="underline hover:opacity-70 transition-opacity">
            Retour à l&apos;accueil
          </a>
        </div>
      </main>
    </>
  );
}
