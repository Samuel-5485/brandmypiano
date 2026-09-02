import { promises as fs } from "fs";
import path from "path";
import { put, list, del } from "@vercel/blob";
import type { Bid, BidsFile } from "@/lib/types";

const LOCAL_PATH = path.join(process.cwd(), "data", "bids.json");
const BLOB_PATHNAME = "brandmypiano/bids.json";

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

function hasBlobToken(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}

function isVercel(): boolean {
  return Boolean(process.env.VERCEL);
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

async function readBlob(): Promise<BidsFile | null> {
  if (!hasBlobToken()) return null;
  try {
    const { blobs } = await list({ prefix: BLOB_PATHNAME, limit: 10 });
    const match =
      blobs.find((b) => b.pathname === BLOB_PATHNAME) ??
      blobs.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())[0];
    if (!match) return null;
    const res = await fetch(match.url, { cache: "no-store" });
    if (!res.ok) return null;
    return normalizeFile((await res.json()) as BidsFile);
  } catch {
    return null;
  }
}

async function writeBlob(data: BidsFile): Promise<void> {
  if (!hasBlobToken()) return;
  const body = JSON.stringify(data, null, 2);
  try {
    const { blobs } = await list({ prefix: "brandmypiano/", limit: 50 });
    const toDelete = blobs
      .filter((b) => b.pathname.startsWith("brandmypiano/bids"))
      .map((b) => b.url);
    if (toDelete.length) await del(toDelete);
  } catch {
    // ignore cleanup errors
  }
  await put(BLOB_PATHNAME, body, {
    access: "private",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

export async function readAuctionFile(): Promise<BidsFile> {
  if (hasBlobToken()) {
    const fromBlob = await readBlob();
    if (fromBlob) return fromBlob;
  }
  return readLocal();
}

export async function readBids(): Promise<Bid[]> {
  const file = await readAuctionFile();
  return file.bids;
}

export async function writeAuctionFile(data: BidsFile): Promise<void> {
  const normalized = normalizeFile(data);
  if (hasBlobToken()) {
    await writeBlob(normalized);
    return;
  }
  if (isVercel()) {
    throw new Error(
      "Bid storage is not configured. In Vercel, create a Blob store and connect it to this project (sets BLOB_READ_WRITE_TOKEN).",
    );
  }
  await writeLocal(normalized);
}

export async function writeBids(bids: Bid[]): Promise<void> {
  const file = await readAuctionFile();
  await writeAuctionFile({ ...file, bids });
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
