"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { CONFIG } from "@/config";
import { formatTimeAgo, money } from "@/lib/auction";
import type { PublicBoard, SpotPublicState } from "@/lib/types";
import { BrandLogo } from "@/components/BrandLogo";

type Tab = "spots" | "history";

type Props = {
  board: PublicBoard;
  activeId: number | null;
  onBidSpot: (spotId: number) => void;
};

const DEFAULT_TICKER =
  "Every spot shows its current top bid. Spots do not compete with each other.";

export function LiveAuctionBoard({ board, activeId, onBidSpot }: Props) {
  const [tab, setTab] = useState<Tab>("spots");
  const [historyFilter, setHistoryFilter] = useState<number | "all">("all");
  const [tickerIndex, setTickerIndex] = useState(0);

  const tickerLines =
    board.tickerLines.length > 0 ? board.tickerLines : [DEFAULT_TICKER];

  useEffect(() => {
    const id = setInterval(() => {
      setTickerIndex((i) => (i + 1) % tickerLines.length);
    }, 4500);
    return () => clearInterval(id);
  }, [tickerLines.length]);

  const filteredHistory = useMemo(() => {
    if (historyFilter === "all") return board.history;
    return board.history.filter((e) => e.spotId === historyFilter);
  }, [board.history, historyFilter]);

  return (
    <section id="spots" className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <h2 className="font-display text-3xl text-cream sm:text-4xl">
        The auction, live.
      </h2>
      <p className="mt-2 max-w-2xl text-dim">
        Every spot is its own race. Bid on the music rest and you only fight other
        music-rest bids — not the bag, not the pedal.
      </p>

      <p
        className="mt-4 min-h-[1.5rem] text-sm text-gold transition-opacity duration-500"
        aria-live="polite"
      >
        {tickerLines[tickerIndex % tickerLines.length]}
      </p>

      <div className="mt-6 flex gap-2 border-b border-line">
        {(
          [
            ["spots", "Spots"],
            ["history", "History"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`focus-ring -mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition ${
              tab === key
                ? "border-gold text-cream"
                : "border-transparent text-dim hover:text-cream"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "spots" ? (
        <div className="mt-6 overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-card text-dim">
              <tr>
                <th className="px-4 py-3 font-medium">Spot</th>
                <th className="px-4 py-3 font-medium">Size</th>
                <th className="px-4 py-3 font-medium">Held by</th>
                <th className="px-4 py-3 font-medium">Current bid</th>
                <th className="px-4 py-3 font-medium">Bids</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {board.spots.map((spot) => (
                <SpotRow
                  key={spot.spotId}
                  spot={spot}
                  active={activeId === spot.spotId}
                  ended={board.ended}
                  onBid={() => onBidSpot(spot.spotId)}
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mt-6">
          <div className="flex flex-wrap gap-2">
            <FilterChip
              active={historyFilter === "all"}
              onClick={() => setHistoryFilter("all")}
            >
              All
            </FilterChip>
            {CONFIG.spots.map((s) => (
              <FilterChip
                key={s.id}
                active={historyFilter === s.id}
                onClick={() => setHistoryFilter(s.id)}
              >
                Spot {s.id}
              </FilterChip>
            ))}
          </div>

          <div className="mt-4 overflow-x-auto rounded-xl border border-line">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="bg-card text-dim">
                <tr>
                  <th className="px-4 py-3 font-medium">When</th>
                  <th className="px-4 py-3 font-medium">Spot</th>
                  <th className="px-4 py-3 font-medium">Brand</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Result</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-dim">
                      No bids yet{historyFilter !== "all" ? " on this spot" : ""}.
                    </td>
                  </tr>
                ) : (
                  filteredHistory.map((entry) => (
                    <tr key={entry.id} className="border-t border-line">
                      <td className="px-4 py-3 text-dim">
                        {formatTimeAgo(entry.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-cream">
                        {entry.spotId} · {entry.spotName}
                      </td>
                      <td className="px-4 py-3 text-cream">{entry.brandName}</td>
                      <td className="px-4 py-3 tabular-nums text-cream">
                        {money(entry.amount)}
                      </td>
                      <td className="px-4 py-3 text-dim">{entry.result}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`focus-ring rounded-full border px-3 py-1 text-xs transition ${
        active
          ? "border-gold bg-gold/10 text-cream"
          : "border-line text-dim hover:border-gold hover:text-cream"
      }`}
    >
      {children}
    </button>
  );
}

function SpotRow({
  spot,
  active,
  ended,
  onBid,
}: {
  spot: SpotPublicState;
  active: boolean;
  ended: boolean;
  onBid: () => void;
}) {
  const hasLeader = Boolean(spot.holderBrand);
  const disabled = ended || spot.locked;

  return (
    <tr
      className={`border-t border-line ${active ? "bg-gold/5" : ""} ${
        spot.locked ? "opacity-80" : ""
      }`}
    >
      <td className="px-4 py-3">
        <span className="font-medium text-gold">{spot.spotId}</span>
        <span className="mt-0.5 block text-cream">{spot.name}</span>
        {spot.locked && (
          <span className="mt-1 inline-block text-xs uppercase tracking-wide text-dim">
            Locked
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-dim">{spot.size}</td>
      <td className="px-4 py-3">
        {hasLeader ? (
          <span className="flex items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-sm">
              <BrandLogo
                brandName={spot.holderBrand!}
                logoUrl={spot.holderLogoUrl}
                knockoutWhite={!spot.holderKeepBackground}
                className="h-full w-full"
                mediaClassName="text-[10px]"
              />
            </span>
            <span className="text-cream">{spot.holderBrand}</span>
          </span>
        ) : (
          <span className="text-dim">Open</span>
        )}
      </td>
      <td className="px-4 py-3 tabular-nums text-cream">
        {spot.currentBid != null ? money(spot.currentBid) : "—"}
      </td>
      <td className="px-4 py-3 tabular-nums text-dim">{spot.bidCount}</td>
      <td className="px-4 py-3 text-right">
        <button
          type="button"
          onClick={onBid}
          disabled={disabled}
          className="focus-ring rounded-md px-3 py-2 text-sm font-medium transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          style={{ background: "var(--button-bg)", color: "var(--button-text)" }}
        >
          {spot.locked ? "Locked" : hasLeader ? "Outbid" : "Bid"}
        </button>
      </td>
    </tr>
  );
}
