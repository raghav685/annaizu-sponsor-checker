import { RevealHeadline } from "./RevealHeadline";

export function Handoff() {
  return (
    <section className="relative flex min-h-[60dvh] items-center justify-center px-6 text-center">
      <RevealHeadline as="p" className="font-display text-[clamp(1.6rem,3.5vw,2.6rem)] text-mist-dim">
        Now search it yourself.
      </RevealHeadline>
    </section>
  );
}
