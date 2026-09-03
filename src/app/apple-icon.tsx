import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#16120e",
          borderRadius: 32,
        }}
      >
        <svg width="140" height="140" viewBox="0 0 32 32" fill="none">
          <rect x="4" y="10" width="24" height="14" rx="2" stroke="#c4a46a" strokeWidth="1.5" />
          <rect x="6" y="12" width="4.5" height="10" rx="0.5" fill="#f7f3ec" />
          <rect x="11.5" y="12" width="4.5" height="10" rx="0.5" fill="#f7f3ec" />
          <rect x="17" y="12" width="4.5" height="10" rx="0.5" fill="#f7f3ec" />
          <rect x="22.5" y="12" width="3.5" height="10" rx="0.5" fill="#f7f3ec" />
          <rect x="9" y="12" width="2.5" height="6" rx="0.5" fill="#16120e" />
          <rect x="15.5" y="12" width="2.5" height="6" rx="0.5" fill="#16120e" />
          <rect x="22" y="12" width="2" height="6" rx="0.5" fill="#16120e" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
