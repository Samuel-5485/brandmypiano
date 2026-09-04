import { NextResponse } from "next/server";
import { getSpot } from "@/config";
import {
  auctionEnded,
  buildPublicBoard,
  calcDeposit,
  normalizeHandle,
  validateNewBidAmount,
} from "@/lib/auction";
import { resolveLogoForBid } from "@/lib/logoStorage";
import { BoardLoadError, newBidId, readAuctionFile, withAuctionLock } from "@/lib/store";
import type { Bid } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8" };

function jsonOk(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: JSON_HEADERS });
}

function jsonErr(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status, headers: JSON_HEADERS });
}

type BidBody = {
  spotId?: number;
  brandName?: string;
  handle?: string;
  website?: string;
  logoUrl?: string;
  amount?: number;
};

async function parseBidRequest(request: Request): Promise<{
  body: BidBody;
  file: File | null;
}> {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const rawFile = form.get("file");
    const file = rawFile instanceof File && rawFile.size > 0 ? rawFile : null;
    return {
      body: {
        spotId: Number(form.get("spotId")),
        brandName: String(form.get("brandName") ?? ""),
        handle: String(form.get("handle") ?? ""),
        website: String(form.get("website") ?? ""),
        logoUrl: String(form.get("logoUrl") ?? ""),
        amount: Number(form.get("amount")),
      },
      file,
    };
  }

  try {
    const body = (await request.json()) as BidBody;
    return { body, file: null };
  } catch {
    throw new Error("Invalid JSON body.");
  }
}

function slimBid(bid: Bid) {
  return {
    id: bid.id,
    spotId: bid.spotId,
    brandName: bid.brandName,
    handle: bid.handle,
    amount: bid.amount,
    logoUrl: bid.logoUrl ?? null,
  };
}

export async function GET() {
  try {
    const file = await readAuctionFile();
    return jsonOk({
      ok: true,
      ...buildPublicBoard(file.bids, file.lockedSpotIds ?? []),
    });
  } catch (err) {
    if (err instanceof BoardLoadError) {
      return jsonErr(err.message, 503);
    }
    return jsonErr(err instanceof Error ? err.message : "Could not load board.", 500);
  }
}

export async function POST(request: Request) {
  try {
    if (auctionEnded()) {
      return jsonErr("The auction has ended. No new bids are accepted.", 403);
    }

    let body: BidBody;
    let file: File | null;
    try {
      ({ body, file } = await parseBidRequest(request));
    } catch (err) {
      return jsonErr(err instanceof Error ? err.message : "Invalid request body.", 400);
    }

    const spotId = Number(body.spotId);
    const spot = getSpot(spotId);
    if (!spot) {
      return jsonErr("Unknown spot.", 400);
    }

    const brandName = String(body.brandName ?? "").trim();
    const handle = normalizeHandle(String(body.handle ?? ""));
    const website = String(body.website ?? "").trim();
    const amount = Number(body.amount);
    const logoUrlInput = String(body.logoUrl ?? "").trim();

    if (brandName.length < 2) {
      return jsonErr("Brand name must be at least 2 characters.", 400);
    }
    if (handle.length < 2) {
      return jsonErr("Add your X handle so I can reach you.", 400);
    }
    if (website && !/^https?:\/\//i.test(website)) {
      return jsonErr("Website must start with http:// or https://.", 400);
    }
    if (logoUrlInput.startsWith("data:")) {
      return jsonErr(
        "Logo URL cannot be base64 data. Use Choose file or an https:// URL.",
        400,
      );
    }
    if (logoUrlInput && !/^https:\/\//i.test(logoUrlInput) && !logoUrlInput.startsWith("/logos/")) {
      return jsonErr("Logo URL must start with https://", 400);
    }

    const logo = await resolveLogoForBid({ logoUrl: logoUrlInput, file });

    const outcome = await withAuctionLock(async (auctionFile) => {
      const locked = auctionFile.lockedSpotIds ?? [];
      const err = validateNewBidAmount(auctionFile.bids, spotId, amount, locked);
      if (err) return { error: err };

      const now = new Date().toISOString();
      const bid: Bid = {
        id: newBidId(),
        spotId,
        brandName,
        handle,
        website,
        logoUrl: logo.url ?? undefined,
        amount,
        deposit: calcDeposit(amount),
        status: "pending",
        createdAt: now,
        updatedAt: now,
      };
      return {
        result: bid,
        file: { ...auctionFile, bids: [...auctionFile.bids, bid] },
      };
    });

    if ("error" in outcome) {
      return jsonErr(outcome.error, 400);
    }

    const savedBid = outcome.result;
    if (!savedBid) {
      return jsonErr("Could not save bid.", 500);
    }

    return jsonOk({
      ok: true,
      bid: slimBid(savedBid),
      ...(logo.warning ? { warning: logo.warning } : {}),
    });
  } catch (err) {
    if (err instanceof BoardLoadError) {
      return jsonErr(err.message, 503);
    }
    return jsonErr(err instanceof Error ? err.message : String(err), 500);
  }
}
