import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ConvexClientProvider from "@/components/ConvexClientProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Théo Hamel",
  description: "Portfolio photo & vidéo de Théo Hamel",
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    title: "Théo Hamel",
    description: "Portfolio photo & vidéo de Théo Hamel",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-black text-white">
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}
