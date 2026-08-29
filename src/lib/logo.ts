/** Shared logo helpers for bids and mockups. */

export function normalizeLogoUrl(raw: string): string {
  return String(raw ?? "").trim();
}

export function isValidLogoUrl(url: string): boolean {
  if (!url) return true;
  if (url.startsWith("/logos/")) return true;
  if (url.startsWith("data:image/")) return true;
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/** Deterministic soft color from brand name for letter avatars. */
export function avatarColor(brandName: string): string {
  let hash = 0;
  for (let i = 0; i < brandName.length; i++) {
    hash = brandName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 42% 38%)`;
}

export function brandInitial(brandName: string): string {
  const trimmed = brandName.trim();
  if (!trimmed) return "?";
  const ch = trimmed[0];
  return /[a-z0-9]/i.test(ch) ? ch.toUpperCase() : trimmed.slice(0, 1);
}
