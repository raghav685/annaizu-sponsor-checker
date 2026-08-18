"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { House } from "@phosphor-icons/react/dist/csr/House";
import { Buildings } from "@phosphor-icons/react/dist/csr/Buildings";
import { MapTrifold } from "@phosphor-icons/react/dist/csr/MapTrifold";
import { FileCsv } from "@phosphor-icons/react/dist/csr/FileCsv";
import { ClockCounterClockwise } from "@phosphor-icons/react/dist/csr/ClockCounterClockwise";
import { FolderOpen } from "@phosphor-icons/react/dist/csr/FolderOpen";
import { Database } from "@phosphor-icons/react/dist/csr/Database";
import { Question } from "@phosphor-icons/react/dist/csr/Question";
import { Info } from "@phosphor-icons/react/dist/csr/Info";
import { ArrowsClockwise } from "@phosphor-icons/react/dist/csr/ArrowsClockwise";
import { CaretDoubleLeft } from "@phosphor-icons/react/dist/csr/CaretDoubleLeft";
import { CaretDoubleRight } from "@phosphor-icons/react/dist/csr/CaretDoubleRight";
import type { Icon } from "@phosphor-icons/react";

const NAV_ITEMS: { href: string; label: string; icon: Icon }[] = [
  { href: "/", label: "Home", icon: House },
  { href: "/#console", label: "Sponsors", icon: Buildings },
  { href: "/map", label: "Map", icon: MapTrifold },
  { href: "/verify", label: "CSV Checker", icon: FileCsv },
  { href: "/changelog", label: "Changelog", icon: ClockCounterClockwise },
  { href: "/browse", label: "Browse", icon: FolderOpen },
  { href: "/methodology", label: "Data & methodology", icon: Database },
  { href: "/faq", label: "FAQs", icon: Question },
  { href: "/about", label: "About", icon: Info },
  { href: "/sync-status", label: "Sync status", icon: ArrowsClockwise },
];

export function AppSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`sticky top-0 z-[40] hidden h-[100dvh] shrink-0 flex-col border-r border-hairline bg-void/95 backdrop-blur-xl lg:flex ${
        collapsed ? "w-16" : "w-60"
      } transition-[width] duration-200`}
    >
      <div className="flex items-center justify-between gap-2 px-4 py-4">
        {!collapsed && (
          <Link href="/" className="truncate font-display text-sm font-semibold text-mist">
            UK Sponsors
          </Link>
        )}
        <button
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="ml-auto shrink-0 rounded-md p-1.5 text-mist-dim hover:bg-white/5 hover:text-mist"
        >
          {collapsed ? <CaretDoubleRight className="h-4 w-4" /> : <CaretDoubleLeft className="h-4 w-4" />}
        </button>
      </div>

      <nav aria-label="Site navigation" className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
        {NAV_ITEMS.map(({ href, label, icon: ItemIcon }) => {
          const isActive = href === "/#console" ? pathname === "/" : href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={`flex items-center gap-3 rounded-lg px-2.5 py-2 font-mono text-xs transition-colors ${
                isActive ? "bg-white/[0.06] text-signal" : "text-mist-dim hover:bg-white/[0.04] hover:text-mist"
              }`}
            >
              <ItemIcon className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
            </Link>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="space-y-1.5 border-t border-hairline px-4 py-4 font-mono text-[10.5px] leading-relaxed text-mist-dim/70">
          <p>Data source: GOV.UK register of licensed sponsors.</p>
          <p>Unofficial mirror, not a Home Office service.</p>
        </div>
      )}
    </aside>
  );
}

export function MobileNavBar() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Site navigation"
      className="sticky top-0 z-[40] flex items-center gap-1 overflow-x-auto border-b border-hairline bg-void/90 px-3 py-2 backdrop-blur-xl lg:hidden"
    >
      {NAV_ITEMS.map(({ href, label }) => {
        const isActive = href === "/#console" ? pathname === "/" : pathname.startsWith(href) && href !== "/";
        return (
          <Link
            key={href}
            href={href}
            className={`shrink-0 whitespace-nowrap rounded-lg px-2.5 py-1.5 font-mono text-xs transition-colors ${
              isActive ? "bg-white/[0.06] text-signal" : "text-mist-dim hover:text-mist"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
