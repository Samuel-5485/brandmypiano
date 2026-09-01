"use client";

import { BrandLogo } from "@/components/BrandLogo";
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
 * Click targets on public/e383-kit.jpg (PSR-E383 kit — top-down product photo).
 * Percentages measured against the full image frame.
 */
const HOTSPOTS: HotspotLayout[] = [
  { id: 1, shortLabel: "Music rest", left: "37%", top: "14%", width: "21%", height: "14%", tip: "below" },
  { id: 2, shortLabel: "Rail above keys", left: "34%", top: "31%", width: "41%", height: "3%", tip: "below" },
  { id: 3, shortLabel: "Left speaker", left: "27%", top: "28%", width: "11%", height: "6%", tip: "below" },
  { id: 4, shortLabel: "Right speaker", left: "65%", top: "28%", width: "10%", height: "6%", tip: "below" },
  { id: 5, shortLabel: "Left end", left: "27%", top: "30%", width: "5%", height: "13%", tip: "below" },
  { id: 6, shortLabel: "Right end", left: "74%", top: "32%", width: "3%", height: "8%", tip: "below" },
  { id: 7, shortLabel: "X-stand", left: "48%", top: "55%", width: "7%", height: "10%", tip: "above" },
  { id: 8, shortLabel: "Bench", left: "65%", top: "48%", width: "27%", height: "42%", tip: "above" },
  { id: 9, shortLabel: "Long bag", left: "3%", top: "52%", width: "42%", height: "26%", tip: "above" },
  { id: 10, shortLabel: "Sustain pedal", left: "53%", top: "78%", width: "8%", height: "9%", tip: "above" },
  { id: 11, shortLabel: "Headphones", left: "80%", top: "47%", width: "8%", height: "8%", tip: "above" },
];

type Props = {
  activeId: number | null;
  spots: SpotPublicState[];
  onSelect: (id: number) => void;
};

export function PianoGraphic({ activeId, spots, onSelect }: Props) {
  const spotById = new Map(spots.map((s) => [s.spotId, s]));

  return (
    <div className="space-y-3">
      <p className="text-center text-sm text-dim sm:text-base">
        Yamaha PSR-E383 kit I will buy. Stickers go on the real instrument.
      </p>

      <div
        className="piano-stage mx-auto w-full overflow-hidden rounded-xl p-2 sm:p-4"
        style={{ maxWidth: "min(960px, 100%)" }}
      >
        <div className="relative w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/e383-kit.jpg"
            alt="Yamaha PSR-E383 portable keyboard kit with stand, bench, bag, and sustain pedal"
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
            const hasWinner = Boolean(state?.hasBid && state.holderBrand);

            return (
              <button
                key={spot.id}
                type="button"
                disabled={Boolean(state?.locked)}
                className={`group absolute z-10 overflow-hidden rounded-sm border border-gold bg-transparent transition focus-ring hover:border-[var(--gold-2)] disabled:cursor-default ${
                  active ? "border-[var(--gold-2)] ring-1 ring-[var(--gold-2)]" : ""
                } ${state?.locked ? "opacity-60" : ""}`}
                style={{
                  left: spot.left,
                  top: spot.top,
                  width: spot.width,
                  height: spot.height,
                }}
                aria-label={`Spot ${spot.id}: ${name}. Current bid ${bidLabel}${state?.locked ? ". Locked" : ""}`}
                onClick={() => !state?.locked && onSelect(spot.id)}
              >
                {hasWinner && state?.holderBrand ? (
                  <span className="absolute inset-0 flex items-center justify-center bg-transparent p-[6%]">
                    <BrandLogo
                      brandName={state.holderBrand}
                      logoUrl={state.holderLogoUrl}
                      knockoutWhite={!state.holderKeepBackground}
                      className="h-full w-full"
                      mediaClassName="object-contain text-[8px] sm:text-[10px]"
                    />
                  </span>
                ) : (
                  <span className="pointer-events-none absolute inset-0 flex items-center justify-center font-display text-sm font-medium text-gold sm:text-base">
                    {spot.id}
                  </span>
                )}
                <span
                  className={`pointer-events-none absolute left-1/2 z-20 hidden w-max max-w-[12rem] -translate-x-1/2 rounded-md border border-line bg-[var(--bg-card)] px-2.5 py-1.5 text-left text-xs text-cream shadow-lg group-hover:block group-focus-visible:block ${tipPos}`}
                >
                  <span className="block font-medium">
                    Spot {spot.id}: {name}
                  </span>
                  {state?.holderBrand && (
                    <span className="mt-0.5 block text-dim">
                      {state.holderBrand}
                    </span>
                  )}
                  <span className="mt-0.5 block text-dim">{bidLabel}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <p className="text-center text-sm text-dim">
        Tap a numbered spot to bid. Eleven spots on the keyboard and kit.
      </p>
    </div>
  );
}
