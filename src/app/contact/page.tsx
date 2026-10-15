import Header from "@/components/Header";

export default function Contact() {
  return (
    <>
      <Header />
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="text-center">
          <p className="uppercase tracking-widest text-sm text-white/50 mb-4">Contact</p>
          <a
            href="mailto:hamelthe@icloud.com"
            className="text-2xl md:text-3xl font-serif hover:opacity-70 transition-opacity"
          >
            hamelthe@icloud.com
          </a>
        </div>
      </main>
    </>
  );
}
