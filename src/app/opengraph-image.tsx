import { ImageResponse } from "next/og";
import { loadMetaForFrontend } from "@/lib/dataQueries";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  let totalSponsors = "127,000+";
  try {
    const meta = await loadMetaForFrontend();
    totalSponsors = Number(meta.sponsorCount).toLocaleString();
  } catch {
    // fall back to the default string above
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#0a0d12",
          color: "#e8edf4",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 28, color: "#9aa7b8", letterSpacing: 2 }}>
          UK SPONSORS REGISTER
        </div>
        <div style={{ display: "flex", fontSize: 64, fontWeight: 700, marginTop: 24, lineHeight: 1.1 }}>
          Every company Britain trusts to sponsor a visa.
        </div>
        <div style={{ display: "flex", fontSize: 32, color: "#4fe8c9", marginTop: 32 }}>
          {totalSponsors} sponsors, live from GOV.UK
        </div>
      </div>
    ),
    { ...size }
  );
}
