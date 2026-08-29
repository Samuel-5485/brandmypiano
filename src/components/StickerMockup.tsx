"use client";

import { BrandLogo } from "@/components/BrandLogo";
import type { SpotPublicState } from "@/lib/types";

type Props = {
  spots: SpotPublicState[];
};

/** Percentage boxes over the cream plates in public/piano-sticker.jpg */
const PLATES = {
  // Large music-rest plate — upper center of frame
  1: { left: "26%", top: "8%", width: "46%", height: "28%" },
  // Smaller plate above the keys, left of the LCD
  2: { left: "28%", top: "47%", width: "28%", height: "10%" },
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

        {spot1?.hasBid && spot1.holderBrand && (
          <div
            className="pointer-events-none absolute flex items-center justify-center p-[2%] sm:p-[2.5%]"
            style={PLATES[1]}
          >
            <BrandLogo
              brandName={spot1.holderBrand}
              logoUrl={spot1.holderLogoUrl}
              className="h-full w-full"
              mediaClassName="object-contain"
            />
          </div>
        )}

        {spot2?.hasBid && spot2.holderBrand && (
          <div
            className="pointer-events-none absolute flex items-center justify-center p-[1.5%] sm:p-[2%]"
            style={PLATES[2]}
          >
            <BrandLogo
              brandName={spot2.holderBrand}
              logoUrl={spot2.holderLogoUrl}
              className="h-full w-full"
              mediaClassName="object-contain text-[10px] sm:text-xs"
            />
          </div>
        )}
      </div>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-dim sm:text-base">
        Preview. Vinyl goes on the real Yamaha after I buy it.
      </p>
    </div>
  );
}
