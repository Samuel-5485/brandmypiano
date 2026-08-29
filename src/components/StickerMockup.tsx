"use client";

import { BrandLogo } from "@/components/BrandLogo";
import type { SpotPublicState } from "@/lib/types";

type Props = {
  spots: SpotPublicState[];
};

/**
 * Cream plate boxes measured against public/piano-sticker.jpg
 * (perspective close-up: large music-rest plate + small fallboard plate left of LCD).
 */
const PLATES = {
  // 1024×687 sticker photo — large cream plate on music rest
  1: { left: "18%", top: "9%", width: "44%", height: "28%" },
  // Smaller cream plate on the strip above the keys (left of LCD)
  2: { left: "29%", top: "44.5%", width: "26%", height: "9.5%" },
} as const;

export const STICKER_PLATE_ASPECT = {
  1: { width: 220, height: 136 },
  2: { width: 180, height: 66 },
} as const;

export function StickerMockup({ spots }: Props) {
  const spot1 = spots.find((s) => s.spotId === 1);
  const spot2 = spots.find((s) => s.spotId === 2);

  return (
    <div>
      <div className="piano-stage relative overflow-hidden rounded-xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/piano-sticker.jpg"
          alt="Preview of die-cut vinyl on the music rest and above the keys"
          className="h-auto w-full"
          draggable={false}
        />

        {spot1?.hasBid && spot1.holderBrand ? (
          <div
            className="pointer-events-none absolute box-border flex items-center justify-center bg-transparent p-[7%]"
            style={PLATES[1]}
          >
            <BrandLogo
              brandName={spot1.holderBrand}
              logoUrl={spot1.holderLogoUrl}
              knockoutWhite
              className="h-full w-full"
              mediaClassName="text-sm sm:text-base"
            />
          </div>
        ) : null}

        {spot2?.hasBid && spot2.holderBrand ? (
          <div
            className="pointer-events-none absolute box-border flex items-center justify-center bg-transparent p-[6%]"
            style={PLATES[2]}
          >
            <BrandLogo
              brandName={spot2.holderBrand}
              logoUrl={spot2.holderLogoUrl}
              knockoutWhite
              className="h-full w-full"
              mediaClassName="text-[9px] sm:text-[11px]"
            />
          </div>
        ) : null}
      </div>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-dim sm:text-base">
        Preview. Vinyl goes on the real Yamaha after I buy it.
      </p>
    </div>
  );
}
