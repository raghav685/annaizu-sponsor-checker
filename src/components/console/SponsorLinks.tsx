import { Globe } from "@phosphor-icons/react/dist/csr/Globe";
import { LinkedinLogo } from "@phosphor-icons/react/dist/csr/LinkedinLogo";
import { SealCheck } from "@phosphor-icons/react/dist/csr/SealCheck";

const GOV_UK_REGISTER_URL = "https://www.gov.uk/government/publications/register-of-licensed-sponsors-workers";

/**
 * Website/LinkedIn icons only render when we hold a verified URL for that
 * specific sponsor (see docs/data-pipeline.md's link-enrichment section) -
 * never a generic search link. A missing icon means "not yet verified," not
 * a broken link; the GOV.UK icon is the one link every row can always show,
 * since it's never a claim about the company itself.
 */
export function SponsorLinks({ name, website, linkedin, className = "" }: { name: string; website?: string | null; linkedin?: string | null; className?: string }) {
  const links: { href: string; label: string; Icon: typeof Globe }[] = [];
  if (website) links.push({ href: website, label: `${name}'s official website`, Icon: Globe });
  if (linkedin) links.push({ href: linkedin, label: `${name} on LinkedIn`, Icon: LinkedinLogo });
  links.push({ href: GOV_UK_REGISTER_URL, label: "View the official GOV.UK register", Icon: SealCheck });

  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      {links.map(({ href, label, Icon }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          title={label}
          aria-label={label}
          onClick={(e) => e.stopPropagation()}
          className="rounded-md p-1 text-mist-dim/70 transition-colors hover:bg-white/5 hover:text-signal"
        >
          <Icon className="h-3.5 w-3.5" />
        </a>
      ))}
    </span>
  );
}
