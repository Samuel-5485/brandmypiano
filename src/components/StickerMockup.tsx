"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import {
  centeredSquareLogoLayer,
  isMatrix3dStable,
  quadClipPath,
  quadPercentToPixels,
  quadPlateHeight,
  quadPlateWidth,
  rectToQuadMatrix3d,
  STICKER_PLATE_QUADS,
} from "@/lib/stickerPlate";
import type { SpotPublicState } from "@/lib/types";

type Props = {
  spots: SpotPublicState[];
};

export { STICKER_PLATE_ASPECT, PLATE_BOXES } from "@/lib/stickerPlate";

/** Square mark side = fraction of plate shorter edge. */
const LOGO_SIDE_FRACTION: Record<1 | 2, number> = { 1: 0.58, 2: 0.55 };

type PhotoMetrics = { w: number; h: number };

/** Square tile wrapper — img never spans full plate width. */
function SquareMarkLogo({
  spot,
  mediaClassName,
}: {
  spot: SpotPublicState;
  mediaClassName: string;
}) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-transparent p-[6%]">
      <BrandLogo
        brandName={spot.holderBrand!}
        logoUrl={spot.holderLogoUrl}
        knockoutWhite={!spot.holderKeepBackground}
        className="flex max-h-full max-w-full items-center justify-center bg-transparent"
        mediaClassName={`block max-h-full max-w-full object-contain rounded-lg ${mediaClassName}`}
      />
    </div>
  );
}

type WarpState =
  | { mode: "pending" }
  | {
      mode: "homography";
      logoW: number;
      logoH: number;
      matrix: string;
    }
  | { mode: "fallback" };

function PlateLogoWarp({
  spotId,
  spot,
  mediaClassName,
  metrics,
}: {
  spotId: 1 | 2;
  spot: SpotPublicState;
  mediaClassName: string;
  metrics: PhotoMetrics | null;
}) {
  const quadPercent = STICKER_PLATE_QUADS[spotId];
  const [warp, setWarp] = useState<WarpState>({ mode: "pending" });

  useLayoutEffect(() => {
    if (!metrics || metrics.w <= 0 || metrics.h <= 0) {
      setWarp({ mode: "pending" });
      return;
    }

    const { w, h } = metrics;
    const platePx = quadPercentToPixels(quadPercent, w, h);
    const sideFraction = LOGO_SIDE_FRACTION[spotId];
    const { logoW, logoH, innerQuad } = centeredSquareLogoLayer(
      platePx,
      sideFraction,
    );
    const matrix = rectToQuadMatrix3d(logoW, logoH, innerQuad);
    const innerW = quadPlateWidth(innerQuad);
    const innerH = quadPlateHeight(innerQuad);

    // #region agent log
    fetch("http://127.0.0.1:7681/ingest/d8bbfca4-00dd-492f-ae23-8c4a307aedad", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "c3e306",
      },
      body: JSON.stringify({
        sessionId: "c3e306",
        location: "StickerMockup.tsx:warp",
        message: "square tile homography",
        data: {
          spotId,
          photoW: w,
          photoH: h,
          plateW: quadPlateWidth(platePx),
          plateH: quadPlateHeight(platePx),
          shortSide: Math.min(quadPlateWidth(platePx), quadPlateHeight(platePx)),
          innerW,
          innerH,
          innerAspect: innerW / innerH,
          sideFraction,
          logoW,
          logoH,
          matrixStable: isMatrix3dStable(matrix),
        },
        timestamp: Date.now(),
        hypothesisId: "H3-square-dest-quad",
        runId: "post-fix-3",
      }),
    }).catch(() => {});
    // #endregion

    if (isMatrix3dStable(matrix)) {
      setWarp({ mode: "homography", logoW, logoH, matrix });
    } else {
      setWarp({ mode: "fallback" });
    }
  }, [metrics, quadPercent, spotId]);

  if (!metrics || warp.mode === "pending") return null;

  if (warp.mode === "fallback") {
    const clip = quadClipPath(quadPercent);
    return (
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
        style={{
          clipPath: clip,
          WebkitClipPath: clip,
          perspective: "900px",
        }}
      >
        <div
          className="flex items-center justify-center overflow-hidden rounded-lg bg-transparent"
          style={{
            width: `${LOGO_SIDE_FRACTION[spotId] * 100}%`,
            aspectRatio: "1 / 1",
            maxWidth: "58%",
            transform: "rotateX(10deg)",
            transformOrigin: "center center",
          }}
        >
          <SquareMarkLogo
            spot={spot}
            mediaClassName={mediaClassName}
          />
        </div>
      </div>
    );
  }

  const plateClip = quadClipPath(quadPercent);

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{
        clipPath: plateClip,
        WebkitClipPath: plateClip,
      }}
    >
      <div
        className="absolute left-0 top-0 overflow-hidden rounded-lg bg-transparent"
        style={{
          width: warp.logoW,
          height: warp.logoH,
          transform: warp.matrix,
          transformOrigin: "0 0",
        }}
      >
        <SquareMarkLogo spot={spot} mediaClassName={mediaClassName} />
      </div>
    </div>
  );
}

export function StickerMockup({ spots }: Props) {
  const spot1 = spots.find((s) => s.spotId === 1);
  const spot2 = spots.find((s) => s.spotId === 2);
  const stageRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [metrics, setMetrics] = useState<PhotoMetrics | null>(null);

  const measure = useCallback(() => {
    const img = imgRef.current;
    if (!img) return;
    const w = img.clientWidth;
    const h = img.clientHeight;
    if (w > 0 && h > 0) setMetrics({ w, h });
  }, []);

  useLayoutEffect(() => {
    measure();
    const img = imgRef.current;
    const stage = stageRef.current;
    if (!img || !stage) return;

    if (img.complete && img.naturalWidth > 0) measure();

    const ro = new ResizeObserver(() => measure());
    ro.observe(stage);
    return () => ro.disconnect();
  }, [measure]);

  return (
    <div>
      <div
        ref={stageRef}
        className="piano-stage relative overflow-hidden rounded-xl"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src="/e383-sticker.jpg"
          alt="Close-up of vinyl sticker plates on the PSR-E383 music rest and above the keys"
          className="block h-auto w-full"
          draggable={false}
          onLoad={measure}
        />

        {spot1?.hasBid && spot1.holderBrand ? (
          <PlateLogoWarp
            spotId={1}
            spot={spot1}
            mediaClassName="text-base sm:text-lg"
            metrics={metrics}
          />
        ) : null}

        {spot2?.hasBid && spot2.holderBrand ? (
          <PlateLogoWarp
            spotId={2}
            spot={spot2}
            mediaClassName="text-[10px] sm:text-xs"
            metrics={metrics}
          />
        ) : null}
      </div>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-dim sm:text-base">
        Preview. Vinyl goes on the real PSR-E383 after I buy it.
      </p>
    </div>
  );
}
