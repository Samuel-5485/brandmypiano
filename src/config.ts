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
  goal: 899,
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
    "I’m funding an 88-key Yamaha so I can practice every day and play in church. Ten sticker spots. I don’t own the piano yet. The auction buys it.",
  story: `About 4 years ago my brother had a small practice piano. I learned on that and became decent, but I still lack confidence accompanying singers — rhythm, intros, following a vocalist. I want to play in church. This is a gift I want to use to serve God. I do not own a real 88-key piano. This site buys it.

Stickers live on my instrument, case, stand, or bag. They can appear in practice videos and photos. They will not be forced into a worship service. I do not sell pulpit ads or promise church shoutouts.`,
  honestLine:
    "You are not buying a sticker. You are buying 12 months on the instrument I practice on, travel with, and film. If the videos go nowhere, you bought a logo on a piano. If people watch, you sat in every frame.",
  adminNote: "Confirm only after you see the Polar payment or a clear DM proof.",
  parts: [
    { label: "Yamaha P-225 (88 weighted keys)", amount: 650 },
    { label: "X-stand + sustain pedal", amount: 79 },
    { label: "Padded bag so it can travel to church", amount: 55 },
    { label: "Vinyl print + application", amount: 40 },
    { label: "Domain + hosting buffer", amount: 15 },
    { label: "Remainder / strings & cables", amount: 60 },
  ] satisfies PartConfig[],
  spots: [
    { id: 1, name: "Music rest — the billboard", size: "28 × 8 cm", startingBid: 80 },
    { id: 2, name: "Fallboard, above the keys", size: "18 × 4 cm", startingBid: 60 },
    { id: 3, name: "Left cheek block", size: "8 × 4 cm", startingBid: 25 },
    { id: 4, name: "Right cheek block", size: "8 × 4 cm", startingBid: 25 },
    { id: 5, name: "Lid, top left", size: "12 × 5 cm", startingBid: 35 },
    { id: 6, name: "Lid, top right", size: "12 × 5 cm", startingBid: 35 },
    { id: 7, name: "Left side panel", size: "14 × 6 cm", startingBid: 30 },
    { id: 8, name: "Travel case front", size: "14 × 6 cm", startingBid: 30 },
    { id: 9, name: "Stand crossbar", size: "14 × 4 cm", startingBid: 20 },
    { id: 10, name: "Padded bag", size: "14 × 6 cm", startingBid: 20 },
  ] satisfies SpotConfig[],
} as const;

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
