import type { Metadata } from "next";
import { Cormorant_Garamond } from "next/font/google";
import { cookies } from "next/headers";
import { SESSION_COOKIE, isValidSession } from "@/lib/adminSession";
import AdminLogin from "@/components/AdminLogin";
import AdminPanel from "@/components/AdminPanel";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Atelier — Théo Hamel",
  robots: { index: false, follow: false },
};

// Serif d'affichage réservée au back office
const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
});

export default async function AdminPage() {
  const cookieStore = await cookies();
  const loggedIn = isValidSession(cookieStore.get(SESSION_COOKIE)?.value);

  return (
    <div className={`${cormorant.variable} admin-grain flex flex-1 flex-col bg-[#050505] selection:bg-ivory selection:text-black`}>
      {loggedIn ? <AdminPanel /> : <AdminLogin />}
    </div>
  );
}
