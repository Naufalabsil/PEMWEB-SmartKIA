import { UserRound } from "lucide-react";

import { EmptyPage } from "@/components/empty-page";

export default function ProfilPage() {
  return (
    <EmptyPage
      icon={<UserRound size={44} color="#06a66a" />}
      title="Profil Ibu"
      description="Data utama ibu dan keluarga tersambung dari tabel profil ibu di Supabase."
    />
  );
}
