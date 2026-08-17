import Link from "next/link";
import { AnnaizuWordmark } from "./AnnaizuMark";

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/80 backdrop-blur-sm">
      <div className="mx-auto flex h-16 w-full max-w-[var(--container-max)] items-center justify-between px-5 md:px-8">
        <Link href="/" aria-label="Annaizu home">
          <AnnaizuWordmark />
        </Link>
        <nav aria-label="Primary" className="flex items-center gap-6 text-sm font-medium">
          <a href="#checker" className="hidden text-ink-muted hover:text-ink sm:inline">
            Check a sponsor
          </a>
          <a href="#learn" className="hidden text-ink-muted hover:text-ink sm:inline">
            About licences
          </a>
          <a href="#faq" className="hidden text-ink-muted hover:text-ink sm:inline">
            FAQ
          </a>
          <a
            href="#checker"
            className="rounded-[var(--radius-sm)] bg-brand px-4 py-2 text-on-brand hover:bg-brand-strong"
          >
            Search now
          </a>
        </nav>
      </div>
    </header>
  );
}
