import { CONFIG, getPaymentLink, getSpot } from "@/config";
import type {
  Bid,
  PublicBidHistoryEntry,
  PublicBoard,
  SpotPublicState,
} from "@/lib/types";

export function auctionEnded(now = new Date()): boolean {
  return now.getTime() >= new Date(CONFIG.auctionEnd).getTime();
}

export function calcDeposit(amount: number): number {
  return Math.max(
    CONFIG.minDeposit,
    Math.round(amount * CONFIG.depositPct * 100) / 100,
  );
}

export function lockPaymentUrl(paymentLink: string, bidAmountUsd: number): string {
  if (!paymentLink.trim()) return "";
  try {
    const url = new URL(paymentLink);
    url.searchParams.set("amount", String(Math.round(bidAmountUsd * 100)));
    return url.toString();
  } catch {
    const sep = paymentLink.includes("?") ? "&" : "?";
    return `${paymentLink}${sep}amount=${Math.round(bidAmountUsd * 100)}`;
  }
}

export function confirmedBids(bids: Bid[]): Bid[] {
  return bids.filter((bid) => bid.status === "confirmed");
}

export function activeBids(bids: Bid[]): Bid[] {
  return bids.filter((bid) => bid.status !== "rejected");
}

export function highestConfirmedForSpot(
  bids: Bid[],
  spotId: number,
): Bid | null {
  const list = confirmedBids(bids)
    .filter((bid) => bid.spotId === spotId)
    .sort((a, b) => b.amount - a.amount || b.createdAt.localeCompare(a.createdAt));
  return list[0] ?? null;
}

/** Current public leader on a spot — highest non-rejected bid. */
export function highestForSpot(bids: Bid[], spotId: number): Bid | null {
  const list = activeBids(bids)
    .filter((bid) => bid.spotId === spotId)
    .sort((a, b) => b.amount - a.amount || b.createdAt.localeCompare(a.createdAt));
  return list[0] ?? null;
}

export function isSpotLocked(
  lockedSpotIds: number[] | undefined,
  spotId: number,
): boolean {
  return (lockedSpotIds ?? []).includes(spotId);
}

export function minNextBid(
  bids: Bid[],
  spotId: number,
  lockedSpotIds?: number[],
): number {
  if (isSpotLocked(lockedSpotIds, spotId)) return Infinity;
  const spot = getSpot(spotId);
  if (!spot) return Infinity;
  const current = highestForSpot(bids, spotId);
  if (!current) return spot.startingBid;
  return current.amount + CONFIG.minRaise;
}

export function validateNewBidAmount(
  bids: Bid[],
  spotId: number,
  amount: number,
  lockedSpotIds?: number[],
): string | null {
  if (isSpotLocked(lockedSpotIds, spotId)) {
    return "This spot is locked. No more bids accepted.";
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return "Enter a valid bid amount in USD.";
  }
  const rounded = Math.round(amount * 100) / 100;
  if (rounded !== amount) {
    return "Use at most two decimal places.";
  }
  const min = minNextBid(bids, spotId, lockedSpotIds);
  if (amount < min) {
    const spot = getSpot(spotId);
    const has = highestForSpot(bids, spotId);
    if (!has) {
      return `First bid on this spot must be at least $${spot?.startingBid ?? min}.`;
    }
    return `New bid must beat $${has.amount} by at least $${CONFIG.minRaise}. Minimum: $${min}.`;
  }
  return null;
}

function bidResultFor(
  bid: Bid,
  bids: Bid[],
  lockedSpotIds: number[],
): string {
  const spot = getSpot(bid.spotId);
  const leader = highestForSpot(bids, bid.spotId);
  const confirmedLeader = highestConfirmedForSpot(bids, bid.spotId);

  if (
    isSpotLocked(lockedSpotIds, bid.spotId) &&
    confirmedLeader?.id === bid.id &&
    bid.status === "confirmed"
  ) {
    return "locked";
  }
  if (leader?.id === bid.id) {
    return "leading";
  }
  if (leader) {
    return `outbid ${leader.brandName}`;
  }
  if (bid.status === "rejected") {
    return "outbid";
  }
  return spot ? `outbid` : "outbid";
}

export function buildHistory(
  bids: Bid[],
  lockedSpotIds: number[],
): PublicBidHistoryEntry[] {
  return [...bids]
    .filter((b) => b.status !== "rejected")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((bid) => ({
      id: bid.id,
      spotId: bid.spotId,
      spotName: getSpot(bid.spotId)?.name ?? `Spot ${bid.spotId}`,
      brandName: bid.brandName,
      amount: bid.amount,
      createdAt: bid.createdAt,
      result: bidResultFor(bid, bids, lockedSpotIds),
    }));
}

export function buildTickerLines(bids: Bid[]): string[] {
  const active = [...activeBids(bids)].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
  const lines: string[] = [];

  for (const bid of active) {
    const spotName = getSpot(bid.spotId)?.name ?? `Spot ${bid.spotId}`;
    const earlierOnSpot = active
      .filter(
        (b) =>
          b.spotId === bid.spotId &&
          b.id !== bid.id &&
          b.createdAt < bid.createdAt,
      )
      .sort((a, b) => b.amount - a.amount || b.createdAt.localeCompare(a.createdAt));
    const previous = earlierOnSpot[0];
    if (previous && bid.amount > previous.amount) {
      lines.push(
        `${bid.brandName} outbid ${previous.brandName} on ${spotName} · ${money(bid.amount)}`,
      );
    } else if (!previous) {
      lines.push(`${bid.brandName} opened ${spotName} · ${money(bid.amount)}`);
    }
    if (lines.length >= 8) break;
  }

  return lines;
}

export function buildPublicBoard(
  bids: Bid[],
  lockedSpotIds: number[] = [],
): PublicBoard {
  const locked = lockedSpotIds ?? [];

  const spots: SpotPublicState[] = CONFIG.spots.map((spot) => {
    const top = highestForSpot(bids, spot.id);
    const spotLocked = isSpotLocked(locked, spot.id);
    return {
      spotId: spot.id,
      name: spot.name,
      size: spot.size,
      startingBid: spot.startingBid,
      currentBid: top?.amount ?? null,
      holderHandle: top?.handle ?? null,
      holderBrand: top?.brandName ?? null,
      holderWebsite: top?.website || null,
      holderLogoUrl: top?.logoUrl?.trim() ? top.logoUrl.trim() : null,
      holderKeepBackground: Boolean(top?.keepBackground),
      hasBid: Boolean(top),
      minNextBid: minNextBid(bids, spot.id, locked),
      bidCount: activeBids(bids).filter((b) => b.spotId === spot.id).length,
      locked: spotLocked,
    };
  });

  const raised = spots.reduce((sum, spot) => sum + (spot.currentBid ?? 0), 0);
  const spotsWithBid = spots.filter((spot) => spot.hasBid).length;
  const percent =
    CONFIG.goal <= 0
      ? 0
      : Math.min(100, Math.round((raised / CONFIG.goal) * 1000) / 10);

  const tickerLines = buildTickerLines(bids);

  return {
    raised,
    goal: CONFIG.goal,
    percent,
    spotsWithBid,
    auctionEnd: CONFIG.auctionEnd,
    ended: auctionEnded(),
    paymentLink: getPaymentLink(),
    spots,
    history: buildHistory(bids, locked),
    tickerLines,
  };
}

export function normalizeHandle(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  return trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
}

export function money(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: n % 1 === 0 ? 0 : 2,
  }).format(n);
}

export function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "just now";
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
