import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { uploadLogoBuffer, ADMIN_MAX_LOGO_BYTES } from "@/lib/logoStorage";
import { BoardLoadError, withAuctionLock } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ADMIN_ALLOWED = new Set([
  "image/png",
  "image/jpeg",
  "image/svg+xml",
]);

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data." }, { status: 400 });
  }

  const bidId = String(form.get("bidId") ?? "").trim();
  const file = form.get("file");
  if (!bidId) {
    return NextResponse.json({ error: "Missing bid id." }, { status: 400 });
  }
  if (!(file instanceof File) || file.size <= 0) {
    return NextResponse.json({ error: "Choose a logo file." }, { status: 400 });
  }

  const contentType = file.type || "image/png";
  if (!ADMIN_ALLOWED.has(contentType)) {
    return NextResponse.json(
      { error: "Use PNG, JPG, or SVG only." },
      { status: 400 },
    );
  }
  if (file.size > ADMIN_MAX_LOGO_BYTES) {
    return NextResponse.json({ error: "Logo must be under 1MB." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const uploaded = await uploadLogoBuffer(buffer, contentType, ADMIN_MAX_LOGO_BYTES);
  if (!uploaded.ok) {
    return NextResponse.json({ error: uploaded.error }, { status: 500 });
  }

  try {
    const outcome = await withAuctionLock(async (file) => {
      const idx = file.bids.findIndex((b) => b.id === bidId);
      if (idx < 0) return { error: "Bid not found." };
      const nextBids = [...file.bids];
      const now = new Date().toISOString();
      nextBids[idx] = {
        ...nextBids[idx]!,
        logoUrl: uploaded.url,
        updatedAt: now,
      };
      return {
        result: nextBids[idx]!,
        file: { ...file, bids: nextBids },
      };
    });

    if ("error" in outcome) {
      return NextResponse.json({ error: outcome.error }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      bid: outcome.result,
      logoUrl: uploaded.url,
    });
  } catch (err) {
    if (err instanceof BoardLoadError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    throw err;
  }
}
