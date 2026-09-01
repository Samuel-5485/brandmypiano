import { AuctionApp } from "@/components/AuctionApp";
import { buildPublicBoard } from "@/lib/auction";
import { readAuctionFile } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const file = await readAuctionFile();
  const board = buildPublicBoard(file.bids, file.lockedSpotIds ?? []);

  return <AuctionApp initialBoard={board} />;
}
