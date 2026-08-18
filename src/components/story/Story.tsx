import { Hero } from "./Hero";
import { WhatIsRegister } from "./WhatIsRegister";
import { ScaleSection } from "./ScaleSection";
import { GeographySection } from "./GeographySection";
import { RoutesRatingsSection } from "./RoutesRatingsSection";
import { Handoff } from "./Handoff";

export function Story() {
  return (
    <div className="relative">
      <Hero />
      <WhatIsRegister />
      <ScaleSection />
      <GeographySection />
      <RoutesRatingsSection />
      <Handoff />
    </div>
  );
}
