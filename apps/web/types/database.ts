// Ce fichier reflète le schéma V2 — système 1:1 (pas de table personnages).
// Les champs personnage sont fusionnés dans `utilisateurs`.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ─── Enums ────────────────────────────────────────────────────────────────────

export type SortsInnes =
  | "Altération Absolue"
  | "Animaux Fantastiques"
  | "Boogie Woogie"
  | "Bourrasque"
  | "Clonage"
  | "Corbeau"
  | "Givre"
  | "Intervalle"
  | "Jardin Floral"
  | "Venin"
  | "Projection Occulte"
  | "Rage Volcanique";

export type Specialites = "Assassin" | "Combattant" | "Support" | "Tank";
export type ArtsMartiaux = "CorpACorp" | "Kenjutsu";

export type Grades =
  | "Classe 4"
  | "Classe 3"
  | "Semi Classe 2"
  | "Classe 2"
  | "Semi Classe 1"
  | "Classe 1"
  | "Semi Classe S"
  | "Classe S"
  | "Classe Apo";

export type GradeRole =
  | "Élève Exorciste"
  | "Exorciste Pro"
  | "Professeur"
  | "Professeur Principal"
  | "Co-Directeur"
  | "Directeur";

export type GradeSecondaire = "Seconde" | "Première" | "Terminal";

export type Divisions =
  | "Judiciaire"
  | "Médical"
  | "Académie"
  | "Scientifique"
  | "Disciplinaire"
  | "Stratégie"
  | "Diplomatie"
  | "Production et Logistique";

export type RolesUtilisateur = "eleve" | "professeur" | "admin";
export type RolesEscouade = "chef" | "membre";
export type StatutInvitation = "en_attente" | "acceptee" | "refusee";
export type TypeSiegeConseil = "elu_eleve" | "elu_joker" | "classement_perso";
export type StatutElection = "en_cours" | "terminee" | "annulee";
export type StatutProposition = "en_cours" | "validee" | "refusee" | "executee" | "rejetee" | "annulee";
export type TypeVoteProposition = "pour" | "contre" | "neutre";
export type TypeProposition = "general" | "derank";
export type RoleDivision = "membre" | "superviseur";

// ─── Helper type : division d'un utilisateur (retourné par la table de jonction) ──
export type UtilisateurDivision = {
  id: string;
  utilisateur_id: string;
  division: Divisions;
  role_division: RoleDivision;
  cree_le: string;
};

export type CompetenceKey =
  | "maitrise_energie_occulte"
  | "sang_froid"
  | "discipline"
  | "intelligence_tactique"
  | "travail_equipe"
  | "premiers_soin"
  | "combat"
  | "initiative"
  | "connaissance_theorique"
  | "pedagogie";

// ─── Database schema (V2 — single-character) ─────────────────────────────────

export interface Database {
  public: {
    Tables: {
      utilisateurs: {
        Row: {
          id: string;
          discord_id: string;
          pseudo: string;
          avatar_url: string | null;
          email: string | null;
          role: RolesUtilisateur;
          grade: Grades | null;
          grade_role: GradeRole | null;
          grade_secondaire: GradeSecondaire | null;
          division: Divisions | null;
          pseudo_custom: boolean;
          avatar_custom: boolean;
          // ─── Champs personnage fusionnés ──────────────
          prenom_rp: string | null;
          nom_rp: string | null;
          sort_inne: SortsInnes | null;
          specialite: Specialites | null;
          art_martial: ArtsMartiaux | null;
          reliques: string | null;
          sub_jutsu: string | null;
          style_combat: string | null;
          // ─────────────────────────────────────────────
          /** Points personnels (missions, evaluations, bonus logistique). */
          points_personnels: number;
          /** Points logistique cumulatifs - jamais remis a zero lors des purges. */
          logistics_points: number;
          /** Bonus logistique actuellement appliqué sur points_personnels (suivi pour recalcul). */
          logistics_bonus_applied: number;
          cree_le: string;
          mis_a_jour_le: string;
        };
        Insert: {
          id?: string;
          discord_id: string;
          pseudo: string;
          avatar_url?: string | null;
          email?: string | null;
          role?: RolesUtilisateur;
          grade?: Grades | null;
          grade_role?: GradeRole | null;
          grade_secondaire?: GradeSecondaire | null;
          division?: Divisions | null;
          pseudo_custom?: boolean;
          avatar_custom?: boolean;
          prenom_rp?: string | null;
          nom_rp?: string | null;
          sort_inne?: SortsInnes | null;
          specialite?: Specialites | null;
          art_martial?: ArtsMartiaux | null;
          reliques?: string | null;
          sub_jutsu?: string | null;
          style_combat?: string | null;
          points_personnels?: number;
          logistics_points?: number;
          logistics_bonus_applied?: number;
        };
        Update: {
          id?: string;
          discord_id?: string;
          pseudo?: string;
          avatar_url?: string | null;
          email?: string | null;
          role?: RolesUtilisateur;
          grade?: Grades | null;
          grade_role?: GradeRole | null;
          grade_secondaire?: GradeSecondaire | null;
          division?: Divisions | null;
          pseudo_custom?: boolean;
          avatar_custom?: boolean;
          prenom_rp?: string | null;
          nom_rp?: string | null;
          sort_inne?: SortsInnes | null;
          specialite?: Specialites | null;
          art_martial?: ArtsMartiaux | null;
          reliques?: string | null;
          sub_jutsu?: string | null;
          style_combat?: string | null;
          points_personnels?: number;
          logistics_points?: number;
          logistics_bonus_applied?: number;
        };
        Relationships: [];
      };
      escouades: {
        Row: {
          id: string;
          nom: string;
          description: string | null;
          url_logo: string | null;
          url_banniere: string | null;
          url_photo_1: string | null;
          url_photo_2: string | null;
          url_photo_3: string | null;
          discord_role_id: string | null;
          proprietaire_id: string;
          points: number;
          cree_le: string;
          mis_a_jour_le: string;
        };
        Insert: {
          id?: string;
          nom: string;
          description?: string | null;
          url_logo?: string | null;
          url_banniere?: string | null;
          url_photo_1?: string | null;
          url_photo_2?: string | null;
          url_photo_3?: string | null;
          discord_role_id?: string | null;
          proprietaire_id: string;
          points?: number;
        };
        Update: {
          id?: string;
          nom?: string;
          description?: string | null;
          url_logo?: string | null;
          url_banniere?: string | null;
          url_photo_1?: string | null;
          url_photo_2?: string | null;
          url_photo_3?: string | null;
          discord_role_id?: string | null;
          proprietaire_id?: string;
          points?: number;
        };
        Relationships: [
          {
            foreignKeyName: "escouades_proprietaire_id_fkey";
            columns: ["proprietaire_id"];
            isOneToOne: false;
            referencedRelation: "utilisateurs";
            referencedColumns: ["id"];
          }
        ];
      };
      membres_escouade: {
        Row: {
          escouade_id: string;
          utilisateur_id: string;
          role_escouade: RolesEscouade;
          rejoint_le: string;
        };
        Insert: {
          escouade_id: string;
          utilisateur_id: string;
          role_escouade?: RolesEscouade;
        };
        Update: {
          escouade_id?: string;
          utilisateur_id?: string;
          role_escouade?: RolesEscouade;
        };
        Relationships: [
          {
            foreignKeyName: "membres_escouade_escouade_id_fkey";
            columns: ["escouade_id"];
            isOneToOne: false;
            referencedRelation: "escouades";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "membres_escouade_utilisateur_id_fkey";
            columns: ["utilisateur_id"];
            isOneToOne: true;
            referencedRelation: "utilisateurs";
            referencedColumns: ["id"];
          }
        ];
      };
      invitations_escouade: {
        Row: {
          id: string;
          escouade_id: string;
          invite_par: string;
          utilisateur_id: string;
          statut: StatutInvitation;
          cree_le: string;
          mis_a_jour_le: string;
        };
        Insert: {
          id?: string;
          escouade_id: string;
          invite_par: string;
          utilisateur_id: string;
          statut?: StatutInvitation;
        };
        Update: {
          id?: string;
          escouade_id?: string;
          invite_par?: string;
          utilisateur_id?: string;
          statut?: StatutInvitation;
        };
        Relationships: [
          {
            foreignKeyName: "invitations_escouade_escouade_id_fkey";
            columns: ["escouade_id"];
            isOneToOne: false;
            referencedRelation: "escouades";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invitations_escouade_invite_par_fkey";
            columns: ["invite_par"];
            isOneToOne: false;
            referencedRelation: "utilisateurs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invitations_escouade_utilisateur_id_fkey";
            columns: ["utilisateur_id"];
            isOneToOne: false;
            referencedRelation: "utilisateurs";
            referencedColumns: ["id"];
          }
        ];
      };
      evaluations: {
        Row: {
          id: string;
          utilisateur_id: string;
          evaluateur_id: string;
          maitrise_energie_occulte: number;
          sang_froid: number;
          discipline: number;
          intelligence_tactique: number;
          travail_equipe: number;
          premiers_soin: number;
          combat: number;
          initiative: number;
          connaissance_theorique: number;
          pedagogie: number;
          commentaire: string | null;
          cree_le: string;
          mis_a_jour_le: string;
        };
        Insert: {
          id?: string;
          utilisateur_id: string;
          evaluateur_id: string;
          maitrise_energie_occulte?: number;
          sang_froid?: number;
          discipline?: number;
          intelligence_tactique?: number;
          travail_equipe?: number;
          premiers_soin?: number;
          combat?: number;
          initiative?: number;
          connaissance_theorique?: number;
          pedagogie?: number;
          commentaire?: string | null;
        };
        Update: {
          id?: string;
          utilisateur_id?: string;
          evaluateur_id?: string;
          maitrise_energie_occulte?: number;
          sang_froid?: number;
          discipline?: number;
          intelligence_tactique?: number;
          travail_equipe?: number;
          premiers_soin?: number;
          combat?: number;
          initiative?: number;
          connaissance_theorique?: number;
          pedagogie?: number;
          commentaire?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "evaluations_utilisateur_id_fkey";
            columns: ["utilisateur_id"];
            isOneToOne: false;
            referencedRelation: "utilisateurs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "evaluations_evaluateur_id_fkey";
            columns: ["evaluateur_id"];
            isOneToOne: false;
            referencedRelation: "utilisateurs";
            referencedColumns: ["id"];
          }
        ];
      };
      evaluations_individuelles: {
        Row: {
          id: string;
          utilisateur_id: string;
          evaluateur_id: string;
          competence: CompetenceKey;
          note: number;
          commentaire: string;
          cree_le: string;
          mis_a_jour_le: string;
        };
        Insert: {
          id?: string;
          utilisateur_id: string;
          evaluateur_id: string;
          competence: CompetenceKey;
          note?: number;
          commentaire: string;
        };
        Update: {
          id?: string;
          utilisateur_id?: string;
          evaluateur_id?: string;
          competence?: CompetenceKey;
          note?: number;
          commentaire?: string;
        };
        Relationships: [
          {
            foreignKeyName: "evaluations_individuelles_utilisateur_id_fkey";
            columns: ["utilisateur_id"];
            isOneToOne: false;
            referencedRelation: "utilisateurs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "evaluations_individuelles_evaluateur_id_fkey";
            columns: ["evaluateur_id"];
            isOneToOne: false;
            referencedRelation: "utilisateurs";
            referencedColumns: ["id"];
          }
        ];
      };
      hauts_faits_escouade: {
        Row: {
          id: string;
          escouade_id: string;
          attribue_par: string;
          points: number;
          raison: string;
          cree_le: string;
        };
        Insert: {
          id?: string;
          escouade_id: string;
          attribue_par: string;
          points: number;
          raison: string;
        };
        Update: {
          id?: string;
          escouade_id?: string;
          attribue_par?: string;
          points?: number;
          raison?: string;
        };
        Relationships: [
          {
            foreignKeyName: "hauts_faits_escouade_escouade_id_fkey";
            columns: ["escouade_id"];
            isOneToOne: false;
            referencedRelation: "escouades";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "hauts_faits_escouade_attribue_par_fkey";
            columns: ["attribue_par"];
            isOneToOne: false;
            referencedRelation: "utilisateurs";
            referencedColumns: ["id"];
          }
        ];
      };
      conseil_membres: {
        Row: {
          id: string;
          utilisateur_id: string;
          type_siege: TypeSiegeConseil;
          est_chef: boolean;
          elu_le: string;
          cree_le: string;
        };
        Insert: {
          id?: string;
          utilisateur_id: string;
          type_siege: TypeSiegeConseil;
          est_chef?: boolean;
          elu_le?: string;
        };
        Update: {
          id?: string;
          utilisateur_id?: string;
          type_siege?: TypeSiegeConseil;
          est_chef?: boolean;
          elu_le?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conseil_membres_utilisateur_id_fkey";
            columns: ["utilisateur_id"];
            isOneToOne: true;
            referencedRelation: "utilisateurs";
            referencedColumns: ["id"];
          }
        ];
      };
      conseil_elections_chef: {
        Row: {
          id: string;
          statut: string;
          debut: string;
          fin: string | null;
          elu_id: string | null;
          cree_par: string;
          cree_le: string;
        };
        Insert: {
          id?: string;
          statut?: string;
          debut?: string;
          fin?: string | null;
          elu_id?: string | null;
          cree_par: string;
        };
        Update: {
          id?: string;
          statut?: string;
          debut?: string;
          fin?: string | null;
          elu_id?: string | null;
          cree_par?: string;
        };
        Relationships: [];
      };
      conseil_votes_chef: {
        Row: {
          id: string;
          election_id: string;
          votant_id: string;
          candidat_id: string;
          cree_le: string;
        };
        Insert: {
          id?: string;
          election_id: string;
          votant_id: string;
          candidat_id: string;
        };
        Update: {
          id?: string;
          election_id?: string;
          votant_id?: string;
          candidat_id?: string;
        };
        Relationships: [];
      };
      conseil_propositions: {
        Row: {
          id: string;
          type: TypeProposition;
          titre: string;
          description: string | null;
          propose_par: string;
          statut: StatutProposition;
          cible_id: string | null;
          duree_ban_heures: number | null;
          resolution_a: string | null;
          execute_apres: string | null;
          cree_le: string;
          mis_a_jour_le: string;
        };
        Insert: {
          id?: string;
          type?: TypeProposition;
          titre: string;
          description?: string | null;
          propose_par: string;
          statut?: StatutProposition;
          cible_id?: string | null;
          duree_ban_heures?: number | null;
        };
        Update: {
          id?: string;
          type?: TypeProposition;
          titre?: string;
          description?: string | null;
          propose_par?: string;
          statut?: StatutProposition;
          cible_id?: string | null;
          duree_ban_heures?: number | null;
          resolution_a?: string | null;
          execute_apres?: string | null;
        };
        Relationships: [];
      };
      conseil_votes_proposition: {
        Row: {
          id: string;
          proposition_id: string;
          votant_id: string;
          vote: TypeVoteProposition;
          cree_le: string;
          mis_a_jour_le: string;
        };
        Insert: {
          id?: string;
          proposition_id: string;
          votant_id: string;
          vote: TypeVoteProposition;
        };
        Update: {
          id?: string;
          proposition_id?: string;
          votant_id?: string;
          vote?: TypeVoteProposition;
        };
        Relationships: [];
      };
      conseil_rankup_bans: {
        Row: {
          id: string;
          utilisateur_id: string;
          proposition_id: string | null;
          interdit_jusqua: string;
          leve_par: string | null;
          leve_le: string | null;
          actif: boolean;
          cree_le: string;
        };
        Insert: {
          id?: string;
          utilisateur_id: string;
          proposition_id?: string | null;
          interdit_jusqua: string;
          leve_par?: string | null;
          actif?: boolean;
        };
        Update: {
          id?: string;
          utilisateur_id?: string;
          proposition_id?: string | null;
          interdit_jusqua?: string;
          leve_par?: string | null;
          leve_le?: string | null;
          actif?: boolean;
        };
        Relationships: [];
      };
      utilisateur_divisions: {
        Row: {
          id: string;
          utilisateur_id: string;
          division: Divisions;
          role_division: RoleDivision;
          cree_le: string;
        };
        Insert: {
          id?: string;
          utilisateur_id: string;
          division: Divisions;
          role_division?: RoleDivision;
        };
        Update: {
          id?: string;
          utilisateur_id?: string;
          division?: Divisions;
          role_division?: RoleDivision;
        };
        Relationships: [
          {
            foreignKeyName: "utilisateur_divisions_utilisateur_id_fkey";
            columns: ["utilisateur_id"];
            isOneToOne: false;
            referencedRelation: "utilisateurs";
            referencedColumns: ["id"];
          }
        ];
      };
      elections_conseil: {
        Row: {
          id: string;
          type: TypeSiegeConseil;
          statut: StatutElection;
          nb_sieges: number;
          debut: string;
          fin: string | null;
          cree_par: string;
          cree_le: string;
        };
        Insert: {
          id?: string;
          type: TypeSiegeConseil;
          statut?: StatutElection;
          nb_sieges?: number;
          debut?: string;
          fin?: string | null;
          cree_par: string;
        };
        Update: {
          id?: string;
          type?: TypeSiegeConseil;
          statut?: StatutElection;
          nb_sieges?: number;
          debut?: string;
          fin?: string | null;
          cree_par?: string;
        };
        Relationships: [
          {
            foreignKeyName: "elections_conseil_cree_par_fkey";
            columns: ["cree_par"];
            isOneToOne: false;
            referencedRelation: "utilisateurs";
            referencedColumns: ["id"];
          }
        ];
      };
      votes_conseil: {
        Row: {
          id: string;
          election_id: string;
          votant_id: string;
          candidat_id: string;
          cree_le: string;
        };
        Insert: {
          id?: string;
          election_id: string;
          votant_id: string;
          candidat_id: string;
        };
        Update: {
          id?: string;
          election_id?: string;
          votant_id?: string;
          candidat_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "votes_conseil_election_id_fkey";
            columns: ["election_id"];
            isOneToOne: false;
            referencedRelation: "elections_conseil";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "votes_conseil_votant_id_fkey";
            columns: ["votant_id"];
            isOneToOne: false;
            referencedRelation: "utilisateurs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "votes_conseil_candidat_id_fkey";
            columns: ["candidat_id"];
            isOneToOne: false;
            referencedRelation: "utilisateurs";
            referencedColumns: ["id"];
          }
        ];
      };
      // ─── Missions ──────────────────────────────────────────────────────────
      missions: {
        Row: {
          id: string;
          createur_id: string;
          titre: string;
          date_heure: string | null;
          capacite: number | null;
          ping_cible: Json;
          points_recompense: number;
          synopsis: string | null;
          discord_message_id: string | null;
          statut: "active" | "terminee" | "annulee";
          cree_le: string;
          mis_a_jour_le: string;
        };
        Insert: {
          id?: string;
          createur_id: string;
          titre: string;
          date_heure?: string | null;
          capacite?: number | null;
          ping_cible?: Json;
          points_recompense?: number;
          synopsis?: string | null;
          discord_message_id?: string | null;
          statut?: "active" | "terminee" | "annulee";
        };
        Update: {
          id?: string;
          createur_id?: string;
          titre?: string;
          date_heure?: string | null;
          capacite?: number | null;
          ping_cible?: Json;
          points_recompense?: number;
          synopsis?: string | null;
          discord_message_id?: string | null;
          statut?: "active" | "terminee" | "annulee";
        };
        Relationships: [
          {
            foreignKeyName: "missions_createur_id_fkey";
            columns: ["createur_id"];
            isOneToOne: false;
            referencedRelation: "utilisateurs";
            referencedColumns: ["id"];
          }
        ];
      };
      participations_mission: {
        Row: {
          id: string;
          mission_id: string;
          utilisateur_id: string;
          present: boolean;
          cree_le: string;
        };
        Insert: {
          id?: string;
          mission_id: string;
          utilisateur_id: string;
          present?: boolean;
        };
        Update: {
          id?: string;
          mission_id?: string;
          utilisateur_id?: string;
          present?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "participations_mission_mission_id_fkey";
            columns: ["mission_id"];
            isOneToOne: false;
            referencedRelation: "missions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "participations_mission_utilisateur_id_fkey";
            columns: ["utilisateur_id"];
            isOneToOne: false;
            referencedRelation: "utilisateurs";
            referencedColumns: ["id"];
          }
        ];
      };
      mission_logs: {
        Row: {
          id: string;
          mission_id: string | null;
          mission_titre: string | null;
          utilisateur_id: string | null;
          utilisateur_pseudo: string | null;
          action: "creation" | "participation" | "depart" | "terminee" | "annulee";
          details: Record<string, unknown>;
          cree_le: string;
        };
        Insert: {
          id?: string;
          mission_id?: string | null;
          mission_titre?: string | null;
          utilisateur_id?: string | null;
          utilisateur_pseudo?: string | null;
          action: "creation" | "participation" | "depart" | "terminee" | "annulee";
          details?: Record<string, unknown>;
          cree_le?: string;
        };
        Update: {
          id?: string;
          mission_id?: string | null;
          mission_titre?: string | null;
          utilisateur_id?: string | null;
          utilisateur_pseudo?: string | null;
          action?: "creation" | "participation" | "depart" | "terminee" | "annulee";
          details?: Record<string, unknown>;
          cree_le?: string;
        };
        Relationships: [
          {
            foreignKeyName: "mission_logs_mission_id_fkey";
            columns: ["mission_id"];
            isOneToOne: false;
            referencedRelation: "missions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "mission_logs_utilisateur_id_fkey";
            columns: ["utilisateur_id"];
            isOneToOne: false;
            referencedRelation: "utilisateurs";
            referencedColumns: ["id"];
          }
        ];
      };
      // ─── Logistics Items (admin-configurable catalog) ──────────────────
      logistics_items: {
        Row: {
          id: string;
          key: string;
          label: string;
          category: string;
          points_per_unit: number;
          actif: boolean;
          cree_le: string;
          mis_a_jour_le: string;
        };
        Insert: {
          id?: string;
          key: string;
          label: string;
          category: string;
          points_per_unit?: number;
          actif?: boolean;
        };
        Update: {
          id?: string;
          key?: string;
          label?: string;
          category?: string;
          points_per_unit?: number;
          actif?: boolean;
        };
        Relationships: [];
      };
      // ─── Donation history ──────────────────────────────────────────────
      dons_logistique: {
        Row: {
          id: string;
          donneur_id: string;
          enregistre_par: string;
          item_id: string | null;
          item_key: string;
          item_label: string;
          quantite: number;
          points_gagnes: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          donneur_id: string;
          enregistre_par: string;
          item_id?: string | null;
          item_key: string;
          item_label: string;
          quantite: number;
          points_gagnes?: number;
        };
        Update: {
          id?: string;
          donneur_id?: string;
          enregistre_par?: string;
          item_id?: string | null;
          item_key?: string;
          item_label?: string;
          quantite?: number;
          points_gagnes?: number;
        };
        Relationships: [
          {
            foreignKeyName: "dons_logistique_donneur_id_fkey";
            columns: ["donneur_id"];
            isOneToOne: false;
            referencedRelation: "utilisateurs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "dons_logistique_enregistre_par_fkey";
            columns: ["enregistre_par"];
            isOneToOne: false;
            referencedRelation: "utilisateurs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "dons_logistique_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "logistics_items";
            referencedColumns: ["id"];
          }
        ];
      };
      // ─── Cours ─────────────────────────────────────────────────────────
      cours: {
        Row: {
          id: string;
          createur_id: string;
          titre: string;
          description: string | null;
          date_heure: string | null;
          capacite: number | null;
          ping_cible: Json;
          discord_message_id: string | null;
          statut: "active" | "termine" | "annule";
          site: string;
          deleted_at: string | null;
          cree_le: string;
          mis_a_jour_le: string;
        };
        Insert: {
          id?: string;
          createur_id: string;
          titre: string;
          description?: string | null;
          date_heure?: string | null;
          capacite?: number | null;
          ping_cible?: Json;
          discord_message_id?: string | null;
          statut?: "active" | "termine" | "annule";
          site?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          createur_id?: string;
          titre?: string;
          description?: string | null;
          date_heure?: string | null;
          capacite?: number | null;
          ping_cible?: Json;
          discord_message_id?: string | null;
          statut?: "active" | "termine" | "annule";
          site?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "cours_createur_id_fkey";
            columns: ["createur_id"];
            isOneToOne: false;
            referencedRelation: "utilisateurs";
            referencedColumns: ["id"];
          }
        ];
      };
      // ─── Participations Cours ──────────────────────────────────────────
      participations_cours: {
        Row: {
          id: string;
          cours_id: string;
          utilisateur_id: string;
          present: boolean;
          site: string;
          cree_le: string;
        };
        Insert: {
          id?: string;
          cours_id: string;
          utilisateur_id: string;
          present?: boolean;
          site?: string;
        };
        Update: {
          id?: string;
          cours_id?: string;
          utilisateur_id?: string;
          present?: boolean;
          site?: string;
        };
        Relationships: [
          {
            foreignKeyName: "participations_cours_cours_id_fkey";
            columns: ["cours_id"];
            isOneToOne: false;
            referencedRelation: "cours";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "participations_cours_utilisateur_id_fkey";
            columns: ["utilisateur_id"];
            isOneToOne: false;
            referencedRelation: "utilisateurs";
            referencedColumns: ["id"];
          }
        ];
      };
      // ─── App configuration key-value store ─────────────────────────────
      app_config: {
        Row: {
          key: string;
          value: string;
        };
        Insert: {
          key: string;
          value: string;
        };
        Update: {
          key?: string;
          value?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      est_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      est_professeur_ou_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      enregistrer_points_logistique: {
        Args: { p_user_id: string; p_points_gained: number };
        Returns: undefined;
      };
    };
    Enums: {
      sorts_innes: SortsInnes;
      specialites: Specialites;
      arts_martiaux: ArtsMartiaux;
      grades: Grades;
      grade_role: GradeRole;
      grade_secondaire: GradeSecondaire;
      divisions: Divisions;
      roles_utilisateur: RolesUtilisateur;
      roles_escouade: RolesEscouade;
      statut_invitation: StatutInvitation;
      type_siege_conseil: TypeSiegeConseil;
      statut_election: StatutElection;
      statut_proposition: StatutProposition;
      type_vote_proposition: TypeVoteProposition;
      type_proposition: TypeProposition;
      role_division: RoleDivision;
    };
  };
}
