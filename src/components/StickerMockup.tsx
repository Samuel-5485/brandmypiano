"use client";

import { BrandLogo } from "@/components/BrandLogo";
import {
  quadBounds,
  quadHomographyMatrix3d,
  STICKER_PLATE_QUADS,
} from "@/lib/stickerPlate";
import type { SpotPublicState } from "@/lib/types";

type Props = {
  spots: SpotPublicState[];
};

export { STICKER_PLATE_ASPECT, PLATE_BOXES } from "@/lib/stickerPlate";

function PlateLogoWarp({
  spotId,
  spot,
  mediaClassName,
}: {
  spotId: 1 | 2;
  spot: SpotPublicState;
  mediaClassName: string;
}) {
  const quad = STICKER_PLATE_QUADS[spotId];
  const bounds = quadBounds(quad);
  const matrix = quadHomographyMatrix3d(quad, bounds);

  return (
    <div
      className="pointer-events-none absolute overflow-hidden"
      style={{
        left: `${bounds.minX}%`,
        top: `${bounds.minY}%`,
        width: `${bounds.w}%`,
        height: `${bounds.h}%`,
      }}
    >
      <div
        className="absolute left-0 top-0 h-full w-full origin-top-left bg-transparent"
        style={{
          transform: matrix,
          transformOrigin: "0 0",
        }}
      >
        <div className="relative h-full w-full overflow-hidden bg-transparent">
          <BrandLogo
            brandName={spot.holderBrand!}
            logoUrl={spot.holderLogoUrl}
            knockoutWhite={!spot.holderKeepBackground}
            plateFill
            className="bg-transparent"
            mediaClassName={mediaClassName}
          />
        </div>
      </div>
    </div>
  );
}

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
          <PlateLogoWarp
            spotId={1}
            spot={spot1}
            mediaClassName="text-base sm:text-lg"
          />
        ) : null}

        {spot2?.hasBid && spot2.holderBrand ? (
          <PlateLogoWarp
            spotId={2}
            spot={spot2}
            mediaClassName="text-[10px] sm:text-xs"
          />
        ) : null}
      </div>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-dim sm:text-base">
        Preview. Vinyl goes on the real PSR-E383 after I buy it.
      </p>
    </div>
  );
}
