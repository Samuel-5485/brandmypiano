"use client";

import { useRef, useState } from "react";
import { money } from "@/lib/auction";
import type { SpotPublicState } from "@/lib/types";

type HotspotLayout = {
  id: number;
  shortLabel: string;
  left: string;
  top: string;
  width: string;
  height: string;
  tip: "above" | "below";
};

/**
 * Percentage boxes aligned to the gold rectangles in public/piano-map.jpg
 * (1024 × 683 source). Overlay sits on the still map only — never on video.
 */
const HOTSPOTS: HotspotLayout[] = [
  { id: 1, shortLabel: "Music rest", left: "41.5%", top: "18%", width: "16%", height: "7%", tip: "below" },
  { id: 2, shortLabel: "Above keys", left: "30%", top: "41%", width: "38%", height: "4.5%", tip: "below" },
  { id: 3, shortLabel: "Left cheek", left: "27%", top: "43.5%", width: "4.5%", height: "7%", tip: "below" },
  { id: 4, shortLabel: "Right cheek", left: "66.5%", top: "43.5%", width: "4.5%", height: "7%", tip: "below" },
  { id: 5, shortLabel: "Lid left", left: "29%", top: "31%", width: "11%", height: "5%", tip: "below" },
  { id: 6, shortLabel: "Lid right", left: "57%", top: "31%", width: "11%", height: "5%", tip: "below" },
  { id: 7, shortLabel: "Left side", left: "21%", top: "34%", width: "5%", height: "13%", tip: "below" },
  { id: 8, shortLabel: "Floor case", left: "69%", top: "68%", width: "15%", height: "15%", tip: "above" },
  { id: 9, shortLabel: "X-stand", left: "45.5%", top: "58.5%", width: "8%", height: "7%", tip: "above" },
  { id: 10, shortLabel: "Padded bag", left: "11%", top: "68%", width: "17%", height: "16%", tip: "above" },
];

type Props = {
  activeId: number | null;
  spots: SpotPublicState[];
  onSelect: (id: number) => void;
};

export function PianoGraphic({ activeId, spots, onSelect }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoFailed, setVideoFailed] = useState(false);
  const spotById = new Map(spots.map((s) => [s.spotId, s]));

  return (
    <div className="space-y-8 sm:space-y-10">
      {/* Hero video — visual only, no hotspots */}
      <div>
        <div className="piano-stage overflow-hidden rounded-xl p-3 sm:p-5">
          <div className="relative mx-auto aspect-[1168/784] w-full max-w-[960px] overflow-hidden rounded-lg bg-[var(--piano-stage-bg)]">
            {!videoFailed ? (
              <video
                ref={videoRef}
                className="absolute inset-0 h-full w-full object-contain"
                src="/piano-hero.mp4"
                poster="/piano-3d.jpg"
                autoPlay
                muted
                loop
                playsInline
                controls={false}
                preload="auto"
                aria-label="Preview of the Yamaha piano"
                onError={() => setVideoFailed(true)}
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src="/piano-3d.jpg"
                alt="Yamaha digital piano preview"
                className="absolute inset-0 h-full w-full object-contain"
              />
            )}
          </div>
        </div>
        <p className="mt-3 text-center text-sm text-dim">
          Preview of the Yamaha I will buy.
        </p>
      </div>

      {/* Spot map — only clickable piano surface */}
      <div>
        <div
          className="piano-stage mx-auto w-full overflow-hidden rounded-xl p-2 sm:p-4"
          style={{ maxWidth: "min(960px, 100%)" }}
        >
          <div className="relative w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/piano-map.jpg"
              alt="Numbered map of the ten sticker spots on the piano"
              className="h-auto w-full object-contain"
              draggable={false}
            />

            {HOTSPOTS.map((spot) => {
              const state = spotById.get(spot.id);
              const active = activeId === spot.id;
              const bidLabel =
                state?.currentBid != null ? money(state.currentBid) : "Open";
              const name = state?.name ?? spot.shortLabel;
              const tipPos =
                spot.tip === "above"
                  ? "bottom-full mb-1.5"
                  : "top-full mt-1.5";

              return (
                <button
                  key={spot.id}
                  type="button"
                  className={`group absolute z-10 rounded-md border transition focus-ring ${
                    active
                      ? "border-[var(--gold-2)] bg-[color-mix(in_srgb,var(--gold)_28%,transparent)]"
                      : "border-gold bg-[color-mix(in_srgb,var(--gold)_10%,transparent)] hover:border-[var(--gold-2)] hover:bg-[color-mix(in_srgb,var(--gold)_22%,transparent)]"
                  }`}
                  style={{
                    left: spot.left,
                    top: spot.top,
                    width: spot.width,
                    height: spot.height,
                  }}
                  aria-label={`Spot ${spot.id}: ${name}. Current bid ${bidLabel}`}
                  onClick={() => onSelect(spot.id)}
                >
                  <span
                    className={`absolute left-1 top-1 flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                      active
                        ? "bg-[var(--gold-2)] text-[var(--button-text)]"
                        : "bg-gold text-[var(--button-text)]"
                    }`}
                  >
                    {spot.id}
                  </span>
                  <span
                    className={`pointer-events-none absolute left-1/2 z-20 hidden w-max max-w-[12rem] -translate-x-1/2 rounded-md border border-line bg-[var(--bg-card)] px-2.5 py-1.5 text-left text-xs text-cream shadow-lg group-hover:block group-focus-visible:block ${tipPos}`}
                  >
                    <span className="block font-medium">{name}</span>
                    <span className="mt-0.5 block text-dim">{bidLabel}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <p className="mt-3 text-center text-sm text-dim">
          Tap a numbered spot to bid. Same 10 spots.
        </p>
      </div>
    </div>
  );
}
