import type { Metadata } from "next";
import { getCours, canCreateCours, getEscouadesOptions } from "./actions";
import CoursPageClient from "./cours-client";

export const metadata: Metadata = {
  title: "Cours — GestionHokkaido",
  description: "Les cours de l'École d'Exorcisme de Hokkaido.",
};

export default async function CoursPage() {
  const [cours, canCreate, escouades] = await Promise.all([
    getCours(),
    canCreateCours(),
    getEscouadesOptions(),
  ]);

  return (
    <CoursPageClient
      cours={cours}
      canCreate={canCreate}
      escouades={escouades}
    />
  );
}
