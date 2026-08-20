import { ImageResponse } from "next/og";
import { loadMetaForFrontend } from "@/lib/dataQueries";
import { formatNumber } from "@/lib/formatNumber";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  let totalSponsors = "127,000+";
  try {
    const meta = await loadMetaForFrontend();
    totalSponsors = formatNumber(Number(meta.sponsorCount));
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
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              display: "flex",
              width: 34,
              height: 30,
              background: "linear-gradient(135deg, #c3d456 0%, #4f9552 55%, #e68741 100%)",
              clipPath: "polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)",
            }}
          />
          <div style={{ display: "flex", fontSize: 26, fontWeight: 700, letterSpacing: 1 }}>annaizu</div>
        </div>
        <div style={{ display: "flex", fontSize: 26, color: "#9aa7b8", letterSpacing: 2, marginTop: 36 }}>
          SPONSOR CHECKER
        </div>
        <div style={{ display: "flex", fontSize: 58, fontWeight: 700, marginTop: 20, lineHeight: 1.15 }}>
          Check any UK employer&apos;s sponsor licence status in seconds.
        </div>
        <div style={{ display: "flex", fontSize: 30, color: "#4fe8c9", marginTop: 32 }}>
          {totalSponsors} sponsors, synced daily from GOV.UK
        </div>
      </div>
    ),
    { ...size }
  );
}
