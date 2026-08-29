export const THEME_STORAGE_KEY = "brandmypiano-theme";

export type ThemePreference = "default" | "dark" | "system";
export type ResolvedTheme = "default" | "dark" | "light";

export function isThemePreference(value: string | null): value is ThemePreference {
  return value === "default" || value === "dark" || value === "system";
}

export function resolveTheme(
  preference: ThemePreference,
  prefersDark?: boolean,
): ResolvedTheme {
  if (preference === "default") return "default";
  if (preference === "dark") return "dark";
  const dark =
    prefersDark ??
    (typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  return dark ? "dark" : "light";
}

export function applyTheme(preference: ThemePreference) {
  const resolved = resolveTheme(preference);
  const root = document.documentElement;
  root.setAttribute("data-theme", resolved);
  root.setAttribute("data-theme-preference", preference);
}
