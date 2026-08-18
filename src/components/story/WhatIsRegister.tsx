import { RevealHeadline } from "./RevealHeadline";

export function WhatIsRegister() {
  return (
    <section className="relative mx-auto flex min-h-[80dvh] max-w-4xl flex-col justify-center px-6 py-24 lg:px-0">
      <RevealHeadline as="h2" className="font-display text-[clamp(1.8rem,4.2vw,3.2rem)] font-semibold leading-tight text-mist">
        A sponsor licence is permission, not a promise. It lets a company sponsor visas. It does not mean they are hiring.
      </RevealHeadline>
      <p className="mt-8 max-w-xl text-base leading-relaxed text-mist-dim">
        Ratings run <span className="text-signal">A</span> and <span className="text-ember">B</span>: A is compliant,
        B means the Home Office found problems and gave the sponsor time to fix them. Licences split into Worker
        (longer routes like Skilled Worker) and Temporary Worker (time-limited routes like Charity Worker or
        Seasonal Worker) - some organisations hold both.
      </p>
    </section>
  );
}
