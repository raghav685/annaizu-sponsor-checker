import type { Metadata } from "next";
import { Bricolage_Grotesque, Public_Sans, IBM_Plex_Mono } from "next/font/google";
import { AppSidebar, MobileNavBar } from "@/components/AppSidebar";
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

const SITE_URL = "https://uk-sponsors-explorer.example";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "UK Licensed Sponsors Explorer",
    template: "%s · UK Licensed Sponsors Explorer",
  },
  description:
    "Search, filter and explore the Home Office register of UK licensed sponsors: 127,000+ organisations approved to sponsor Skilled Worker and other visas, updated from GOV.UK.",
  openGraph: {
    title: "UK Licensed Sponsors Explorer",
    description:
      "Search, filter and explore the Home Office register of UK licensed sponsors, live from GOV.UK.",
    url: SITE_URL,
    siteName: "UK Licensed Sponsors Explorer",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body className="antialiased bg-void text-mist font-body">
        <div className="flex">
          <AppSidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <MobileNavBar />
            <div className="min-w-0 flex-1">{children}</div>
          </div>
        </div>
      </body>
    </html>
  );
}
