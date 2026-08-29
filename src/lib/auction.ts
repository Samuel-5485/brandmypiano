import { CONFIG, getPaymentLink, getSpot } from "@/config";
import type { Bid, PublicBoard, SpotPublicState } from "@/lib/types";

export function auctionEnded(now = new Date()): boolean {
  return now.getTime() >= new Date(CONFIG.auctionEnd).getTime();
}

export function calcDeposit(amount: number): number {
  return Math.max(
    CONFIG.minDeposit,
    Math.round(amount * CONFIG.depositPct * 100) / 100,
  );
}

export function confirmedBids(bids: Bid[]): Bid[] {
  return bids.filter((bid) => bid.status === "confirmed");
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

export function minNextBid(bids: Bid[], spotId: number): number {
  const spot = getSpot(spotId);
  if (!spot) return Infinity;
  const current = highestConfirmedForSpot(bids, spotId);
  if (!current) return spot.startingBid;
  return current.amount + CONFIG.minRaise;
}

export function validateNewBidAmount(
  bids: Bid[],
  spotId: number,
  amount: number,
): string | null {
  if (!Number.isFinite(amount) || amount <= 0) {
    return "Enter a valid bid amount in USD.";
  }
  const rounded = Math.round(amount * 100) / 100;
  if (rounded !== amount) {
    return "Use at most two decimal places.";
  }
  const min = minNextBid(bids, spotId);
  if (amount < min) {
    const spot = getSpot(spotId);
    const has = highestConfirmedForSpot(bids, spotId);
    if (!has) {
      return `First bid on this spot must be at least $${spot?.startingBid ?? min}.`;
    }
    return `New bid must beat $${has.amount} by at least $${CONFIG.minRaise}. Minimum: $${min}.`;
  }
  return null;
}

export function buildPublicBoard(bids: Bid[]): PublicBoard {
  const spots: SpotPublicState[] = CONFIG.spots.map((spot) => {
    const top = highestConfirmedForSpot(bids, spot.id);
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
      hasBid: Boolean(top),
      minNextBid: minNextBid(bids, spot.id),
    };
  });

  const raised = spots.reduce((sum, spot) => sum + (spot.currentBid ?? 0), 0);
  const spotsWithBid = spots.filter((spot) => spot.hasBid).length;
  const percent =
    CONFIG.goal <= 0 ? 0 : Math.min(100, Math.round((raised / CONFIG.goal) * 1000) / 10);

  return {
    raised,
    goal: CONFIG.goal,
    percent,
    spotsWithBid,
    auctionEnd: CONFIG.auctionEnd,
    ended: auctionEnded(),
    paymentLink: getPaymentLink(),
    spots,
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
