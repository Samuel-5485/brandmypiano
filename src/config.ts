export type SpotConfig = {
  id: number;
  name: string;
  size: string;
  startingBid: number;
};

export type PartConfig = {
  label: string;
  amount: number;
};

export const CONFIG = {
  name: "YOUR NAME",
  handle: "@YOURHANDLE",
  xProfile: "https://x.com/YOURHANDLE",
  paymentLink: "",
  goal: 1000,
  /** ISO string. Auction ends at this moment. Edit before launch. */
  auctionEnd: "2026-09-12T20:00:00+03:00",
  minRaise: 5,
  depositPct: 0.2,
  minDeposit: 5,
  timezoneNote: "East Africa (EAT, UTC+3)",
  siteName: "Brand My Piano",
  domainText: "Brand My Piano",
  headline: "Your brand, on my piano.",
  heroLede:
    "I'm funding a Yamaha PSR-E383 portable keyboard kit so I can practice every day and play in church. Eleven sticker spots. I don't own it yet. The auction buys it.",
  story: `About 4 years ago my brother had a small practice piano. I learned on that and became decent, but I still lack confidence accompanying singers — rhythm, intros, following a vocalist. I want to play in church. This is a gift I want to use to serve God. I do not own a real keyboard yet. This site buys a Yamaha PSR-E383 — 61 keys, portable, not hammer action.

Stickers live on my instrument, stand, bench, bag, pedal, or headphones. They can appear in practice videos and photos. They will not be forced into a worship service. I do not sell pulpit ads or promise church shoutouts.`,
  honestLine:
    "You are not buying a sticker. You are buying 12 months on the instrument I practice on, travel with, and film. If the videos go nowhere, you bought a logo on a keyboard. If people watch, you sat in every frame.",
  adminNote: "Confirm only after you see the Polar payment or a clear DM proof.",
  parts: [
    { label: "Yamaha PSR-E383 (61 portable keys)", amount: 520 },
    { label: "X-stand + sustain pedal", amount: 89 },
    { label: "Bench", amount: 80 },
    { label: "Headphones", amount: 40 },
    { label: "Padded gig bag", amount: 79 },
    { label: "Vinyl print + application", amount: 40 },
    { label: "Domain + hosting buffer", amount: 15 },
    { label: "Remainder / cables & power", amount: 137 },
  ] satisfies PartConfig[],
  spots: [
    { id: 1, name: "Music rest — the billboard", size: "28 × 8 cm", startingBid: 80 },
    { id: 2, name: "Rail above the keys", size: "18 × 3 cm", startingBid: 60 },
    { id: 3, name: "Left speaker grille", size: "10 × 5 cm", startingBid: 25 },
    { id: 4, name: "Right speaker grille", size: "10 × 5 cm", startingBid: 25 },
    { id: 5, name: "Left end of body", size: "8 × 10 cm", startingBid: 30 },
    { id: 6, name: "Right end of body", size: "6 × 8 cm", startingBid: 30 },
    { id: 7, name: "X-stand crossbar", size: "12 × 5 cm", startingBid: 25 },
    { id: 8, name: "Bench seat (right)", size: "16 × 10 cm", startingBid: 35 },
    { id: 9, name: "Long gig bag (left)", size: "18 × 10 cm", startingBid: 30 },
    { id: 10, name: "Sustain pedal on floor", size: "8 × 5 cm", startingBid: 20 },
    { id: 11, name: "Headphones on bench", size: "6 × 5 cm", startingBid: 20 },
  ] satisfies SpotConfig[],
} as const;

export const SPOT_COUNT = CONFIG.spots.length;

const partsTotal = CONFIG.parts.reduce((sum, part) => sum + part.amount, 0);
if (partsTotal !== CONFIG.goal) {
  throw new Error(
    `CONFIG.parts sum to $${partsTotal}, but CONFIG.goal is $${CONFIG.goal}. Fix src/config.ts.`,
  );
}

/** Prefer env override so you can rotate Polar without a redeploy of config. */
export function getPaymentLink(): string {
  const fromEnv = process.env.PAYMENT_LINK?.trim();
  if (fromEnv) return fromEnv;
  return CONFIG.paymentLink.trim();
}

export function getSpot(id: number): SpotConfig | undefined {
  return CONFIG.spots.find((spot) => spot.id === id);
}
