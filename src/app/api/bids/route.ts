import { NextResponse } from "next/server";
import { getSpot } from "@/config";
import {
  auctionEnded,
  buildPublicBoard,
  calcDeposit,
  normalizeHandle,
  validateNewBidAmount,
} from "@/lib/auction";
import { newBidId, readAuctionFile, withAuctionLock } from "@/lib/store";
import type { Bid } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const file = await readAuctionFile();
  return NextResponse.json(
    buildPublicBoard(file.bids, file.lockedSpotIds ?? []),
  );
}

export async function POST(request: Request) {
  try {
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

    const outcome = await withAuctionLock(async (file) => {
      const locked = file.lockedSpotIds ?? [];
      const err = validateNewBidAmount(file.bids, spotId, amount, locked);
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
      return {
        result: bid,
        file: { ...file, bids: [...file.bids, bid] },
      };
    });

    if ("error" in outcome) {
      return NextResponse.json({ error: outcome.error }, { status: 400 });
    }

    const file = await readAuctionFile();
    const board = buildPublicBoard(file.bids, file.lockedSpotIds ?? []);

    return NextResponse.json({
      ok: true,
      bid: outcome.result,
      board,
      message:
        "Bid is live on the board. Pay to lock only if you are the current leader on this spot.",
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not save bid. Try again.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
