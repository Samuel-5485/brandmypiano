"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { CONFIG } from "@/config";
import { lockPaymentUrl, money, normalizeHandle } from "@/lib/auction";
import type { SpotPublicState } from "@/lib/types";
import { PayToLockButton } from "@/components/PayToLockButton";

const HANDLE_KEY = "brandmypiano-handle";

type Props = {
  spot: SpotPublicState | null;
  open: boolean;
  ended: boolean;
  paymentLink: string;
  prefillAmount?: number | null;
  onClose: () => void;
  onSubmitted: () => void | Promise<void>;
};

function logoUrlHint(logoUrl: string, logoFile: File | null) {
  if (logoFile) {
    return { text: "Using the uploaded file.", tone: "dim" as const, preview: null };
  }
  const value = logoUrl.trim();
  if (!value) {
    return {
      text: "Optional. Upload a file or paste an https:// image.",
      tone: "dim" as const,
      preview: null,
    };
  }
  if (value.startsWith("data:")) {
    return {
      text: "Use Choose file or an https:// link, not pasted image code.",
      tone: "error" as const,
      preview: null,
    };
  }
  if (value.startsWith("https://")) {
    return {
      text: "We'll use this logo.",
      tone: "ok" as const,
      preview: value,
    };
  }
  return {
    text: "Logo URL must start with https://",
    tone: "error" as const,
    preview: null,
  };
}

export function BidModal({
  spot,
  open,
  ended,
  paymentLink,
  prefillAmount,
  onClose,
  onSubmitted,
}: Props) {
  const titleId = useId();
  const resetKeyRef = useRef<string | null>(null);
  const [brandName, setBrandName] = useState("");
  const [handle, setHandle] = useState("");
  const [website, setWebsite] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoFileName, setLogoFileName] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{
    amount: number;
    spotId: number;
    brandName: string;
    isLeader: boolean;
  } | null>(null);

  const spotId = spot?.spotId ?? null;
  const spotRef = useRef(spot);
  spotRef.current = spot;

  useEffect(() => {
    if (!open || spotId == null) {
      if (!open) resetKeyRef.current = null;
      return;
    }

    const resetKey = `${spotId}:${prefillAmount ?? ""}`;
    if (resetKeyRef.current === resetKey) return;

    resetKeyRef.current = resetKey;
    const saved =
      typeof window !== "undefined"
        ? localStorage.getItem(HANDLE_KEY) ?? ""
        : "";
    const currentSpot = spotRef.current;
    setBrandName("");
    setHandle(saved);
    setWebsite("");
    setLogoUrl("");
    setLogoFile(null);
    setLogoFileName("");
    setAmount(String(prefillAmount ?? currentSpot?.minNextBid ?? ""));
    setError("");
    setDone(null);
    setBusy(false);
  }, [open, spotId, prefillAmount]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !spot) return null;

  const normalizedHandle = normalizeHandle(handle);
  const isCurrentLeader =
    Boolean(spot.holderHandle) &&
    normalizedHandle.length > 1 &&
    spot.holderHandle === normalizedHandle &&
    !spot.locked;
  const leaderBid = spot.currentBid ?? 0;
  const payUrl =
    isCurrentLeader && leaderBid > 0
      ? lockPaymentUrl(paymentLink, leaderBid)
      : "";
  const donePayUrl =
    done?.isLeader && paymentLink && done.amount > 0
      ? lockPaymentUrl(paymentLink, done.amount)
      : "";
  const logoHint = logoUrlHint(logoUrl, logoFile);

  function onLogoFile(file: File | null) {
    if (!file) {
      setLogoFile(null);
      setLogoFileName("");
      return;
    }
    setLogoFile(file);
    setLogoFileName(file.name);
    setLogoUrl("");
    setError("");
  }

  async function bidVisibleOnBoard(
    targetSpotId: number,
    targetHandle: string,
    targetAmount: number,
  ): Promise<boolean> {
    try {
      const boardRes = await fetch("/api/bids", { cache: "no-store" });
      const boardText = await boardRes.text();
      if (!boardText.trim()) return false;
      const boardData = JSON.parse(boardText) as {
        ok?: boolean;
        spots?: SpotPublicState[];
      };
      const spots = boardData.spots;
      if (!spots) return false;
      const targetSpot = spots.find((s) => s.spotId === targetSpotId);
      if (!targetSpot) return false;
      return targetSpot.offers.some(
        (o) =>
          normalizeHandle(o.handle) === targetHandle && o.amount === targetAmount,
      );
    } catch {
      return false;
    }
  }

  async function checkIsLeader(
    targetSpotId: number,
    targetHandle: string,
  ): Promise<{ isLeader: boolean; leaderAmount: number }> {
    try {
      const boardRes = await fetch("/api/bids", { cache: "no-store" });
      const boardText = await boardRes.text();
      if (!boardText.trim()) return { isLeader: false, leaderAmount: 0 };
      const boardData = JSON.parse(boardText) as {
        ok?: boolean;
        spots?: SpotPublicState[];
      };
      const spots = boardData.spots;
      if (!spots) return { isLeader: false, leaderAmount: 0 };
      const targetSpot = spots.find((s) => s.spotId === targetSpotId);
      const leader = targetSpot?.offers[0];
      if (!leader) return { isLeader: false, leaderAmount: 0 };
      return {
        isLeader: normalizeHandle(leader.handle) === targetHandle,
        leaderAmount: leader.amount,
      };
    } catch {
      return { isLeader: false, leaderAmount: 0 };
    }
  }

  async function finishSuccess(asLeader?: {
    amount: number;
    spotId: number;
    brandName: string;
  }) {
    if (typeof window !== "undefined") {
      localStorage.setItem(HANDLE_KEY, normalizedHandle);
    }
    setError("");
    await onSubmitted();
    if (asLeader) {
      setDone({ ...asLeader, isLeader: true });
      return;
    }
    onClose();
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (ended) {
      setError("The auction has ended.");
      return;
    }
    if (spot!.locked) {
      setError("This spot is locked.");
      return;
    }
    const trimmedLogoUrl = logoUrl.trim();
    if (trimmedLogoUrl.startsWith("data:")) {
      setError("Use Choose file or an https:// URL — not a pasted base64 image.");
      return;
    }
    if (trimmedLogoUrl && !trimmedLogoUrl.startsWith("https://")) {
      setError("Logo URL must start with https://");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("spotId", String(spot!.spotId));
      formData.append("brandName", brandName);
      formData.append("handle", normalizedHandle);
      formData.append("website", website);
      formData.append("amount", String(amount));
      if (trimmedLogoUrl) formData.append("logoUrl", trimmedLogoUrl);
      if (logoFile) formData.append("file", logoFile);

      const res = await fetch("/api/bids", { method: "POST", body: formData });
      const text = await res.text();
      const bidAmount = Number(amount);

      if (!text.trim()) {
        if (res.ok) {
          const { isLeader } = await checkIsLeader(spot!.spotId, normalizedHandle);
          if (isLeader) {
            await finishSuccess({
              amount: bidAmount,
              spotId: spot!.spotId,
              brandName: brandName.trim(),
            });
          } else {
            await finishSuccess();
          }
          return;
        }
        setError(`Could not save bid (HTTP ${res.status}).`);
        return;
      }

      let data: { ok?: boolean; error?: string; bid?: unknown };
      try {
        data = JSON.parse(text) as typeof data;
      } catch {
        await onSubmitted();
        const visible = await bidVisibleOnBoard(
          spot!.spotId,
          normalizedHandle,
          bidAmount,
        );
        if (visible) {
          await finishSuccess();
          return;
        }
        setError("Unexpected server response.");
        return;
      }

      if (data.ok === false || !res.ok) {
        const visible = await bidVisibleOnBoard(
          spot!.spotId,
          normalizedHandle,
          bidAmount,
        );
        if (visible) {
          const { isLeader } = await checkIsLeader(spot!.spotId, normalizedHandle);
          if (isLeader) {
            await finishSuccess({
              amount: bidAmount,
              spotId: spot!.spotId,
              brandName: brandName.trim(),
            });
          } else {
            await finishSuccess();
          }
          return;
        }
        setError(data.error || "Could not save bid.");
        return;
      }

      const { isLeader, leaderAmount } = await checkIsLeader(
        spot!.spotId,
        normalizedHandle,
      );
      if (isLeader) {
        await finishSuccess({
          amount: leaderAmount || bidAmount,
          spotId: spot!.spotId,
          brandName: brandName.trim(),
        });
      } else {
        await finishSuccess();
      }
    } catch {
      const visible = await bidVisibleOnBoard(
        spot!.spotId,
        normalizedHandle,
        Number(amount),
      );
      if (visible) {
        const { isLeader, leaderAmount } = await checkIsLeader(
          spot!.spotId,
          normalizedHandle,
        );
        if (isLeader) {
          await finishSuccess({
            amount: leaderAmount || Number(amount),
            spotId: spot!.spotId,
            brandName: brandName.trim(),
          });
        } else {
          await finishSuccess();
        }
        return;
      }
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="card-surface max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl p-5 sm:rounded-2xl sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-gold">
              Spot {spot.spotId}
            </p>
            <h2 id={titleId} className="font-display text-2xl text-cream">
              {spot.name}
            </h2>
            <p className="mt-1 text-sm text-dim">
              {spot.size} · min bid {money(spot.minNextBid)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="focus-ring rounded-md px-3 py-2 text-sm text-dim hover:text-cream"
            aria-label="Close"
          >
            Close
          </button>
        </div>

        {spot.locked && (
          <p className="mb-4 rounded-md border border-line bg-bg/40 px-3 py-2 text-sm text-dim">
            This spot is locked. The winner is set.
          </p>
        )}

        {isCurrentLeader && !done && payUrl && (
          <div className="mb-4 rounded-md border border-gold/40 bg-gold/5 px-3 py-3 text-sm">
            <p className="text-cream">You are the highest bid on this spot.</p>
            <div className="mt-2">
              <PayToLockButton
                paymentLink={paymentLink}
                bidAmount={leaderBid}
              />
            </div>
            <p className="mt-2 text-xs leading-relaxed text-dim">
              Bids are free. Pay only when you are ready to lock. If someone
              outbids you before lock, you owe $0. After I confirm payment and
              lock this spot, no refund. {CONFIG.refundPublicCopy}
            </p>
          </div>
        )}

        {done ? (
          <div className="space-y-4 text-sm leading-relaxed text-dim">
            <p className="text-cream">
              Your bid is live on spot {done.spotId} — {money(done.amount)} for{" "}
              {done.brandName}.
            </p>
            {done.isLeader ? (
              <>
                <p>
                  You are the current leader on this spot only. If someone outbids
                  you here, they take the logo on this part — other spots are
                  separate races.
                </p>
                {donePayUrl ? (
                  <>
                    <PayToLockButton
                      paymentLink={paymentLink}
                      bidAmount={done.amount}
                      fullWidth
                      className="py-3"
                    />
                    <p className="text-xs">
                      Opens Polar checkout. I confirm payment in admin, then lock
                      the spot. Beaten payers are refunded. If you never paid,
                      you owe $0. Logo stays {CONFIG.stickerDuration}
                    </p>
                  </>
                ) : (
                  <p>
                    DM{" "}
                    <a
                      href={CONFIG.xProfile}
                      target="_blank"
                      rel="noreferrer"
                      className="text-gold underline underline-offset-2"
                    >
                      {CONFIG.handle}
                    </a>{" "}
                    for payment details, then I confirm in admin to lock the spot.
                  </p>
                )}
              </>
            ) : (
              <p>
                You were outbid on submit — check the live board. Raise your bid on
                this spot only.
              </p>
            )}
            <button
              type="button"
              onClick={onClose}
              className="focus-ring mt-2 w-full rounded-md px-4 py-3 font-medium transition hover:opacity-90"
              style={{ background: "var(--button-bg)", color: "var(--button-text)" }}
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            {ended && (
              <p className="rounded-md border border-line bg-bg/40 px-3 py-2 text-sm text-dim">
                Bidding is closed.
              </p>
            )}
            <p className="rounded-md border border-line bg-bg/40 px-3 py-2.5 text-sm leading-relaxed text-dim">
              This bid is public and not a charge. You pay only if you are the
              leader and you click Pay to lock.
            </p>
            <label className="block text-sm">
              <span className="mb-1.5 block text-dim">Brand name</span>
              <input
                required
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                className="focus-ring w-full rounded-md border border-line bg-bg px-3 py-3 text-cream"
                placeholder="Acme Coffee"
                disabled={ended || busy || spot.locked}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block text-dim">X handle</span>
              <input
                required
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                className="focus-ring w-full rounded-md border border-line bg-bg px-3 py-3 text-cream"
                placeholder="@yourbrand"
                disabled={ended || busy || spot.locked}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block text-dim">Website (optional)</span>
              <input
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="focus-ring w-full rounded-md border border-line bg-bg px-3 py-3 text-cream"
                placeholder="https://"
                disabled={ended || busy || spot.locked}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block text-dim">Logo URL (optional)</span>
              <input
                value={logoUrl}
                onChange={(e) => {
                  setLogoUrl(e.target.value);
                  setLogoFile(null);
                  setLogoFileName("");
                  setError("");
                }}
                className="focus-ring w-full rounded-md border border-line bg-bg px-3 py-3 text-cream"
                placeholder="https://…/logo.png"
                disabled={ended || busy || spot.locked || Boolean(logoFile)}
              />
              <p
                className={
                  logoHint.tone === "error"
                    ? "mt-1.5 text-xs text-red-200"
                    : logoHint.tone === "ok"
                      ? "mt-1.5 text-xs text-gold/90"
                      : "mt-1.5 text-xs text-dim"
                }
              >
                {logoHint.text}
              </p>
              {logoHint.preview && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={logoHint.preview}
                  alt=""
                  className="mt-2 h-10 w-10 rounded border border-line object-contain bg-bg"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              )}
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block text-dim">Or upload a logo (optional)</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                className="focus-ring block w-full text-sm text-dim file:mr-3 file:rounded-md file:border-0 file:bg-gold file:px-3 file:py-2 file:text-sm file:font-medium file:text-[var(--button-text)]"
                disabled={ended || busy || spot.locked}
                onChange={(e) => onLogoFile(e.target.files?.[0] ?? null)}
              />
              {logoFileName && (
                <span className="mt-1.5 block text-xs text-dim">{logoFileName}</span>
              )}
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block text-dim">Bid amount (USD)</span>
              <input
                required
                type="number"
                min={spot.minNextBid}
                step="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="focus-ring w-full rounded-md border border-line bg-bg px-3 py-3 text-cream"
                disabled={ended || busy || spot.locked}
              />
            </label>
            <p className="text-sm text-dim">
              Bids show on the live board immediately for this spot only. Minimum
              raise ${CONFIG.minRaise}.
            </p>
            {error && (
              <p className="rounded-md border border-red-900/50 bg-red-950/30 px-3 py-2 text-sm text-red-200">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={ended || busy || spot.locked}
              className="focus-ring w-full rounded-md px-4 py-3.5 font-medium transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              style={{ background: "var(--button-bg)", color: "var(--button-text)" }}
            >
              {busy ? "Saving…" : spot.hasBid ? "Outbid" : "Bid"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
