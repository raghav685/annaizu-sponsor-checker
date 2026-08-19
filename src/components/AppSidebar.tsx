"use client";

import { useState } from "react";
import Image from "next/image";
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
import { ArrowSquareOut } from "@phosphor-icons/react/dist/csr/ArrowSquareOut";
import { CaretDown } from "@phosphor-icons/react/dist/csr/CaretDown";
import { CaretDoubleLeft } from "@phosphor-icons/react/dist/csr/CaretDoubleLeft";
import { CaretDoubleRight } from "@phosphor-icons/react/dist/csr/CaretDoubleRight";
import type { Icon } from "@phosphor-icons/react";

type NavItem = { href: string; label: string; icon: Icon; group: "primary" | "secondary" };

// Primary items stay directly visible; secondary (lower-traffic, more technical)
// items sit behind a native <details> disclosure so the desktop sidebar doesn't
// read as 10 flat, equally-weighted links - same collapsible idiom already used
// for "How this is derived" in Sidebar.tsx. Every link stays in the rendered DOM
// either way, so nothing here is hidden from crawlers.
const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home", icon: House, group: "primary" },
  { href: "/sponsors", label: "Sponsors", icon: Buildings, group: "primary" },
  { href: "/map", label: "Map", icon: MapTrifold, group: "primary" },
  { href: "/verify", label: "CSV Checker", icon: FileCsv, group: "primary" },
  { href: "/changelog", label: "Changelog", icon: ClockCounterClockwise, group: "primary" },
  { href: "/browse", label: "Browse", icon: FolderOpen, group: "primary" },
  { href: "/methodology", label: "Data & methodology", icon: Database, group: "secondary" },
  { href: "/faq", label: "FAQs", icon: Question, group: "secondary" },
  { href: "/about", label: "About", icon: Info, group: "secondary" },
  { href: "/sync-status", label: "Sync status", icon: ArrowsClockwise, group: "secondary" },
];

const EMPLOYER_CTA_HREF = "https://www.annaizu.com/";

function isNavItemActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function NavLink({
  href,
  label,
  icon: ItemIcon,
  active,
  collapsed,
}: {
  href: string;
  label: string;
  icon: Icon;
  active: boolean;
  collapsed?: boolean;
}) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className={`flex items-center gap-3 rounded-lg px-2.5 py-2 font-mono text-xs transition-colors ${
        active ? "bg-white/[0.06] text-signal" : "text-mist-dim hover:bg-white/[0.04] hover:text-mist"
      }`}
    >
      <ItemIcon className="h-4 w-4 shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );
}

function EmployerCta({ collapsed }: { collapsed?: boolean }) {
  return (
    <a
      href={EMPLOYER_CTA_HREF}
      target="_blank"
      rel="noopener"
      title={collapsed ? "For Employers" : undefined}
      className="flex items-center gap-3 rounded-lg border border-signal/40 bg-signal/10 px-2.5 py-2 font-mono text-xs text-signal transition-colors hover:bg-signal/20"
    >
      <ArrowSquareOut className="h-4 w-4 shrink-0" />
      {!collapsed && <span className="truncate">For Employers</span>}
    </a>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const primaryItems = NAV_ITEMS.filter((i) => i.group === "primary");
  const secondaryItems = NAV_ITEMS.filter((i) => i.group === "secondary");
  const secondaryHasActive = secondaryItems.some((i) => isNavItemActive(pathname, i.href));

  return (
    <aside
      className={`sticky top-0 z-[40] hidden h-[100dvh] shrink-0 flex-col border-r border-hairline bg-void/95 backdrop-blur-xl lg:flex ${
        collapsed ? "w-16" : "w-60"
      } transition-[width] duration-200`}
    >
      <div className="flex items-center justify-between gap-2 px-4 py-4">
        <Link href="/" className="shrink-0">
          {collapsed ? (
            <Image src="/brand/annaizu-mark-square.png" alt="Annaizu" width={70} height={70} className="h-7 w-7" priority />
          ) : (
            <Image src="/brand/annaizu-logo-dark-bg.png" alt="Annaizu" width={344} height={53} className="h-6 w-auto" priority />
          )}
        </Link>
        <button
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="ml-auto shrink-0 rounded-md p-1.5 text-mist-dim hover:bg-white/5 hover:text-mist"
        >
          {collapsed ? <CaretDoubleRight className="h-4 w-4" /> : <CaretDoubleLeft className="h-4 w-4" />}
        </button>
      </div>

      <nav aria-label="Site navigation" className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {primaryItems.map((item) => (
          <NavLink key={item.href} {...item} active={isNavItemActive(pathname, item.href)} collapsed={collapsed} />
        ))}

        <EmployerCta collapsed={collapsed} />

        <details className="group" open={secondaryHasActive}>
          <summary
            className="flex cursor-pointer select-none items-center gap-3 rounded-lg px-2.5 py-2 font-mono text-xs text-mist-dim transition-colors marker:content-none hover:bg-white/[0.04] hover:text-mist"
            title={collapsed ? "More" : undefined}
          >
            <CaretDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" />
            {!collapsed && <span className="flex-1 truncate">More</span>}
          </summary>
          <div className="mt-1 space-y-1">
            {secondaryItems.map((item) => (
              <NavLink key={item.href} {...item} active={isNavItemActive(pathname, item.href)} collapsed={collapsed} />
            ))}
          </div>
        </details>
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

function MobileNavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`shrink-0 whitespace-nowrap rounded-lg px-2.5 py-1.5 font-mono text-xs transition-colors ${
        active ? "bg-white/[0.06] text-signal" : "text-mist-dim hover:text-mist"
      }`}
    >
      {label}
    </Link>
  );
}

export function MobileNavBar() {
  const pathname = usePathname();
  const primaryItems = NAV_ITEMS.filter((i) => i.group === "primary");
  const secondaryItems = NAV_ITEMS.filter((i) => i.group === "secondary");
  const secondaryHasActive = secondaryItems.some((i) => isNavItemActive(pathname, i.href));

  return (
    <nav
      aria-label="Site navigation"
      className="sticky top-0 z-[40] flex items-center gap-1 border-b border-hairline bg-void/90 px-3 py-2 backdrop-blur-xl lg:hidden"
    >
      <Link href="/" className="mr-1 shrink-0">
        <Image src="/brand/annaizu-mark-square.png" alt="Annaizu" width={70} height={70} className="h-6 w-6" />
      </Link>
      <div className="flex flex-1 items-center gap-1 overflow-x-auto">
        {primaryItems.map(({ href, label }) => (
          <MobileNavLink key={href} href={href} label={label} active={isNavItemActive(pathname, href)} />
        ))}
        <a
          href={EMPLOYER_CTA_HREF}
          target="_blank"
          rel="noopener"
          className="shrink-0 whitespace-nowrap rounded-lg border border-signal/40 bg-signal/10 px-2.5 py-1.5 font-mono text-xs text-signal"
        >
          For Employers
        </a>
        {/* The dropdown panel is `fixed`, not `absolute` - it escapes this row's
            own overflow-x-auto clipping (backdrop-blur/backdrop-filter on this
            <nav> does NOT establish a containing block for fixed descendants,
            only `filter`/`transform`/`perspective`/`will-change` do), so it
            renders as a real sheet below the bar instead of being cut off. */}
        <details className={`group relative shrink-0 ${secondaryHasActive ? "text-signal" : ""}`}>
          <summary
            className={`flex cursor-pointer select-none items-center gap-1 whitespace-nowrap rounded-lg px-2.5 py-1.5 font-mono text-xs transition-colors marker:content-none ${
              secondaryHasActive ? "bg-white/[0.06] text-signal" : "text-mist-dim hover:text-mist"
            }`}
          >
            More
            <CaretDown className="h-3 w-3 shrink-0 transition-transform group-open:rotate-180" />
          </summary>
          <div className="fixed left-3 right-3 top-[52px] z-50 space-y-1 rounded-xl border border-hairline-strong bg-void/95 p-2 shadow-xl backdrop-blur-xl">
            {secondaryItems.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`block rounded-lg px-3 py-2 font-mono text-xs transition-colors ${
                  isNavItemActive(pathname, href) ? "bg-white/[0.06] text-signal" : "text-mist-dim hover:bg-white/[0.04] hover:text-mist"
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
        </details>
      </div>
    </nav>
  );
}
