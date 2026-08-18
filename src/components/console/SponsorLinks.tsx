import { Globe } from "@phosphor-icons/react/dist/csr/Globe";
import { LinkedinLogo } from "@phosphor-icons/react/dist/csr/LinkedinLogo";
import { SealCheck } from "@phosphor-icons/react/dist/csr/SealCheck";

const GOV_UK_REGISTER_URL = "https://www.gov.uk/government/publications/register-of-licensed-sponsors-workers";

/**
 * The register doesn't include a website or LinkedIn URL for any sponsor, and we have no
 * other source that reliably maps a name to one - so these are honest SEARCH links (Google,
 * LinkedIn's own company search), never a guessed/fabricated direct URL. A wrong search
 * result is obviously not us; a wrong direct link would look like our claim.
 */
export function SponsorLinks({ name, className = "" }: { name: string; className?: string }) {
  const q = encodeURIComponent(name);
  const links = [
    { href: `https://www.google.com/search?q=${q}+official+website`, label: `Search the web for ${name}`, Icon: Globe },
    { href: `https://www.linkedin.com/search/results/companies/?keywords=${q}`, label: `Search LinkedIn for ${name}`, Icon: LinkedinLogo },
    { href: GOV_UK_REGISTER_URL, label: "View the official GOV.UK register", Icon: SealCheck },
  ];

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
