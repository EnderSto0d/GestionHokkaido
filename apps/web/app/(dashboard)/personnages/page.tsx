import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Redirection — GestionHokkaido",
};

// Le système multi-personnage a été retiré — redirection vers le profil
export default function PersonnagesPage() {
  redirect("/profil");
}
