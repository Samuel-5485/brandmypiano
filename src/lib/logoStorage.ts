import { hasSupabaseAdmin, uploadLogo } from "@/lib/supabase/rest";

export const MAX_LOGO_BYTES = 400_000;

const ALLOWED = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);

function extFor(type: string): string {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  if (type === "image/gif") return "gif";
  if (type === "image/svg+xml") return "svg";
  return "jpg";
}

function logoObjectName(contentType: string): string {
  return `logo_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}.${extFor(contentType)}`;
}

export function parseSupabaseError(raw: string, fallback: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return fallback;
  try {
    const parsed = JSON.parse(trimmed) as {
      message?: string;
      error?: string;
      statusCode?: string | number;
    };
    const parts = [parsed.message, parsed.error, parsed.statusCode]
      .filter(Boolean)
      .map(String);
    if (parts.length) return parts.join(" — ");
  } catch {
    // plain text from Supabase
  }
  return trimmed.slice(0, 500);
}

export async function uploadLogoBuffer(
  buffer: Buffer,
  contentType: string,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  if (!hasSupabaseAdmin()) {
    return { ok: false, error: "Logo storage is not configured (Supabase env missing)." };
  }
  if (!ALLOWED.has(contentType)) {
    return { ok: false, error: "Use PNG, JPG, WebP, GIF, or SVG." };
  }
  if (buffer.length <= 0 || buffer.length > MAX_LOGO_BYTES) {
    return { ok: false, error: "Logo must be under 400KB." };
  }

  try {
    const url = await uploadLogo(logoObjectName(contentType), buffer, contentType);
    return { ok: true, url };
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    const error = parseSupabaseError(raw, "Logo upload failed.");
    return { ok: false, error };
  }
}


export async function resolveLogoForBid(input: {
  logoUrl?: string;
  file?: File | null;
}): Promise<{ url: string | null; warning?: string }> {
  if (input.file && input.file.size > 0) {
    const buffer = Buffer.from(await input.file.arrayBuffer());
    const uploaded = await uploadLogoBuffer(buffer, input.file.type || "image/png");
    if (uploaded.ok) return { url: uploaded.url };
    return { url: null, warning: `Bid saved, logo failed: ${uploaded.error}` };
  }

  const logoUrl = String(input.logoUrl ?? "").trim();
  if (!logoUrl) return { url: null };

  if (/^https:\/\//i.test(logoUrl)) {
    return { url: logoUrl };
  }

  if (logoUrl.startsWith("/logos/")) {
    return { url: logoUrl };
  }

  return {
    url: null,
    warning: "Bid saved, logo failed: logo must be an https URL or Choose file upload.",
  };
}
