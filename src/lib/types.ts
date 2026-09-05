export type BidStatus = "pending" | "confirmed" | "rejected";

export type Bid = {
  id: string;
  spotId: number;
  brandName: string;
  handle: string;
  website: string;
  /** Supabase / local path. Empty = letter avatar until admin uploads. */
  logoUrl?: string;
  /** When true, keep white logo backgrounds (skip near-white knockout). */
  keepBackground?: boolean;
  amount: number;
  deposit: number;
  status: BidStatus;
  createdAt: string;
  updatedAt: string;
  note?: string;
  /** Set in admin after Polar payment is verified. */
  paidAt?: string;
  /** Set in admin after a beaten payer is refunded in Polar. */
  refundedAt?: string;
  /** Admin flag: beaten payer needs a Polar refund. */
  refundNeeded?: boolean;
};

export type BidsFile = {
  bids: Bid[];
  lockedSpotIds?: number[];
};

export type SpotOffer = {
  id: string;
  rank: number;
  brandName: string;
  handle: string;
  amount: number;
  createdAt: string;
  logoUrl: string | null;
};

export type SpotPublicState = {
  spotId: number;
  name: string;
  size: string;
  startingBid: number;
  currentBid: number | null;
  holderHandle: string | null;
  holderBrand: string | null;
  holderWebsite: string | null;
  holderLogoUrl: string | null;
  holderKeepBackground: boolean;
  hasBid: boolean;
  minNextBid: number;
  bidCount: number;
  locked: boolean;
  /** All non-rejected bids on this spot, highest first. */
  offers: SpotOffer[];
};

export type PublicBidHistoryEntry = {
  id: string;
  spotId: number;
  spotName: string;
  brandName: string;
  amount: number;
  createdAt: string;
  result: string;
};

export type PublicBoard = {
  raised: number;
  goal: number;
  percent: number;
  spotsWithBid: number;
  auctionEnd: string;
  ended: boolean;
  paymentLink: string;
  spots: SpotPublicState[];
  history: PublicBidHistoryEntry[];
  tickerLines: string[];
};
