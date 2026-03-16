import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import {
  getBureauMembres,
  getBureauElection,
  getBureauElectionResults,
  getMyBureauVote,
  getCandidatsBureau,
  isBureauMember,
  checkDirectorChange,
} from "./actions";
import { BureauClient } from "@/components/shared/bureau-client";

export const metadata: Metadata = {
  title: "Bureau Directorial — GestionHokkaido",
  description: "Bureau Directorial de l'École d'Exorcisme de Hokkaido.",
};

export default async function BureauPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: _utilisateur } = await supabase
    .from("utilisateurs")
    .select("role, grade_role")
    .eq("id", user.id)
    .single();

  const utilisateur = _utilisateur as {
    role: string;
    grade_role: string | null;
  } | null;

  const isDirector =
    utilisateur?.grade_role === "Directeur" ||
    utilisateur?.grade_role === "Co-Directeur";

  // Auto-check on page load
  await checkDirectorChange();

  // Fetch all data in parallel
  const [membres, election, candidats, userIsMember] = await Promise.all([
    getBureauMembres(),
    getBureauElection(),
    getCandidatsBureau(),
    isBureauMember(user.id),
  ]);

  // Fetch election results and user vote if election is active
  const [electionResults, myVote] = await Promise.all([
    election ? getBureauElectionResults(election.id) : Promise.resolve([]),
    election ? getMyBureauVote(election.id) : Promise.resolve(null),
  ]);

  return (
    <div className="relative min-h-screen bg-[#050a18] overflow-hidden">
      {/* Background blobs */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 select-none">
        <div className="absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full bg-violet-700/15 blur-[120px]" />
        <div className="absolute -bottom-40 -right-16 w-[520px] h-[520px] rounded-full bg-indigo-600/10 blur-[140px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full bg-violet-900/10 blur-[100px]" />
      </div>
      {/* Noise texture */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          backgroundRepeat: "repeat",
          backgroundSize: "160px",
        }}
      />

      <div className="relative z-10 mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8 animate-fade-in">
        <header className="mb-10">
          <p className="text-xs text-white/25 uppercase tracking-widest mb-5 font-medium">
            École d&apos;Exorcisme de Hokkaido&nbsp;&nbsp;/&nbsp;&nbsp;Bureau
          </p>
          <div className="flex items-start gap-4 mb-4">
            <div className="relative flex-shrink-0 mt-1">
              <div className="absolute inset-0 rounded-xl bg-violet-500/20 blur-md" />
              <div className="relative flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-violet-600/30 to-indigo-700/20 ring-1 ring-white/10">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  className="w-6 h-6 text-violet-400"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 0 0 .75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 0 0-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0 1 12 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 0 1-.673-.38m0 0A2.18 2.18 0 0 1 3 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 0 1 3.413-.387m7.5 0V5.25A2.25 2.25 0 0 0 13.5 3h-3a2.25 2.25 0 0 0-2.25 2.25v.894m7.5 0a48.667 48.667 0 0 0-7.5 0M12 12.75h.008v.008H12v-.008Z"
                  />
                </svg>
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">
                Bureau{" "}
                <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
                  Directorial
                </span>
              </h1>
              <p className="mt-2 text-sm text-white/40">
                5 membres : 4 nommés par le Directeur, 1 élu par les membres de l&apos;école.
                {userIsMember && (
                  <span className="ml-2 text-violet-400/70">Vous êtes membre du bureau.</span>
                )}
              </p>
            </div>
          </div>
          <div className="mt-6 h-px bg-gradient-to-r from-violet-500/30 via-white/10 to-transparent" />
        </header>

        <BureauClient
          membres={membres}
          election={election}
          electionResults={electionResults}
          myVote={myVote}
          candidats={candidats}
          isDirector={isDirector}
          isBureauMember={userIsMember}
          userId={user.id}
        />
      </div>
    </div>
  );
}
