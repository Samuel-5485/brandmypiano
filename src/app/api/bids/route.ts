import { getSpot } from "@/config";
import {
  auctionEnded,
  buildPublicBoard,
  calcDeposit,
  normalizeHandle,
  validateNewBidAmount,
} from "@/lib/auction";
import { apiError, apiOk } from "@/lib/apiResponse";
import { resolveLogoForBid } from "@/lib/logoStorage";
import { BoardLoadError, newBidId, readAuctionFile, withAuctionLock } from "@/lib/store";
import type { Bid } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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

export async function GET() {
  try {
    const file = await readAuctionFile();
    return apiOk(
      buildPublicBoard(file.bids, file.lockedSpotIds ?? []) as unknown as Record<
        string,
        unknown
      >,
    );
  } catch (err) {
    if (err instanceof BoardLoadError) {
      return apiError(err.message, 503);
    }
    return apiError(
      err instanceof Error ? err.message : "Could not load board.",
      500,
    );
  }
}

export async function POST(request: Request) {
  try {
    if (auctionEnded()) {
      return apiError("The auction has ended. No new bids are accepted.", 403);
    }

    let body: BidBody;
    let file: File | null;
    try {
      ({ body, file } = await parseBidRequest(request));
    } catch (err) {
      return apiError(
        err instanceof Error ? err.message : "Invalid request body.",
        400,
      );
    }

    const spotId = Number(body.spotId);
    const spot = getSpot(spotId);
    if (!spot) {
      return apiError("Unknown spot.", 400);
    }

    const brandName = String(body.brandName ?? "").trim();
    const handle = normalizeHandle(String(body.handle ?? ""));
    const website = String(body.website ?? "").trim();
    const amount = Number(body.amount);

    if (brandName.length < 2) {
      return apiError("Brand name must be at least 2 characters.", 400);
    }
    if (handle.length < 2) {
      return apiError("Add your X handle so I can reach you.", 400);
    }
    if (website && !/^https?:\/\//i.test(website)) {
      return apiError("Website must start with http:// or https://.", 400);
    }

    const logo = await resolveLogoForBid({
      logoUrl: String(body.logoUrl ?? "").trim(),
      file,
    });

    // #region agent log
    fetch("http://127.0.0.1:7681/ingest/d8bbfca4-00dd-492f-ae23-8c4a307aedad", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "c3e306" },
      body: JSON.stringify({
        sessionId: "c3e306",
        runId: "bid-post",
        hypothesisId: "H4",
        location: "api/bids/route.ts:POST",
        message: "logo resolved for bid",
        data: {
          hadFile: Boolean(file),
          logoUrlSet: Boolean(logo.url),
          warning: logo.warning ?? null,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

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
        logoUrl: logo.url ?? undefined,
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
      return apiError(outcome.error, 400);
    }

    const auctionFile = await readAuctionFile();
    const board = buildPublicBoard(auctionFile.bids, auctionFile.lockedSpotIds ?? []);

    return apiOk({
      bid: outcome.result,
      board,
      message:
        "Bid is live on the board. Pay to lock only if you are the current leader on this spot.",
      ...(logo.warning ? { warning: logo.warning } : {}),
    });
  } catch (err) {
    if (err instanceof BoardLoadError) {
      return apiError(err.message, 503);
    }
    const message =
      err instanceof Error ? err.message : "Could not save bid. Try again.";
    // #region agent log
    fetch("http://127.0.0.1:7681/ingest/d8bbfca4-00dd-492f-ae23-8c4a307aedad", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "c3e306" },
      body: JSON.stringify({
        sessionId: "c3e306",
        runId: "bid-post",
        hypothesisId: "H5",
        location: "api/bids/route.ts:POST:catch",
        message: "bid save failed",
        data: { error: message },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    return apiError(message, 500);
  }
}
