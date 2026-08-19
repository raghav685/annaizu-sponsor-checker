import { SealCheck } from "@phosphor-icons/react/dist/csr/SealCheck";

const GOV_UK_REGISTER_URL = "https://www.gov.uk/government/publications/register-of-licensed-sponsors-workers";

export function SponsorLinks({ className = "" }: { className?: string }) {
  const links: { href: string; label: string; Icon: typeof SealCheck }[] = [
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
