"use client";

import { useState } from "react";
import { BrandLogo, STICKER_LOGO_SLOT } from "@/components/BrandLogo";
import { STICKER_PLATE_ASPECT } from "@/lib/stickerPlate";

type Props = {
  spotId: number;
  brandName: string;
  initialUrl: string;
  initialKeepBackground?: boolean;
  onCommit: (patch: { logoUrl?: string; keepBackground?: boolean }) => void;
};

export function AdminLogoField({
  spotId,
  brandName,
  initialUrl,
  initialKeepBackground = false,
  onCommit,
}: Props) {
  const [draft, setDraft] = useState(initialUrl);
  const [keepBackground, setKeepBackground] = useState(initialKeepBackground);
  const plate =
    spotId === 1
      ? STICKER_PLATE_ASPECT[1]
      : spotId === 2
        ? STICKER_PLATE_ASPECT[2]
        : { width: 120, height: 72 };

  return (
    <div className="space-y-2">
      <input
        value={draft}
        placeholder="https://…/logo.png (prefer transparent PNG)"
        className="focus-ring w-44 rounded border border-line bg-bg px-2 py-1 text-xs text-cream"
        title="Paste logo URL — preview updates live; blur to save"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          const logoUrl = draft.trim();
          if (logoUrl !== initialUrl.trim()) onCommit({ logoUrl });
        }}
      />
      <label className="flex items-center gap-2 text-[11px] text-dim">
        <input
          type="checkbox"
          checked={keepBackground}
          onChange={(e) => {
            const next = e.target.checked;
            setKeepBackground(next);
            onCommit({ keepBackground: next });
          }}
        />
        Keep background
      </label>
      <div
        className="flex items-center justify-center rounded-sm bg-[#f3ece1]"
        style={{ width: plate.width, height: plate.height }}
        title={
          spotId === 1 || spotId === 2
            ? `Plate preview for spot ${spotId}`
            : "Logo preview"
        }
      >
        {draft.trim() || brandName ? (
          <BrandLogo
            brandName={brandName || "Brand"}
            logoUrl={draft.trim() || null}
            knockoutWhite={!keepBackground}
            slotSize={spotId === 1 || spotId === 2 ? STICKER_LOGO_SLOT : undefined}
            className="h-full w-full"
            mediaClassName="text-xs"
          />
        ) : (
          <span className="text-[10px] text-[#6f675d]">Empty plate</span>
        )}
      </div>
      <p className="text-[10px] text-dim">Prefer transparent PNG</p>
    </div>
  );
}
