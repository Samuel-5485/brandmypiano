import { CONFIG, getPaymentLink, getSpot } from "@/config";
import type {
  Bid,
  PublicBidHistoryEntry,
  PublicBoard,
  SpotOffer,
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

export function ordinalRank(n: number): string {
  if (n <= 0) return String(n);
  const j = n % 10;
  const k = n % 100;
  if (j === 1 && k !== 11) return `${n}st`;
  if (j === 2 && k !== 12) return `${n}nd`;
  if (j === 3 && k !== 13) return `${n}rd`;
  return `${n}th`;
}

/** All non-rejected bids on one spot, highest amount first. */
export function rankedOffersForSpot(bids: Bid[], spotId: number): SpotOffer[] {
  return activeBids(bids)
    .filter((bid) => bid.spotId === spotId)
    .sort((a, b) => b.amount - a.amount || b.createdAt.localeCompare(a.createdAt))
    .map((bid, index) => ({
      id: bid.id,
      rank: index + 1,
      brandName: bid.brandName,
      handle: bid.handle,
      amount: bid.amount,
      createdAt: bid.createdAt,
      logoUrl: bid.logoUrl?.trim() ? bid.logoUrl.trim() : null,
    }));
}

function bidResultFor(
  bid: Bid,
  bids: Bid[],
  lockedSpotIds: number[],
): string {
  const spotName = getSpot(bid.spotId)?.name ?? `Spot ${bid.spotId}`;
  const ranked = rankedOffersForSpot(bids, bid.spotId);
  const rank = ranked.find((o) => o.id === bid.id)?.rank ?? 0;
  const leader = ranked[0];

  if (
    isSpotLocked(lockedSpotIds, bid.spotId) &&
    leader?.id === bid.id &&
    bid.status === "confirmed"
  ) {
    return "Locked";
  }

  if (rank === 1) {
    const priorOnSpot = activeBids(bids)
      .filter(
        (b) =>
          b.spotId === bid.spotId &&
          b.id !== bid.id &&
          b.createdAt < bid.createdAt,
      )
      .sort(
        (a, b) => b.amount - a.amount || b.createdAt.localeCompare(a.createdAt),
      );
    const previousLeader = priorOnSpot[0];
    if (previousLeader && bid.amount > previousLeader.amount) {
      const prevRankNow =
        ranked.find((o) => o.id === previousLeader.id)?.rank ?? 2;
      return `${bid.brandName} outbid ${previousLeader.brandName} on ${spotName} · ${money(bid.amount)} · ${previousLeader.brandName} is now ${ordinalRank(prevRankNow)}`;
    }
    if (priorOnSpot.length === 0) {
      return `${bid.brandName} opened ${spotName} · ${money(bid.amount)}`;
    }
    return "Leading — logo on the keyboard";
  }

  if (rank > 1) {
    return ordinalRank(rank);
  }

  if (bid.status === "rejected") {
    return "Rejected";
  }

  return ordinalRank(rank);
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
    const priorOnSpot = active
      .filter(
        (b) =>
          b.spotId === bid.spotId &&
          b.id !== bid.id &&
          b.createdAt < bid.createdAt,
      )
      .sort(
        (a, b) => b.amount - a.amount || b.createdAt.localeCompare(a.createdAt),
      );
    const previous = priorOnSpot[0];
    if (previous && bid.amount > previous.amount) {
      const ranked = rankedOffersForSpot(bids, bid.spotId);
      const prevRankNow =
        ranked.find((o) => o.id === previous.id)?.rank ?? 2;
      lines.push(
        `${bid.brandName} outbid ${previous.brandName} on ${spotName} · ${money(bid.amount)} · ${previous.brandName} is now ${ordinalRank(prevRankNow)}`,
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
    const offers = rankedOffersForSpot(bids, spot.id);
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
      bidCount: offers.length,
      locked: spotLocked,
      offers,
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
