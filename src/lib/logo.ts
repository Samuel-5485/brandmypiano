const COLORS = [
  "#6b4f2a",
  "#8b5a2b",
  "#a67c52",
  "#7c5c3e",
  "#5c4033",
  "#9a7438",
  "#4a3728",
  "#b8860b",
];

export function brandInitial(brandName: string): string {
  const trimmed = brandName.trim();
  if (!trimmed) return "?";
  return trimmed.charAt(0).toUpperCase();
}

export function avatarColor(brandName: string): string {
  let hash = 0;
  for (let i = 0; i < brandName.length; i++) {
    hash = (hash * 31 + brandName.charCodeAt(i)) >>> 0;
  }
  return COLORS[hash % COLORS.length];
}
