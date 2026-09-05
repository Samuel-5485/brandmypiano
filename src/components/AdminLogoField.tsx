"use client";

import { useEffect, useRef, useState } from "react";
import { BrandLogo, STICKER_LOGO_SLOT } from "@/components/BrandLogo";
import { STICKER_PLATE_ASPECT } from "@/lib/stickerPlate";

type Props = {
  bidId: string;
  spotId: number;
  brandName: string;
  logoUrl: string | null;
  keepBackground?: boolean;
  disabled?: boolean;
  onKeepBackgroundChange: (keep: boolean) => void;
  onSaved: () => void;
  onRemoved: () => void;
};

export function AdminLogoField({
  bidId,
  spotId,
  brandName,
  logoUrl,
  keepBackground = false,
  disabled = false,
  onKeepBackgroundChange,
  onSaved,
  onRemoved,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const plate =
    spotId === 1
      ? STICKER_PLATE_ASPECT[1]
      : spotId === 2
        ? STICKER_PLATE_ASPECT[2]
        : { width: 120, height: 72 };

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const displayUrl = previewUrl ?? logoUrl;

  async function saveLogo() {
    if (!file) {
      setError("Choose a file first.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.append("bidId", bidId);
      form.append("file", file);
      const res = await fetch("/api/admin/logos", { method: "POST", body: form });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error || "Upload failed.");
        return;
      }
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      onSaved();
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  async function removeLogo() {
    if (!logoUrl && !file) return;
    if (logoUrl && !window.confirm("Remove logo from this bid?")) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/bids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove_logo", id: bidId }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error || "Could not remove logo.");
        return;
      }
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      onRemoved();
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <div
        className="flex items-center justify-center rounded-sm bg-[#f3ece1]"
        style={{ width: plate.width, height: plate.height }}
        title={
          spotId === 1 || spotId === 2
            ? `Plate preview for spot ${spotId}`
            : "Logo preview"
        }
      >
        <BrandLogo
          brandName={brandName || "Brand"}
          logoUrl={displayUrl}
          knockoutWhite={!keepBackground}
          slotSize={spotId === 1 || spotId === 2 ? STICKER_LOGO_SLOT : undefined}
          className="h-full w-full pointer-events-none"
          mediaClassName="text-xs pointer-events-none"
        />
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/svg+xml,.png,.jpg,.jpeg,.svg"
        disabled={disabled || busy}
        className="focus-ring block w-full max-w-[11rem] text-[11px] text-dim file:mr-2 file:rounded file:border-0 file:bg-gold file:px-2 file:py-1 file:text-[10px] file:font-medium file:text-[var(--button-text)]"
        onChange={(e) => {
          setError("");
          setFile(e.target.files?.[0] ?? null);
        }}
      />

      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          disabled={disabled || busy || !file}
          onClick={() => void saveLogo()}
          className="focus-ring rounded border border-gold/50 px-2 py-1 text-[11px] text-gold hover:bg-gold/10 disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save logo"}
        </button>
        {(logoUrl || file) && (
          <button
            type="button"
            disabled={disabled || busy}
            onClick={() => void removeLogo()}
            className="focus-ring rounded border border-line px-2 py-1 text-[11px] text-dim hover:text-cream disabled:opacity-50"
          >
            Remove logo
          </button>
        )}
      </div>

      <label className="flex items-center gap-2 text-[11px] text-dim">
        <input
          type="checkbox"
          checked={keepBackground}
          disabled={disabled || busy}
          onChange={(e) => onKeepBackgroundChange(e.target.checked)}
        />
        Keep background
      </label>

      {error && <p className="text-[11px] text-red-300">{error}</p>}
      <p className="text-[10px] text-dim">PNG, JPG, or SVG · max 1MB</p>
    </div>
  );
}
