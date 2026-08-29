"use client";

import { avatarColor, brandInitial } from "@/lib/logo";

type Props = {
  brandName: string;
  logoUrl?: string | null;
  className?: string;
  /** Extra class on the img / letter face */
  mediaClassName?: string;
  alt?: string;
};

export function BrandLogo({
  brandName,
  logoUrl,
  className = "",
  mediaClassName = "",
  alt,
}: Props) {
  const initial = brandInitial(brandName);
  const label = alt ?? `${brandName} logo`;

  if (logoUrl) {
    return (
      <span className={`relative inline-flex overflow-hidden ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoUrl}
          alt={label}
          className={`h-full w-full object-contain ${mediaClassName}`}
          draggable={false}
        />
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center justify-center font-semibold text-white ${className}`}
      style={{ background: avatarColor(brandName) }}
      aria-label={label}
      role="img"
    >
      <span className={mediaClassName}>{initial}</span>
    </span>
  );
}
