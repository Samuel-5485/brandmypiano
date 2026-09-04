"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import {
  isMatrix3dStable,
  logoLayerPixelSize,
  quadClipPath,
  quadPercentToPixels,
  rectToQuadMatrix3d,
  STICKER_PLATE_QUADS,
} from "@/lib/stickerPlate";
import type { SpotPublicState } from "@/lib/types";

type Props = {
  spots: SpotPublicState[];
};

export { STICKER_PLATE_ASPECT, PLATE_BOXES } from "@/lib/stickerPlate";

type PhotoMetrics = { w: number; h: number };

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
    const destPx = quadPercentToPixels(quadPercent, w, h);
    const { logoW, logoH } = logoLayerPixelSize(quadPercent, w, h);
    const matrix = rectToQuadMatrix3d(logoW, logoH, destPx);

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
        message: "pixel homography computed",
        data: {
          spotId,
          photoW: w,
          photoH: h,
          logoW,
          logoH,
          destTl: destPx.tl,
          matrixStable: isMatrix3dStable(matrix),
          matrixPreview: matrix?.slice(0, 80),
        },
        timestamp: Date.now(),
        hypothesisId: "H1-pixel-homography",
        runId: "post-fix",
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
          className="h-full w-full bg-transparent"
          style={{ transform: "rotateX(10deg)", transformOrigin: "center center" }}
        >
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
    );
  }

  return (
    <div className="pointer-events-none absolute inset-0 overflow-visible">
      <div
        className="absolute left-0 top-0 origin-top-left bg-transparent"
        style={{
          width: warp.logoW,
          height: warp.logoH,
          transform: warp.matrix,
          transformOrigin: "0 0",
        }}
      >
        <BrandLogo
          brandName={spot.holderBrand!}
          logoUrl={spot.holderLogoUrl}
          knockoutWhite={!spot.holderKeepBackground}
          plateFill
          className="h-full w-full bg-transparent"
          mediaClassName={mediaClassName}
        />
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
