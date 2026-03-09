import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GestionHokkaido — École d'Exorcisme de Hokkaido",
  description:
    "Plateforme de gestion du roleplay Jujutsu Kaisen — Missions, personnages, grades.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className="dark">
      <body className={`${inter.className} bg-[#0a0505] antialiased`}>{children}</body>
    </html>
  );
}
