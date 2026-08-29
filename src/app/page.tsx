import { AuctionApp } from "@/components/AuctionApp";
import { buildPublicBoard } from "@/lib/auction";
import { readBids } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const bids = await readBids();
  const board = buildPublicBoard(bids);

  return <AuctionApp initialBoard={board} />;
}
