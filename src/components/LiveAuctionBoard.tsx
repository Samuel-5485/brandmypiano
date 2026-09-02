"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { CONFIG } from "@/config";
import {
  formatTimeAgo,
  money,
  normalizeHandle,
  ordinalRank,
} from "@/lib/auction";
import type { PublicBoard, SpotOffer, SpotPublicState } from "@/lib/types";
import { BrandLogo } from "@/components/BrandLogo";

const HANDLE_KEY = "brandmypiano-handle";

type Tab = "spots" | "history";

type Props = {
  board: PublicBoard;
  selectedId: number | null;
  onSelectSpot: (spotId: number) => void;
  onBidSpot: (spotId: number, prefillAmount?: number) => void;
};

const DEFAULT_TICKER =
  "Every spot shows its current top bid. Spots do not compete with each other.";

export function LiveAuctionBoard({
  board,
  selectedId,
  onSelectSpot,
  onBidSpot,
}: Props) {
  const [tab, setTab] = useState<Tab>("spots");
  const [historyFilter, setHistoryFilter] = useState<number | "all">("all");
  const [tickerIndex, setTickerIndex] = useState(0);
  const [viewerHandle, setViewerHandle] = useState("");

  useEffect(() => {
    setViewerHandle(
      normalizeHandle(localStorage.getItem(HANDLE_KEY) ?? ""),
    );
  }, []);

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

  const selectedSpot =
    selectedId != null
      ? board.spots.find((s) => s.spotId === selectedId) ?? null
      : null;

  return (
    <section id="spots" className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <h2 className="font-display text-3xl text-cream sm:text-4xl">
        The auction, live.
      </h2>
      <p className="mt-2 max-w-2xl text-dim">
        Every spot is its own race. Bid on the music rest and you only fight other
        music-rest bids — not the bag, not the pedal.
      </p>

      <p
        className="mt-4 min-h-[1.5rem] break-words text-sm leading-relaxed text-gold transition-opacity duration-500"
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
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_min(22rem,36%)] lg:items-start">
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full min-w-[560px] text-left text-sm">
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
                    selected={selectedId === spot.spotId}
                    ended={board.ended}
                    onSelect={() => onSelectSpot(spot.spotId)}
                    onBid={() => onBidSpot(spot.spotId)}
                  />
                ))}
              </tbody>
            </table>
          </div>

          <ThisSpotPanel
            spot={selectedSpot}
            ended={board.ended}
            viewerHandle={viewerHandle}
            onBid={(amount) => {
              if (selectedSpot) onBidSpot(selectedSpot.spotId, amount);
            }}
          />
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
            <table className="w-full min-w-[640px] text-left text-sm">
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

function ThisSpotPanel({
  spot,
  ended,
  viewerHandle,
  onBid,
}: {
  spot: SpotPublicState | null;
  ended: boolean;
  viewerHandle: string;
  onBid: (prefillAmount: number) => void;
}) {
  if (!spot) {
    return (
      <aside className="card-surface rounded-xl p-5 lg:sticky lg:top-24">
        <h3 className="font-display text-xl text-cream">This spot</h3>
        <p className="mt-3 text-sm leading-relaxed text-dim">
          Click a row in the spots table to see every bid on that part of the
          keyboard — ranked 1st, 2nd, 3rd.
        </p>
      </aside>
    );
  }

  const disabled = ended || spot.locked;
  const leader = spot.offers[0] ?? null;

  return (
    <aside className="card-surface rounded-xl p-5 lg:sticky lg:top-24">
      <p className="text-xs uppercase tracking-[0.16em] text-gold">
        Spot {spot.spotId}
      </p>
      <h3 className="font-display text-xl text-cream">This spot</h3>
      <p className="mt-1 text-sm text-dim">{spot.name}</p>
      {spot.locked && (
        <p className="mt-2 text-xs uppercase tracking-wide text-dim">Locked</p>
      )}

      {spot.offers.length === 0 ? (
        <p className="mt-4 text-sm text-dim">
          No bids yet. Min opening bid {money(spot.startingBid)}.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {spot.offers.map((offer) => (
            <OfferRow
              key={offer.id}
              offer={offer}
              spot={spot}
              isViewer={
                viewerHandle.length > 1 && offer.handle === viewerHandle
              }
              ended={ended}
              disabled={disabled}
              onBeat={() => onBid(spot.minNextBid)}
            />
          ))}
        </ul>
      )}

      {!spot.offers.length && !disabled && (
        <button
          type="button"
          onClick={() => onBid(spot.startingBid)}
          className="focus-ring mt-4 w-full rounded-md px-4 py-2.5 text-sm font-medium transition hover:opacity-90"
          style={{ background: "var(--button-bg)", color: "var(--button-text)" }}
        >
          Bid {money(spot.startingBid)}
        </button>
      )}

      {leader && !disabled && spot.offers.length > 0 && (
        <button
          type="button"
          onClick={() => onBid(spot.minNextBid)}
          className="focus-ring mt-4 w-full rounded-md px-4 py-2.5 text-sm font-medium transition hover:opacity-90"
          style={{ background: "var(--button-bg)", color: "var(--button-text)" }}
        >
          {spot.hasBid ? "Outbid" : "Bid"} · {money(spot.minNextBid)} min
        </button>
      )}

      <p className="mt-4 text-xs leading-relaxed text-dim">
        Only 1st place goes on this part of the keyboard. 2nd and 3rd stay in the
        race until someone locks.
      </p>
    </aside>
  );
}

function OfferRow({
  offer,
  spot,
  isViewer,
  ended,
  disabled,
  onBeat,
}: {
  offer: SpotOffer;
  spot: SpotPublicState;
  isViewer: boolean;
  ended: boolean;
  disabled: boolean;
  onBeat: () => void;
}) {
  const isLeader = offer.rank === 1;
  const rankLabel = isLeader ? "1st" : ordinalRank(offer.rank);

  return (
    <li
      className={`rounded-lg border px-3 py-3 ${
        isLeader
          ? "border-gold/50 bg-gold/10"
          : "border-line bg-bg/30"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-gold">
            {isViewer ? `You · ${rankLabel}` : rankLabel}
          </p>
          <p className="mt-1 break-words font-medium text-cream">
            {offer.brandName}
          </p>
          <p className="mt-0.5 tabular-nums text-sm text-cream">
            {money(offer.amount)}
          </p>
          <p className="mt-0.5 text-xs text-dim">
            {formatTimeAgo(offer.createdAt)}
          </p>
          {isLeader && (
            <p className="mt-1.5 text-xs text-gold">
              Leading — logo on the keyboard
            </p>
          )}
        </div>
        {!isLeader && !disabled && !ended && (
          <button
            type="button"
            onClick={onBeat}
            className="focus-ring shrink-0 rounded-md px-2.5 py-1.5 text-xs font-medium transition hover:opacity-90"
            style={{
              background: "var(--button-bg)",
              color: "var(--button-text)",
            }}
          >
            Beat 1st
          </button>
        )}
      </div>
      {isLeader && spot.locked && (
        <p className="mt-1 text-xs text-dim">Spot locked</p>
      )}
    </li>
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
  selected,
  ended,
  onSelect,
  onBid,
}: {
  spot: SpotPublicState;
  selected: boolean;
  ended: boolean;
  onSelect: () => void;
  onBid: () => void;
}) {
  const hasLeader = Boolean(spot.holderBrand);
  const disabled = ended || spot.locked;

  return (
    <tr
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={`cursor-pointer border-t border-line transition hover:bg-gold/5 ${
        selected ? "bg-gold/10" : ""
      } ${spot.locked ? "opacity-80" : ""}`}
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
            <span className="break-words text-cream">{spot.holderBrand}</span>
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
          onClick={(e) => {
            e.stopPropagation();
            onBid();
          }}
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
