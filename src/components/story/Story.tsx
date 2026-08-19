import { Hero } from "./Hero";
import { WhatIsRegister } from "./WhatIsRegister";
import { ScaleSection } from "./ScaleSection";
import { GeographySection } from "./GeographySection";
import { RoutesRatingsSection } from "./RoutesRatingsSection";
import { Handoff } from "./Handoff";
import type { Meta, Stats } from "@/lib/types";

export function Story({ initialMeta, initialStats }: { initialMeta: Meta | null; initialStats: Stats | null }) {
  return (
    <main id="main-content" className="relative">
      <Hero initialMeta={initialMeta} initialStats={initialStats} />
      <WhatIsRegister />
      <ScaleSection initialStats={initialStats} />
      <GeographySection initialStats={initialStats} />
      <RoutesRatingsSection initialStats={initialStats} />
      <Handoff />
    </main>
  );
}
