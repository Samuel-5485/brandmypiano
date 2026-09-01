export type BidStatus = "pending" | "confirmed" | "rejected";

export type Bid = {
  id: string;
  spotId: number;
  brandName: string;
  handle: string;
  website: string;
  /** Public URL or /logos/... path. Empty/missing = letter avatar until admin pastes a logo. */
  logoUrl?: string;
  /** When true, keep white logo backgrounds (skip near-white knockout). */
  keepBackground?: boolean;
  amount: number;
  deposit: number;
  status: BidStatus;
  createdAt: string;
  updatedAt: string;
  note?: string;
};

export type BidsFile = {
  bids: Bid[];
  lockedSpotIds?: number[];
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
