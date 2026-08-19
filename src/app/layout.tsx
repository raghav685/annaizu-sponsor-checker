import type { Metadata } from "next";
import { Bricolage_Grotesque, Public_Sans, IBM_Plex_Mono } from "next/font/google";
import { AppSidebar, MobileNavBar } from "@/components/AppSidebar";
import { Footer } from "@/components/Footer";
import { PageTransition } from "@/components/providers/PageTransition";
import { SITE_URL } from "@/lib/site";
import { organizationSchema } from "@/lib/seo";
import { loadMetaForFrontend } from "@/lib/dataQueries";
import "./globals.css";

const display = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const body = Public_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const mono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const DESCRIPTION =
  "Search the UK register of licensed Worker and Temporary Worker sponsors. Filter employers by location, route and licence rating using the Annaizu sponsor checker.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  // Plain string, not {default, template}: every page now sets its own complete,
  // brand-inclusive title via buildMetadata() (src/lib/seo.ts), so templating
  // here would just double up the "| Annaizu" suffix already in each title.
  title: "UK Sponsor Licence Checker | Search Licensed Sponsors | Annaizu",
  description: DESCRIPTION,
  keywords: [
    "sponsor licence checker",
    "UK sponsor licence register",
    "sponsorship compliance",
    "Certificate of Sponsorship",
    "CoS",
    "Skilled Worker visa sponsor",
    "Home Office register of licensed sponsors",
    "UK visa sponsor list",
    "Annaizu",
  ],
  authors: [{ name: "Annaizu", url: "https://www.annaizu.com/" }],
  openGraph: {
    title: "UK Sponsor Licence Checker | Search Licensed Sponsors | Annaizu",
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: "annaizu Sponsor Checker",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "UK Sponsor Licence Checker | Search Licensed Sponsors | Annaizu",
    description: DESCRIPTION,
  },
  robots: { index: true, follow: true },
};

// Cheap (loadMetaForFrontend is a couple of count() queries, not a full scan)
// and deduped via React's cache() against any page that also calls it for its
// own JSON-LD - this just makes the sitewide footer's "last updated" line
// accurate on every route instead of only the two that separately fetch the
// full register client-side.
export const revalidate = 300;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const meta = await loadMetaForFrontend().catch(() => null);

  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body className="antialiased bg-void text-mist font-body">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema()) }} />
        <div className="flex">
          <AppSidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <MobileNavBar />
            <div className="min-w-0 flex-1">
              <PageTransition>{children}</PageTransition>
            </div>
            <Footer initialMeta={meta} />
          </div>
        </div>
      </body>
    </html>
  );
}
