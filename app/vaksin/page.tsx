import { ShieldCheck } from "lucide-react";

import { EmptyPage } from "@/components/empty-page";

export default function VaksinPage() {
  return (
    <EmptyPage
      icon={<ShieldCheck size={44} color="#06a66a" />}
      title="Vaksinasi Anak"
      description="Jadwal vaksin berikutnya memakai tabel vaksinasi_anak dan ikut reminder H-3/H-1."
    />
  );
}
