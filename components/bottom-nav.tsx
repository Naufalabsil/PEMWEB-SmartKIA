"use client";

import { Activity, Home, ShieldCheck, Syringe, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/beranda", label: "Beranda", icon: Home },
  { href: "/profil", label: "Profil", icon: UserRound },
  { href: "/kb", label: "KB", icon: Syringe },
  { href: "/vaksin", label: "Vaksin", icon: ShieldCheck },
  { href: "/status", label: "Status", icon: Activity },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav" aria-label="Menu utama">
      {items.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href;

        return (
          <Link key={item.href} className={`nav-item${active ? " active" : ""}`} href={item.href}>
            <Icon size={18} strokeWidth={active ? 2.8 : 2.2} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
