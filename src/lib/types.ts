export type BidStatus = "pending" | "confirmed" | "rejected";

export type Bid = {
  id: string;
  spotId: number;
  brandName: string;
  handle: string;
  website: string;
  /** Public URL or /logos/... path. Empty/missing = letter avatar until admin pastes a logo. */
  logoUrl?: string;
  amount: number;
  deposit: number;
  status: BidStatus;
  createdAt: string;
  updatedAt: string;
  note?: string;
};

export type BidsFile = {
  bids: Bid[];
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
  hasBid: boolean;
  minNextBid: number;
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
};
