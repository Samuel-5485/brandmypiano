"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  THEME_STORAGE_KEY,
  applyTheme,
  isThemePreference,
  type ThemePreference,
} from "@/lib/theme";

const OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "default", label: "Default" },
  { value: "dark", label: "Dark" },
  { value: "light", label: "Light" },
  { value: "system", label: "System" },
];

export function ThemeSwitcher() {
  const [preference, setPreference] = useState<ThemePreference>("default");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    const next = isThemePreference(stored) ? stored : "default";
    setPreference(next);
    applyTheme(next);
  }, []);

  useEffect(() => {
    if (preference !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [preference]);

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  function choose(next: ThemePreference) {
    setPreference(next);
    window.localStorage.setItem(THEME_STORAGE_KEY, next);
    applyTheme(next);
    setMenuOpen(false);
  }

  return (
    <div ref={rootRef} className="relative shrink-0">
      <div
        className="hidden overflow-hidden rounded-md border border-line sm:inline-flex"
        role="group"
        aria-label="Theme"
      >
        {OPTIONS.map((opt) => {
          const active = preference === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => choose(opt.value)}
              aria-pressed={active}
              className={`focus-ring px-2.5 py-2 text-xs font-medium transition ${
                active
                  ? "bg-gold text-[var(--button-text)]"
                  : "bg-transparent text-dim hover:text-cream"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        className="focus-ring inline-flex items-center gap-1.5 rounded-md border border-line px-2.5 py-2 text-xs font-medium text-dim hover:text-cream sm:hidden"
        aria-expanded={menuOpen}
        aria-controls={menuId}
        onClick={() => setMenuOpen((open) => !open)}
      >
        Theme
        <span aria-hidden className="text-gold">
          ▾
        </span>
      </button>

      {menuOpen && (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 min-w-[9.5rem] overflow-hidden rounded-md border border-line bg-[var(--bg-card)] p-1 shadow-lg sm:hidden"
        >
          {OPTIONS.map((opt) => {
            const active = preference === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => choose(opt.value)}
                className="focus-ring flex w-full items-center justify-between gap-3 rounded px-3 py-2 text-left text-sm text-cream hover:bg-[var(--bg)]"
              >
                <span>{opt.label}</span>
                {active && (
                  <span className="text-gold" aria-hidden>
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
