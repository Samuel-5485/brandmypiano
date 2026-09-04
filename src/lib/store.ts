import { promises as fs } from "fs";
import path from "path";
import {
  adminDeleteEq,
  adminDeleteIn,
  adminInsert,
  adminUpsert,
  hasSupabaseAdmin,
  hasSupabasePublic,
  publicSelect,
} from "@/lib/supabase/rest";
import type { Bid, BidsFile } from "@/lib/types";

const LOCAL_PATH = path.join(process.cwd(), "data", "bids.json");

export class BoardLoadError extends Error {
  constructor(message = "Board can't load.") {
    super(message);
    this.name = "BoardLoadError";
  }
}

type BidRow = {
  id: string;
  spot_id: number;
  brand_name: string;
  handle: string;
  website: string;
  logo_url: string;
  keep_background: boolean;
  amount: number;
  deposit: number;
  status: string;
  note: string | null;
  paid_at: string | null;
  refunded_at: string | null;
  refund_needed: boolean;
  created_at: string;
  updated_at: string;
};

function emptyFile(): BidsFile {
  return { bids: [], lockedSpotIds: [] };
}

function normalizeFile(parsed: BidsFile | null): BidsFile {
  if (!parsed || !Array.isArray(parsed.bids)) return emptyFile();
  return {
    bids: parsed.bids,
    lockedSpotIds: Array.isArray(parsed.lockedSpotIds)
      ? parsed.lockedSpotIds.filter((id) => Number.isInteger(id))
      : [],
  };
}

function isVercel(): boolean {
  return Boolean(process.env.VERCEL);
}

function shouldUseSupabase(): boolean {
  return hasSupabaseAdmin() && hasSupabasePublic();
}

function rowToBid(row: BidRow): Bid {
  return {
    id: row.id,
    spotId: row.spot_id,
    brandName: row.brand_name,
    handle: row.handle,
    website: row.website ?? "",
    logoUrl: row.logo_url || undefined,
    keepBackground: row.keep_background || undefined,
    amount: Number(row.amount),
    deposit: Number(row.deposit),
    status: row.status as Bid["status"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    note: row.note ?? undefined,
    paidAt: row.paid_at ?? undefined,
    refundedAt: row.refunded_at ?? undefined,
    refundNeeded: row.refund_needed || undefined,
  };
}

function bidToRow(bid: Bid): BidRow {
  return {
    id: bid.id,
    spot_id: bid.spotId,
    brand_name: bid.brandName,
    handle: bid.handle,
    website: bid.website ?? "",
    logo_url: bid.logoUrl ?? "",
    keep_background: Boolean(bid.keepBackground),
    amount: bid.amount,
    deposit: bid.deposit,
    status: bid.status,
    note: bid.note ?? null,
    paid_at: bid.paidAt ?? null,
    refunded_at: bid.refundedAt ?? null,
    refund_needed: Boolean(bid.refundNeeded),
    created_at: bid.createdAt,
    updated_at: bid.updatedAt,
  };
}

async function readLocal(): Promise<BidsFile> {
  try {
    const raw = await fs.readFile(LOCAL_PATH, "utf8");
    return normalizeFile(JSON.parse(raw) as BidsFile);
  } catch {
    return emptyFile();
  }
}

async function writeLocal(data: BidsFile): Promise<void> {
  await fs.mkdir(path.dirname(LOCAL_PATH), { recursive: true });
  await fs.writeFile(LOCAL_PATH, JSON.stringify(data, null, 2), "utf8");
}

async function readSupabase(): Promise<BidsFile> {
  try {
    const [bidRows, lockedRows] = await Promise.all([
      publicSelect<BidRow>("bids", "select=*&order=created_at.asc"),
      publicSelect<{ spot_id: number }>("locked_spots", "select=spot_id"),
    ]);
    return {
      bids: bidRows.map(rowToBid),
      lockedSpotIds: lockedRows.map((row) => row.spot_id),
    };
  } catch {
    throw new BoardLoadError();
  }
}

async function writeSupabase(data: BidsFile): Promise<void> {
  const normalized = normalizeFile(data);
  const rows = normalized.bids.map(bidToRow);
  const wantIds = new Set(rows.map((row) => row.id));

  const existingBids = await publicSelect<{ id: string }>("bids", "select=id");
  const bidsToRemove = existingBids
    .map((row) => row.id)
    .filter((id) => !wantIds.has(id));
  await adminDeleteIn("bids", "id", bidsToRemove);
  await adminUpsert("bids", rows, "id");

  const existingLocked = await publicSelect<{ spot_id: number }>(
    "locked_spots",
    "select=spot_id",
  );
  const want = new Set(normalized.lockedSpotIds ?? []);
  const have = new Set(existingLocked.map((row) => row.spot_id));
  const spotsToRemove = [...have].filter((id) => !want.has(id));
  const spotsToAdd = [...want].filter((id) => !have.has(id));

  await adminDeleteIn("locked_spots", "spot_id", spotsToRemove);
  await adminInsert(
    "locked_spots",
    spotsToAdd.map((spot_id) => ({ spot_id })),
  );
}

export async function readAuctionFile(): Promise<BidsFile> {
  if (shouldUseSupabase()) {
    return readSupabase();
  }
  if (isVercel()) {
    throw new BoardLoadError(
      "Bid storage is not configured. Set Supabase env vars on Vercel.",
    );
  }
  return readLocal();
}

export async function readBids(): Promise<Bid[]> {
  const file = await readAuctionFile();
  return file.bids;
}

export async function writeAuctionFile(data: BidsFile): Promise<void> {
  const normalized = normalizeFile(data);
  if (shouldUseSupabase()) {
    await writeSupabase(normalized);
    return;
  }
  if (isVercel()) {
    throw new BoardLoadError(
      "Bid storage is not configured. Set Supabase env vars on Vercel.",
    );
  }
  await writeLocal(normalized);
}

export async function writeBids(bids: Bid[]): Promise<void> {
  const file = await readAuctionFile();
  await writeAuctionFile({ ...file, bids });
}

export async function deleteBid(id: string): Promise<void> {
  if (shouldUseSupabase()) {
    await adminDeleteEq("bids", "id", id);
    return;
  }
  const file = await readAuctionFile();
  await writeAuctionFile({
    ...file,
    bids: file.bids.filter((b) => b.id !== id),
  });
}

export async function withAuctionLock<T>(
  fn: (
    file: BidsFile,
  ) => Promise<{ result: T; file: BidsFile } | { error: string }>,
): Promise<{ result: T } | { error: string }> {
  const file = await readAuctionFile();
  const outcome = await fn(file);
  if ("error" in outcome) return { error: outcome.error };
  await writeAuctionFile(outcome.file);
  return { result: outcome.result };
}

export function newBidId(): string {
  return `bid_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
