import type { ReactNode } from "react";

import { BottomNav } from "@/components/bottom-nav";

interface MobileShellProps {
  children: ReactNode;
  nav?: boolean;
  scrollable?: boolean;
}

export function MobileShell({
  children,
  nav = false,
  scrollable = true,
}: MobileShellProps) {
  return (
    <main className={`phone-shell${scrollable ? " is-scrollable" : ""}`}>
      {children}
      {nav ? <BottomNav /> : null}
    </main>
  );
}
