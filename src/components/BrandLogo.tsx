"use client";

import { useEffect, useState } from "react";
import { avatarColor, brandInitial } from "@/lib/logo";

type Props = {
  brandName: string;
  logoUrl?: string | null;
  className?: string;
  /** Extra class on the img / letter face */
  mediaClassName?: string;
  alt?: string;
  /**
   * Knock near-white pixels to transparent when possible (canvas),
   * otherwise fall back to mix-blend-multiply.
   */
  knockoutWhite?: boolean;
};

function knockOutWhite(source: HTMLImageElement): string | null {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = source.naturalWidth || source.width;
    canvas.height = source.naturalHeight || source.height;
    if (!canvas.width || !canvas.height) return null;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(source, 0, 0);
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const { data } = image;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      // Near-white / light cream → transparent
      if (r > 232 && g > 232 && b > 220) {
        data[i + 3] = 0;
      }
    }
    ctx.putImageData(image, 0, 0);
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}

export function BrandLogo({
  brandName,
  logoUrl,
  className = "",
  mediaClassName = "",
  alt,
  knockoutWhite = false,
}: Props) {
  const initial = brandInitial(brandName);
  const label = alt ?? `${brandName} logo`;
  const [failed, setFailed] = useState(false);
  const [processedSrc, setProcessedSrc] = useState<string | null>(null);
  const [useMultiply, setUseMultiply] = useState(false);

  useEffect(() => {
    setFailed(false);
    setProcessedSrc(null);
    setUseMultiply(false);
    if (!logoUrl || !knockoutWhite) return;

    let cancelled = false;
    const img = new Image();
    img.decoding = "async";
    // Needed for canvas read when the host allows it
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (cancelled) return;
      const out = knockOutWhite(img);
      if (out) setProcessedSrc(out);
      else setUseMultiply(true);
    };
    img.onerror = () => {
      if (cancelled) return;
      // CORS or load failure — still show original with multiply fallback
      setUseMultiply(true);
    };
    img.src = logoUrl;
    return () => {
      cancelled = true;
    };
  }, [logoUrl, knockoutWhite]);

  if (logoUrl && !failed) {
    const src = processedSrc ?? logoUrl;
    const blend = knockoutWhite && !processedSrc && useMultiply;
    return (
      <span
        className={`relative inline-flex h-full w-full items-center justify-center overflow-hidden bg-transparent ${className}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={label}
          className={`max-h-full max-w-full bg-transparent object-contain ${
            blend ? "mix-blend-multiply" : ""
          } ${mediaClassName}`}
          draggable={false}
          onError={() => setFailed(true)}
        />
      </span>
    );
  }

  return (
    <span
      className={`inline-flex h-full w-full items-center justify-center bg-transparent font-semibold ${className}`}
      aria-label={label}
      role="img"
    >
      <span
        className={`flex aspect-square h-[72%] max-h-full items-center justify-center rounded-sm text-white ${mediaClassName}`}
        style={{ background: avatarColor(brandName) }}
      >
        {initial}
      </span>
    </span>
  );
}
