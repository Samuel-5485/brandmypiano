import { ImageResponse } from "next/og";
import { CONFIG } from "@/config";

export const alt = `${CONFIG.siteName} — ${CONFIG.headline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
          background: "#14110e",
          color: "#f3ece1",
          fontFamily: "Georgia, serif",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 28,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: "#d4b07a",
          }}
        >
          brand my piano
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div
            style={{
              display: "flex",
              fontSize: 72,
              lineHeight: 1.05,
              maxWidth: 900,
            }}
          >
            {CONFIG.headline}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 28,
              color: "#cbbfae",
              maxWidth: 820,
              lineHeight: 1.35,
              fontFamily: "sans-serif",
            }}
          >
            {`${CONFIG.spots.length} sticker spots. Live auction. The money buys a PSR-E383 kit.`}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            color: "#cbbfae",
            fontSize: 24,
            fontFamily: "sans-serif",
          }}
        >
          <span style={{ display: "flex" }}>{CONFIG.handle}</span>
          <span style={{ display: "flex" }}>{`Goal $${CONFIG.goal}`}</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
