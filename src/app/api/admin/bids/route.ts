import { NextResponse } from "next/server";
import { CONFIG, getSpot } from "@/config";
import {
  buildPublicBoard,
  calcDeposit,
  highestConfirmedForSpot,
  normalizeHandle,
} from "@/lib/auction";
import { isAdminAuthenticated } from "@/lib/auth";
import { newBidId, readAuctionFile, withAuctionLock } from "@/lib/store";
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

  if (action === "confirm" || action === "reject") {
    const id = String(body.id ?? "");
    const outcome = await withAuctionLock(async (file) => {
      const idx = file.bids.findIndex((b) => b.id === id);
      if (idx < 0) return { error: "Bid not found." };
      const nextBids = [...file.bids];
      const target = { ...nextBids[idx] };
      target.status = action === "confirm" ? "confirmed" : "rejected";
      target.updatedAt = new Date().toISOString();
      nextBids[idx] = target;

      let lockedSpotIds = [...(file.lockedSpotIds ?? [])];

      if (action === "confirm") {
        for (let i = 0; i < nextBids.length; i++) {
          if (
            i !== idx &&
            nextBids[i].spotId === target.spotId &&
            nextBids[i].status === "confirmed" &&
            nextBids[i].amount < target.amount
          ) {
            nextBids[i] = {
              ...nextBids[i],
              status: "rejected",
              updatedAt: new Date().toISOString(),
              note:
                (nextBids[i].note ? nextBids[i].note + " | " : "") +
                "Outbid — refund deposit manually.",
            };
          }
        }
        if (!lockedSpotIds.includes(target.spotId)) {
          lockedSpotIds = [...lockedSpotIds, target.spotId];
        }
      }

      return {
        result: nextBids[idx],
        file: { bids: nextBids, lockedSpotIds },
      };
    });

    if ("error" in outcome) {
      return NextResponse.json({ error: outcome.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true, bid: outcome.result });
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
      let next = [...file.bids, bid];
      let lockedSpotIds = [...(file.lockedSpotIds ?? [])];
      if (status === "confirmed") {
        next = next.map((b) => {
          if (
            b.id !== bid.id &&
            b.spotId === spotId &&
            b.status === "confirmed" &&
            b.amount < amount
          ) {
            return {
              ...b,
              status: "rejected" as const,
              updatedAt: now,
              note:
                (b.note ? b.note + " | " : "") + "Outbid — refund deposit manually.",
            };
          }
          return b;
        });
        if (!lockedSpotIds.includes(spotId)) {
          lockedSpotIds = [...lockedSpotIds, spotId];
        }
      }
      return { result: bid, file: { bids: next, lockedSpotIds } };
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

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
