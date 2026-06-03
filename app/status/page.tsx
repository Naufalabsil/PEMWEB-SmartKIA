import { Activity } from "lucide-react";

import { EmptyPage } from "@/components/empty-page";

export default function StatusPage() {
  return (
    <EmptyPage
      icon={<Activity size={44} color="#06a66a" />}
      title="Status Gizi"
      description="Ringkasan status gizi mengikuti hasil z-score WHO dari data pertumbuhan anak."
    />
  );
}
