/**
 * One-shot: remove test bids from local JSON or Supabase.
 * Run: npx tsx scripts/purge-test-bids.ts
 */
import { readAuctionFile, writeAuctionFile } from "../src/lib/store";
import { isTestBid } from "../src/lib/testBids";

async function main() {
  const file = await readAuctionFile();
  const before = file.bids.length;
  const kept = file.bids.filter((b) => !isTestBid(b));
  const removed = before - kept.length;
  await writeAuctionFile({ ...file, bids: kept });
  console.log(`Removed ${removed} test bid(s). ${kept.length} real bid(s) kept.`);
  for (const b of file.bids.filter(isTestBid)) {
    console.log(`  - ${b.brandName} (spot ${b.spotId})`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
