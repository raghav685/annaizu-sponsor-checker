import Link from "next/link";
import { breadcrumbListSchema, type Crumb } from "@/lib/seo";

/** Visual breadcrumb nav + its matching BreadcrumbList JSON-LD, from one crumbs array. */
export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbListSchema(crumbs)) }}
      />
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 font-mono text-xs text-mist-dim">
        {crumbs.map((c, i) => {
          const isLast = i === crumbs.length - 1;
          return (
            <span key={c.href} className="flex items-center gap-1.5">
              {i > 0 && (
                <span aria-hidden className="opacity-40">
                  /
                </span>
              )}
              {isLast ? (
                <span className="text-mist-dim/70" aria-current="page">
                  {c.label}
                </span>
              ) : (
                <Link href={c.href} className="hover:text-signal">
                  {c.label}
                </Link>
              )}
            </span>
          );
        })}
      </nav>
    </>
  );
}
