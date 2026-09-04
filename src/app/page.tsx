import { AuctionApp } from "@/components/AuctionApp";
import { buildPublicBoard } from "@/lib/auction";
import { BoardLoadError, readAuctionFile } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  try {
    const file = await readAuctionFile();
    const board = buildPublicBoard(file.bids, file.lockedSpotIds ?? []);
    return <AuctionApp initialBoard={board} />;
  } catch (err) {
    if (err instanceof BoardLoadError) {
      return <AuctionApp boardUnavailable />;
    }
    throw err;
  }
}
