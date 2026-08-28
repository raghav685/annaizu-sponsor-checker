"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { House } from "@phosphor-icons/react/dist/csr/House";
import { Buildings } from "@phosphor-icons/react/dist/csr/Buildings";
import { MapTrifold } from "@phosphor-icons/react/dist/csr/MapTrifold";
import { FileCsv } from "@phosphor-icons/react/dist/csr/FileCsv";
import { FolderOpen } from "@phosphor-icons/react/dist/csr/FolderOpen";
import { Database } from "@phosphor-icons/react/dist/csr/Database";
import { Question } from "@phosphor-icons/react/dist/csr/Question";
import { Info } from "@phosphor-icons/react/dist/csr/Info";
import { ArrowSquareOut } from "@phosphor-icons/react/dist/csr/ArrowSquareOut";
import { CaretDown } from "@phosphor-icons/react/dist/csr/CaretDown";
import { CaretDoubleLeft } from "@phosphor-icons/react/dist/csr/CaretDoubleLeft";
import { CaretDoubleRight } from "@phosphor-icons/react/dist/csr/CaretDoubleRight";
import type { Icon } from "@phosphor-icons/react";

type NavItem = { href: string; label: string; icon: Icon; group: "primary" | "resources" };

// Primary items stay directly visible; resources sit in their own labelled group below -
// same idea as the old click-to-expand "More" disclosure (don't let the sidebar read as N
// flat, equally-weighted links), but always-rendered under a section label instead of
// hidden behind a toggle - the more familiar pattern (Linear/Notion/Vercel-style sidebars).
// Every link stays in the rendered DOM either way, so nothing here is hidden from crawlers.
const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Overview", icon: House, group: "primary" },
  { href: "/sponsors", label: "Directory", icon: Buildings, group: "primary" },
  { href: "/map", label: "Coverage", icon: MapTrifold, group: "primary" },
  { href: "/verify", label: "Verify", icon: FileCsv, group: "primary" },
  { href: "/browse", label: "Explore", icon: FolderOpen, group: "primary" },
  { href: "/methodology", label: "Methodology", icon: Database, group: "resources" },
  { href: "/faq", label: "Help center", icon: Question, group: "resources" },
  { href: "/about", label: "About", icon: Info, group: "resources" },
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
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm transition-colors ${
        active ? "bg-signal/10 text-signal" : "text-mist-dim hover:bg-white/[0.04] hover:text-mist"
      }`}
    >
      <ItemIcon weight={active ? "fill" : "regular"} className="h-[18px] w-[18px] shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );
}

function SectionLabel({ children, collapsed }: { children: string; collapsed?: boolean }) {
  if (collapsed) return <div className="my-2 border-t border-hairline" />;
  return <p className="px-2.5 pb-1 pt-4 text-[11px] font-medium uppercase tracking-wide text-mist-dim/50">{children}</p>;
}

function EmployerCta({ collapsed }: { collapsed?: boolean }) {
  return (
    <a
      href={EMPLOYER_CTA_HREF}
      target="_blank"
      rel="noopener"
      title={collapsed ? "Employer portal" : undefined}
      className="flex items-center gap-3 rounded-lg border border-signal/40 bg-signal/10 px-2.5 py-2.5 text-sm text-signal transition-colors hover:bg-signal/20"
    >
      <ArrowSquareOut weight="bold" className="h-[18px] w-[18px] shrink-0" />
      {!collapsed && <span className="truncate">Employer portal</span>}
    </a>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const primaryItems = NAV_ITEMS.filter((i) => i.group === "primary");
  const resourceItems = NAV_ITEMS.filter((i) => i.group === "resources");

  return (
    <aside
      className={`sticky top-0 z-[var(--z-nav)] hidden h-[100dvh] shrink-0 flex-col border-r border-hairline bg-void/95 backdrop-blur-xl lg:flex ${
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

      <nav aria-label="Site navigation" className="flex-1 space-y-1 overflow-y-auto px-3 py-1">
        {primaryItems.map((item) => (
          <NavLink key={item.href} {...item} active={isNavItemActive(pathname, item.href)} collapsed={collapsed} />
        ))}

        <div className="pt-2">
          <EmployerCta collapsed={collapsed} />
        </div>

        <SectionLabel collapsed={collapsed}>Resources</SectionLabel>
        {resourceItems.map((item) => (
          <NavLink key={item.href} {...item} active={isNavItemActive(pathname, item.href)} collapsed={collapsed} />
        ))}
      </nav>

      {!collapsed && (
        <div className="space-y-1.5 border-t border-hairline px-4 py-4 text-[11px] leading-relaxed text-mist-dim/70">
          <p>Data source: GOV.UK register of licensed sponsors.</p>
          <p>Unofficial mirror, not a Home Office service.</p>
        </div>
      )}
    </aside>
  );
}

function MobileNavLink({ href, label, icon: ItemIcon, active }: { href: string; label: string; icon: Icon; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-2.5 text-sm transition-colors ${
        active ? "bg-signal/10 text-signal" : "text-mist-dim hover:text-mist"
      }`}
    >
      <ItemIcon weight={active ? "fill" : "regular"} className="h-4 w-4 shrink-0" />
      {label}
    </Link>
  );
}

export function MobileNavBar() {
  const pathname = usePathname();
  const primaryItems = NAV_ITEMS.filter((i) => i.group === "primary");
  const resourceItems = NAV_ITEMS.filter((i) => i.group === "resources");
  const resourcesHasActive = resourceItems.some((i) => isNavItemActive(pathname, i.href));

  return (
    <nav
      aria-label="Site navigation"
      className="sticky top-0 z-[var(--z-nav)] flex items-center gap-1 border-b border-hairline bg-void/90 px-3 py-2 backdrop-blur-xl lg:hidden"
    >
      <Link href="/" className="mr-1 flex shrink-0 items-center justify-center p-2.5">
        <Image src="/brand/annaizu-mark-square.png" alt="Annaizu" width={70} height={70} className="h-6 w-6" />
      </Link>
      <div className="flex flex-1 items-center gap-1 overflow-x-auto">
        {primaryItems.map((item) => (
          <MobileNavLink key={item.href} {...item} active={isNavItemActive(pathname, item.href)} />
        ))}
        <a
          href={EMPLOYER_CTA_HREF}
          target="_blank"
          rel="noopener"
          className="shrink-0 whitespace-nowrap rounded-lg border border-signal/40 bg-signal/10 px-2.5 py-2.5 text-sm text-signal"
        >
          Employer portal
        </a>
        {/* The dropdown panel is `fixed`, not `absolute` - it escapes this row's
            own overflow-x-auto clipping (backdrop-blur/backdrop-filter on this
            <nav> does NOT establish a containing block for fixed descendants,
            only `filter`/`transform`/`perspective`/`will-change` do), so it
            renders as a real sheet below the bar instead of being cut off. */}
        <details className={`group relative shrink-0 ${resourcesHasActive ? "text-signal" : ""}`}>
          <summary
            className={`flex cursor-pointer select-none items-center gap-1 whitespace-nowrap rounded-lg px-2.5 py-2.5 text-sm transition-colors marker:content-none ${
              resourcesHasActive ? "bg-signal/10 text-signal" : "text-mist-dim hover:text-mist"
            }`}
          >
            Resources
            <CaretDown className="h-3 w-3 shrink-0 transition-transform group-open:rotate-180" />
          </summary>
          <div className="fixed left-3 right-3 top-[52px] z-50 hidden space-y-1 rounded-xl border border-hairline-strong bg-void/95 p-2 shadow-xl backdrop-blur-xl group-open:block">
            {resourceItems.map(({ href, label, icon: ItemIcon }) => (
              <Link
                key={href}
                href={href}
                aria-current={isNavItemActive(pathname, href) ? "page" : undefined}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-3 text-sm transition-colors ${
                  isNavItemActive(pathname, href) ? "bg-signal/10 text-signal" : "text-mist-dim hover:bg-white/[0.04] hover:text-mist"
                }`}
              >
                <ItemIcon weight={isNavItemActive(pathname, href) ? "fill" : "regular"} className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            ))}
          </div>
        </details>
      </div>
    </nav>
  );
}
