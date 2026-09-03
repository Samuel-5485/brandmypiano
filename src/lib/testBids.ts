import type { Bid } from "@/lib/types";

const TEST_BRAND_NAMES = new Set(
  ["test brand", "debug brand", "piano brand"].map((s) => s.toLowerCase()),
);

const TEST_HANDLES = new Set(["@testuser", "@debuguser"]);

/** True for seed/debug bids that must not appear on the public board. */
export function isTestBid(bid: Bid): boolean {
  const brand = bid.brandName.trim().toLowerCase();
  if (TEST_BRAND_NAMES.has(brand)) return true;

  const handle = bid.handle.trim().toLowerCase();
  if (TEST_HANDLES.has(handle)) return true;

  const note = (bid.note ?? "").toLowerCase();
  if (/\b(test|debug|seed)\b/.test(note)) return true;

  return false;
}

export function stripTestBids(bids: Bid[]): Bid[] {
  return bids.filter((bid) => !isTestBid(bid));
}
