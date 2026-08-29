import { promises as fs } from "fs";
import path from "path";
import { put, list, del } from "@vercel/blob";
import type { Bid, BidsFile } from "@/lib/types";

const LOCAL_PATH = path.join(process.cwd(), "data", "bids.json");
const BLOB_PATHNAME = "brandmypiano/bids.json";

function emptyFile(): BidsFile {
  return { bids: [] };
}

function hasBlobToken(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}

async function readLocal(): Promise<BidsFile> {
  try {
    const raw = await fs.readFile(LOCAL_PATH, "utf8");
    const parsed = JSON.parse(raw) as BidsFile;
    if (!parsed || !Array.isArray(parsed.bids)) return emptyFile();
    return parsed;
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
    const parsed = (await res.json()) as BidsFile;
    if (!parsed || !Array.isArray(parsed.bids)) return emptyFile();
    return parsed;
  } catch {
    return null;
  }
}

async function writeBlob(data: BidsFile): Promise<void> {
  if (!hasBlobToken()) return;
  const body = JSON.stringify(data, null, 2);
  // Replace prior versions so we don't accumulate blobs
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
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

export async function readBids(): Promise<Bid[]> {
  if (hasBlobToken()) {
    const fromBlob = await readBlob();
    if (fromBlob) return fromBlob.bids;
  }
  const local = await readLocal();
  return local.bids;
}

export async function writeBids(bids: Bid[]): Promise<void> {
  const data: BidsFile = { bids };
  await writeLocal(data);
  if (hasBlobToken()) {
    await writeBlob(data);
  }
}

export async function withBidsLock<T>(
  fn: (bids: Bid[]) => Promise<{ result: T; bids: Bid[] } | { error: string }>,
): Promise<{ result: T } | { error: string }> {
  // Simple read-modify-write. Fine for low traffic auction.
  const bids = await readBids();
  const outcome = await fn(bids);
  if ("error" in outcome) return { error: outcome.error };
  await writeBids(outcome.bids);
  return { result: outcome.result };
}

export function newBidId(): string {
  return `bid_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
