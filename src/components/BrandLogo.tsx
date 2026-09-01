"use client";

import { useEffect, useState } from "react";
import { avatarColor, brandInitial } from "@/lib/logo";

/** @deprecated Use plateFill on sticker close-up instead. */
export type LogoSlotSize = {
  widthPct: number;
  heightPct: number;
};

/** @deprecated Use plateFill on sticker close-up instead. */
export const STICKER_LOGO_SLOT: LogoSlotSize = {
  widthPct: 78,
  heightPct: 72,
};

type Props = {
  brandName: string;
  logoUrl?: string | null;
  className?: string;
  mediaClassName?: string;
  alt?: string;
  knockoutWhite?: boolean;
  slotSize?: LogoSlotSize;
  /** Fill plate: img is 100%×100%, object-fit contain, 10% padding — no wrapper. */
  plateFill?: boolean;
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
  slotSize,
  plateFill = false,
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
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (cancelled) return;
      const out = knockOutWhite(img);
      if (out) setProcessedSrc(out);
      else setUseMultiply(true);
    };
    img.onerror = () => {
      if (cancelled) return;
      setUseMultiply(true);
    };
    img.src = logoUrl;
    return () => {
      cancelled = true;
    };
  }, [logoUrl, knockoutWhite]);

  const plateImgClass =
    "box-border h-full w-full bg-transparent object-contain p-[10%]";

  if (plateFill) {
    if (logoUrl && !failed) {
      const src = processedSrc ?? logoUrl;
      const blend = knockoutWhite && !processedSrc && useMultiply;
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={label}
          className={`${plateImgClass} ${blend ? "mix-blend-multiply" : ""} ${mediaClassName} ${className}`}
          draggable={false}
          onError={() => setFailed(true)}
        />
      );
    }
    return (
      <span
        className={`box-border flex h-full w-full items-center justify-center bg-transparent p-[10%] font-semibold ${className}`}
        aria-label={label}
        role="img"
      >
        <span
          className={`flex h-full w-full items-center justify-center text-white ${mediaClassName}`}
          style={{ background: avatarColor(brandName) }}
        >
          {initial}
        </span>
      </span>
    );
  }

  const slotStyle = slotSize
    ? {
        width: `${slotSize.widthPct}%`,
        height: `${slotSize.heightPct}%`,
        objectFit: "contain" as const,
        margin: "auto",
        display: "block" as const,
      }
    : undefined;

  if (logoUrl && !failed) {
    const src = processedSrc ?? logoUrl;
    const blend = knockoutWhite && !processedSrc && useMultiply;
    return (
      <span
        className={`flex h-full w-full items-center justify-center bg-transparent ${className}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={label}
          className={`bg-transparent ${
            slotSize ? "" : "max-h-full max-w-full object-contain"
          } ${blend ? "mix-blend-multiply" : ""} ${mediaClassName}`}
          style={slotStyle}
          draggable={false}
          onError={() => setFailed(true)}
        />
      </span>
    );
  }

  return (
    <span
      className={`flex h-full w-full items-center justify-center bg-transparent font-semibold ${className}`}
      aria-label={label}
      role="img"
    >
      <span
        className={`flex items-center justify-center rounded-sm text-white ${mediaClassName}`}
        style={{
          background: avatarColor(brandName),
          ...(slotSize
            ? {
                width: `${slotSize.widthPct}%`,
                height: `${slotSize.heightPct}%`,
                margin: "auto",
              }
            : {
                height: "72%",
                aspectRatio: "1 / 1",
                maxHeight: "100%",
              }),
        }}
      >
        {initial}
      </span>
    </span>
  );
}
