import Link from "next/link";
import { RevealHeadline } from "./RevealHeadline";

export function Handoff() {
  return (
    <section className="relative flex min-h-[60dvh] flex-col items-center justify-center gap-8 px-6 py-24 text-center">
      <RevealHeadline as="p" className="font-display text-[clamp(1.6rem,3.5vw,2.6rem)] text-mist-dim">
        Now search it yourself.
      </RevealHeadline>
      <Link
        href="/sponsors"
        className="inline-flex items-center gap-2 rounded-xl border border-signal/40 bg-signal/10 px-5 py-3 font-mono text-sm text-signal transition-transform duration-150 hover:-translate-y-0.5 hover:bg-signal/20"
      >
        Search licensed sponsors
      </Link>
    </section>
  );
}
