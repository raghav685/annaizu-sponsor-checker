import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { CheckerSection } from "@/components/CheckerSection";
import { EducationSection } from "@/components/EducationSection";
import { FAQSection } from "@/components/FAQSection";
import { Footer } from "@/components/Footer";
import { SmoothScroll } from "@/components/SmoothScroll";
import { SponsorSearchProvider } from "@/context/SponsorSearchContext";

export default function Home() {
  return (
    <SponsorSearchProvider>
      <SmoothScroll />
      <Header />
      <main className="flex flex-1 flex-col">
        <Hero />
        <CheckerSection />
        <EducationSection />
        <FAQSection />
      </main>
      <Footer />
    </SponsorSearchProvider>
  );
}
