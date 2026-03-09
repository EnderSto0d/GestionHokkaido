import { redirect } from "next/navigation";

// Le système multi-personnage a été retiré — redirection vers le profil
export default function CreationPersonnagePage() {
  redirect("/profil");
}
