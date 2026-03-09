import type { Metadata } from "next";
import { getMissions, canCreateMission, canViewMissionHistory, getEscouadesOptions } from "./actions";
import MissionsPageClient from "./missions-client";

export const metadata: Metadata = {
  title: "Missions — GestionHokkaido",
  description: "Les missions de l'École d'Exorcisme de Hokkaido.",
};

export default async function MissionsPage() {
  const [missions, canCreate, canViewHistory, escouades] = await Promise.all([
    getMissions(),
    canCreateMission(),
    canViewMissionHistory(),
    getEscouadesOptions(),
  ]);

  return (
    <MissionsPageClient
      missions={missions}
      canCreate={canCreate}
      canViewHistory={canViewHistory}
      escouades={escouades}
    />
  );
}


