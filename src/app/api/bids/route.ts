import { NextResponse } from "next/server";
import { getSpot } from "@/config";
import {
  auctionEnded,
  buildPublicBoard,
  calcDeposit,
  normalizeHandle,
  validateNewBidAmount,
} from "@/lib/auction";
import { newBidId, readBids, withBidsLock } from "@/lib/store";
import type { Bid } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const bids = await readBids();
  return NextResponse.json(buildPublicBoard(bids));
}

export async function POST(request: Request) {
  if (auctionEnded()) {
    return NextResponse.json(
      { error: "The auction has ended. No new bids are accepted." },
      { status: 403 },
    );
  }

  let body: {
    spotId?: number;
    brandName?: string;
    handle?: string;
    website?: string;
    logoUrl?: string;
    amount?: number;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const spotId = Number(body.spotId);
  const spot = getSpot(spotId);
  if (!spot) {
    return NextResponse.json({ error: "Unknown spot." }, { status: 400 });
  }

  const brandName = String(body.brandName ?? "").trim();
  const handle = normalizeHandle(String(body.handle ?? ""));
  const website = String(body.website ?? "").trim();
  const logoUrl = String(body.logoUrl ?? "").trim();
  const amount = Number(body.amount);

  if (brandName.length < 2) {
    return NextResponse.json(
      { error: "Brand name must be at least 2 characters." },
      { status: 400 },
    );
  }
  if (handle.length < 2) {
    return NextResponse.json(
      { error: "Add your X handle so I can reach you." },
      { status: 400 },
    );
  }
  if (website && !/^https?:\/\//i.test(website)) {
    return NextResponse.json(
      { error: "Website must start with http:// or https://." },
      { status: 400 },
    );
  }
  if (logoUrl) {
    const ok =
      logoUrl.startsWith("/logos/") ||
      logoUrl.startsWith("data:image/") ||
      /^https?:\/\//i.test(logoUrl);
    if (!ok) {
      return NextResponse.json(
        { error: "Logo must be an http(s) URL or an uploaded /logos/ path." },
        { status: 400 },
      );
    }
  }

  const outcome = await withBidsLock(async (bids) => {
    const err = validateNewBidAmount(bids, spotId, amount);
    if (err) return { error: err };

    const now = new Date().toISOString();
    const bid: Bid = {
      id: newBidId(),
      spotId,
      brandName,
      handle,
      website,
      logoUrl,
      amount,
      deposit: calcDeposit(amount),
      status: "pending",
      createdAt: now,
      updatedAt: now,
    };
    return { result: bid, bids: [...bids, bid] };
  });

  if ("error" in outcome) {
    return NextResponse.json({ error: outcome.error }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    bid: outcome.result,
    message:
      "Bid saved as pending. Pay the deposit, then DM me on X with the spot number, brand, and amount.",
  });
}
