"use client";

import { BrandLogo } from "@/components/BrandLogo";
import type { SpotPublicState } from "@/lib/types";

type Props = {
  spots: SpotPublicState[];
};

/** Cream plate boxes on public/e383-sticker.jpg */
export const PLATE_BOXES = {
  1: { left: "17%", top: "15%", width: "53%", height: "40%" },
  2: { left: "37%", top: "63%", width: "30%", height: "15%" },
} as const;

export const STICKER_PLATE_ASPECT = {
  1: { width: 220, height: 166 },
  2: { width: 180, height: 90 },
} as const;

export function StickerMockup({ spots }: Props) {
  const spot1 = spots.find((s) => s.spotId === 1);
  const spot2 = spots.find((s) => s.spotId === 2);

  return (
    <div>
      <div className="piano-stage relative overflow-hidden rounded-xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/e383-sticker.jpg"
          alt="Close-up of vinyl sticker plates on the PSR-E383 music rest and above the keys"
          className="h-auto w-full"
          draggable={false}
        />

        {spot1?.hasBid && spot1.holderBrand ? (
          <div
            className="pointer-events-none absolute overflow-hidden rounded-md"
            style={PLATE_BOXES[1]}
          >
            <BrandLogo
              brandName={spot1.holderBrand}
              logoUrl={spot1.holderLogoUrl}
              knockoutWhite={!spot1.holderKeepBackground}
              plateFill
              mediaClassName="text-base sm:text-lg"
            />
          </div>
        ) : null}

        {spot2?.hasBid && spot2.holderBrand ? (
          <div
            className="pointer-events-none absolute overflow-hidden rounded-sm"
            style={PLATE_BOXES[2]}
          >
            <BrandLogo
              brandName={spot2.holderBrand}
              logoUrl={spot2.holderLogoUrl}
              knockoutWhite={!spot2.holderKeepBackground}
              plateFill
              mediaClassName="text-[10px] sm:text-xs"
            />
          </div>
        ) : null}
      </div>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-dim sm:text-base">
        Preview. Vinyl goes on the real PSR-E383 after I buy it.
      </p>
    </div>
  );
}
