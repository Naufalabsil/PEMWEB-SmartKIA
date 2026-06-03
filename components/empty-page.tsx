import { MobileShell } from "@/components/mobile-shell";

interface EmptyPageProps {
  title: string;
  description: string;
  icon: React.ReactNode;
}

export function EmptyPage({ title, description, icon }: EmptyPageProps) {
  return (
    <MobileShell nav>
      <div className="empty-screen">
        <div>
          {icon}
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
      </div>
    </MobileShell>
  );
}
