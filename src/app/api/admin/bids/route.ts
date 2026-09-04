import { NextResponse } from "next/server";
import { CONFIG, getSpot } from "@/config";
import {
  buildPublicBoard,
  calcDeposit,
  highestConfirmedForSpot,
  highestForSpot,
  isSpotLocked,
  normalizeHandle,
} from "@/lib/auction";
import { isAdminAuthenticated } from "@/lib/auth";
import { BoardLoadError, deleteBid, newBidId, readAuctionFile, withAuctionLock } from "@/lib/store";
import { isTestBid } from "@/lib/testBids";
import type { Bid, BidStatus } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function requireAdmin() {
  return isAdminAuthenticated();
}

export async function GET(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    if (searchParams.get("format") === "csv") {
      const bids = await readAuctionFile();
    const header = [
      "id",
      "spotId",
      "spotName",
      "brandName",
      "handle",
      "website",
      "logoUrl",
      "amount",
      "deposit",
      "status",
      "paidAt",
      "refundedAt",
      "refundNeeded",
      "createdAt",
      "updatedAt",
      "note",
    ];
    const rows = bids.bids.map((bid) => {
      const spot = getSpot(bid.spotId);
      return [
        bid.id,
        bid.spotId,
        spot?.name ?? "",
        bid.brandName,
        bid.handle,
        bid.website,
        bid.logoUrl ?? "",
        bid.amount,
        bid.deposit,
        bid.status,
        bid.paidAt ?? "",
        bid.refundedAt ?? "",
        bid.refundNeeded ? "yes" : "",
        bid.createdAt,
        bid.updatedAt,
        bid.note ?? "",
      ]
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(",");
    });
    const csv = [header.join(","), ...rows].join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="brandmypiano-bids.csv"',
      },
    });
  }

    const file = await readAuctionFile();
    return NextResponse.json({
      bids: file.bids,
      board: buildPublicBoard(file.bids, file.lockedSpotIds ?? []),
      adminNote: CONFIG.adminNote,
      lockedSpotIds: file.lockedSpotIds ?? [],
    });
  } catch (err) {
    if (err instanceof BoardLoadError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    throw err;
  }
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    action?: string;
    id?: string;
    spotId?: number;
    brandName?: string;
    handle?: string;
    website?: string;
    logoUrl?: string;
    keepBackground?: boolean;
    amount?: number;
    status?: BidStatus;
    note?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const action = body.action;

  if (action === "confirm_payment") {
    const id = String(body.id ?? "");
    const outcome = await withAuctionLock(async (file) => {
      const idx = file.bids.findIndex((b) => b.id === id);
      if (idx < 0) return { error: "Bid not found." };
      const nextBids = [...file.bids];
      const target = { ...nextBids[idx] };
      if (target.status === "rejected") return { error: "Bid was rejected." };
      if (target.refundedAt) return { error: "Already refunded." };
      if (isSpotLocked(file.lockedSpotIds ?? [], target.spotId)) {
        return { error: "Spot is already locked." };
      }
      const leader = highestForSpot(nextBids, target.spotId);
      if (!leader || leader.id !== target.id) {
        return { error: "Only the current 1st bidder can confirm payment." };
      }
      const now = new Date().toISOString();
      target.paidAt = now;
      target.updatedAt = now;
      nextBids[idx] = target;
      return { result: target, file: { ...file, bids: nextBids } };
    });
    if ("error" in outcome) {
      return NextResponse.json({ error: outcome.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true, bid: outcome.result });
  }

  if (action === "refund") {
    const id = String(body.id ?? "");
    const outcome = await withAuctionLock(async (file) => {
      const idx = file.bids.findIndex((b) => b.id === id);
      if (idx < 0) return { error: "Bid not found." };
      const nextBids = [...file.bids];
      const target = { ...nextBids[idx] };
      if (!target.paidAt) return { error: "No payment recorded for this bid." };
      if (target.refundedAt) return { error: "Already refunded." };
      if (isSpotLocked(file.lockedSpotIds ?? [], target.spotId)) {
        const leader = highestForSpot(nextBids, target.spotId);
        if (leader?.id === target.id) {
          return { error: "Locked winner cannot be refunded." };
        }
      }
      const now = new Date().toISOString();
      target.refundedAt = now;
      target.refundNeeded = false;
      target.updatedAt = now;
      nextBids[idx] = target;
      return { result: target, file: { ...file, bids: nextBids } };
    });
    if ("error" in outcome) {
      return NextResponse.json({ error: outcome.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true, bid: outcome.result });
  }

  if (action === "lock_spot") {
    const fromBidId = body.id ? String(body.id) : "";
    const outcome = await withAuctionLock(async (file) => {
      const spotId =
        body.spotId !== undefined
          ? Number(body.spotId)
          : fromBidId
            ? file.bids.find((b) => b.id === fromBidId)?.spotId
            : NaN;
      if (!getSpot(Number(spotId))) return { error: "Unknown spot." };
      if (isSpotLocked(file.lockedSpotIds ?? [], Number(spotId))) {
        return { error: "Spot already locked." };
      }
      const leader = highestForSpot(file.bids, Number(spotId));
      if (!leader) return { error: "No bids on this spot." };
      if (!leader.paidAt) return { error: "Current leader has not paid yet." };
      const unpaidBeatens = file.bids.filter(
        (b) =>
          b.spotId === Number(spotId) &&
          b.id !== leader.id &&
          b.status !== "rejected" &&
          b.paidAt &&
          !b.refundedAt,
      );
      if (unpaidBeatens.length > 0) {
        return { error: "Refund beaten payers before locking this spot." };
      }
      const now = new Date().toISOString();
      const nextBids = file.bids.map((b) =>
        b.id === leader.id
          ? { ...b, status: "confirmed" as const, updatedAt: now }
          : b,
      );
      const lockedSpotIds = [...(file.lockedSpotIds ?? []), Number(spotId)];
      return {
        result: nextBids.find((b) => b.id === leader.id)!,
        file: { bids: nextBids, lockedSpotIds },
      };
    });
    if ("error" in outcome) {
      return NextResponse.json({ error: outcome.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true, bid: outcome.result });
  }

  if (action === "reject") {
    const id = String(body.id ?? "");
    const outcome = await withAuctionLock(async (file) => {
      const idx = file.bids.findIndex((b) => b.id === id);
      if (idx < 0) return { error: "Bid not found." };
      const nextBids = [...file.bids];
      const target = { ...nextBids[idx] };
      target.status = "rejected";
      target.updatedAt = new Date().toISOString();
      nextBids[idx] = target;
      return { result: target, file: { ...file, bids: nextBids } };
    });
    if ("error" in outcome) {
      return NextResponse.json({ error: outcome.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true, bid: outcome.result });
  }

  if (action === "confirm") {
    return NextResponse.json(
      { error: "Use confirm_payment, then lock_spot when ready." },
      { status: 400 },
    );
  }

  if (action === "update") {
    const id = String(body.id ?? "");
    const outcome = await withAuctionLock(async (file) => {
      const idx = file.bids.findIndex((b) => b.id === id);
      if (idx < 0) return { error: "Bid not found." };
      const next = [...file.bids];
      const current = { ...next[idx] };
      if (body.brandName !== undefined) current.brandName = String(body.brandName).trim();
      if (body.handle !== undefined) current.handle = normalizeHandle(String(body.handle));
      if (body.website !== undefined) current.website = String(body.website).trim();
      if (body.logoUrl !== undefined) current.logoUrl = String(body.logoUrl).trim();
      if (body.keepBackground !== undefined) {
        current.keepBackground = Boolean(body.keepBackground);
      }
      if (body.amount !== undefined) {
        const amount = Number(body.amount);
        if (!Number.isFinite(amount) || amount <= 0) return { error: "Invalid amount." };
        current.amount = amount;
        current.deposit = calcDeposit(amount);
      }
      if (body.status !== undefined) {
        if (!["pending", "confirmed", "rejected"].includes(body.status)) {
          return { error: "Invalid status." };
        }
        current.status = body.status;
      }
      if (body.note !== undefined) current.note = String(body.note);
      if (body.spotId !== undefined) {
        if (!getSpot(Number(body.spotId))) return { error: "Unknown spot." };
        current.spotId = Number(body.spotId);
      }
      current.updatedAt = new Date().toISOString();
      next[idx] = current;
      return { result: current, file: { ...file, bids: next } };
    });

    if ("error" in outcome) {
      return NextResponse.json({ error: outcome.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true, bid: outcome.result });
  }

  if (action === "create") {
    const spotId = Number(body.spotId);
    if (!getSpot(spotId)) {
      return NextResponse.json({ error: "Unknown spot." }, { status: 400 });
    }
    const brandName = String(body.brandName ?? "").trim();
    const handle = normalizeHandle(String(body.handle ?? ""));
    const website = String(body.website ?? "").trim();
    const logoUrl = String(body.logoUrl ?? "").trim();
    const amount = Number(body.amount);
    const status = (body.status ?? "confirmed") as BidStatus;

    if (!brandName || !handle || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "brandName, handle, and amount are required." },
        { status: 400 },
      );
    }
    if (!["pending", "confirmed", "rejected"].includes(status)) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }

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
      status,
      createdAt: now,
      updatedAt: now,
      note: body.note ? String(body.note) : "Added manually in admin.",
    };

    const outcome = await withAuctionLock(async (file) => {
      return { result: bid, file: { ...file, bids: [...file.bids, bid] } };
    });

    if ("error" in outcome) {
      return NextResponse.json({ error: outcome.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true, bid: outcome.result });
  }

  if (action === "leader") {
    // Convenience: set current holder by confirming/updating highest for a spot
    const spotId = Number(body.spotId);
    const amount = Number(body.amount);
    const brandName = String(body.brandName ?? "").trim();
    const handle = normalizeHandle(String(body.handle ?? ""));
    if (!getSpot(spotId) || !brandName || !handle || !Number.isFinite(amount)) {
      return NextResponse.json({ error: "Missing fields." }, { status: 400 });
    }

    const now = new Date().toISOString();
    const outcome = await withAuctionLock(async (file) => {
      const existing = highestConfirmedForSpot(file.bids, spotId);
      let next = [...file.bids];
      if (existing) {
        next = next.map((b) =>
          b.id === existing.id
            ? {
                ...b,
                brandName,
                handle,
                amount,
                deposit: calcDeposit(amount),
                website: String(body.website ?? b.website),
                logoUrl:
                  body.logoUrl !== undefined
                    ? String(body.logoUrl).trim()
                    : (b.logoUrl ?? ""),
                updatedAt: now,
                note: (b.note ? b.note + " | " : "") + "Edited in admin.",
              }
            : b,
        );
        const updated = next.find((b) => b.id === existing.id)!;
        return { result: updated, file: { ...file, bids: next } };
      }
      const bid: Bid = {
        id: newBidId(),
        spotId,
        brandName,
        handle,
        website: String(body.website ?? ""),
        logoUrl: String(body.logoUrl ?? ""),
        amount,
        deposit: calcDeposit(amount),
        status: "confirmed",
        createdAt: now,
        updatedAt: now,
        note: "Set as current holder in admin.",
      };
      return { result: bid, file: { ...file, bids: [...next, bid] } };
    });

    if ("error" in outcome) {
      return NextResponse.json({ error: outcome.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true, bid: outcome.result });
  }

  if (action === "delete") {
    const id = String(body.id ?? "");
    if (!id) {
      return NextResponse.json({ error: "Missing bid id." }, { status: 400 });
    }
    try {
      await deleteBid(id);
      return NextResponse.json({ ok: true });
    } catch {
      return NextResponse.json({ error: "Could not delete bid." }, { status: 500 });
    }
  }

  if (action === "refund_needed") {
    const id = String(body.id ?? "");
    const outcome = await withAuctionLock(async (file) => {
      const idx = file.bids.findIndex((b) => b.id === id);
      if (idx < 0) return { error: "Bid not found." };
      const nextBids = [...file.bids];
      const target = { ...nextBids[idx] };
      if (!target.paidAt) return { error: "No payment recorded for this bid." };
      if (target.refundedAt) return { error: "Already refunded." };
      target.refundNeeded = true;
      target.updatedAt = new Date().toISOString();
      nextBids[idx] = target;
      return { result: target, file: { ...file, bids: nextBids } };
    });
    if ("error" in outcome) {
      return NextResponse.json({ error: outcome.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true, bid: outcome.result });
  }

  if (action === "purge_test_bids") {
    const outcome = await withAuctionLock(async (file) => {
      const removed = file.bids.filter((b) => isTestBid(b));
      const kept = file.bids.filter((b) => !isTestBid(b));
      return {
        result: { removed: removed.length, kept: kept.length },
        file: { ...file, bids: kept },
      };
    });
    if ("error" in outcome) {
      return NextResponse.json({ error: outcome.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true, ...outcome.result });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
