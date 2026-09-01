"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { CONFIG } from "@/config";
import { lockPaymentUrl, money, normalizeHandle } from "@/lib/auction";
import type { SpotPublicState } from "@/lib/types";

const HANDLE_KEY = "brandmypiano-handle";

type Props = {
  spot: SpotPublicState | null;
  open: boolean;
  ended: boolean;
  paymentLink: string;
  onClose: () => void;
  onSubmitted: () => void;
};

export function BidModal({
  spot,
  open,
  ended,
  paymentLink,
  onClose,
  onSubmitted,
}: Props) {
  const titleId = useId();
  const [brandName, setBrandName] = useState("");
  const [handle, setHandle] = useState("");
  const [website, setWebsite] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
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

  useEffect(() => {
    if (!open || !spot) return;
    const saved =
      typeof window !== "undefined"
        ? localStorage.getItem(HANDLE_KEY) ?? ""
        : "";
    setBrandName("");
    setHandle(saved);
    setWebsite("");
    setLogoUrl("");
    setLogoFileName("");
    setAmount(String(spot.minNextBid));
    setError("");
    setDone(null);
    setBusy(false);
  }, [open, spot]);

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

  async function uploadLogo(file: File): Promise<string> {
    const body = new FormData();
    body.append("file", file);
    const res = await fetch("/api/logos", { method: "POST", body });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Logo upload failed.");
    return String(data.url);
  }

  async function onLogoFile(file: File | null) {
    if (!file) {
      setLogoFileName("");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const url = await uploadLogo(file);
      setLogoUrl(url);
      setLogoFileName(file.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Logo upload failed.");
      setLogoFileName("");
    } finally {
      setBusy(false);
    }
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
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/bids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spotId: spot!.spotId,
          brandName,
          handle: normalizedHandle,
          website,
          logoUrl: logoUrl.trim(),
          amount: Number(amount),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not save bid.");
        setBusy(false);
        return;
      }
      if (typeof window !== "undefined") {
        localStorage.setItem(HANDLE_KEY, normalizedHandle);
      }
      const leader =
        data.bid &&
        data.board?.spots?.find(
          (s: SpotPublicState) => s.spotId === data.bid.spotId,
        );
      setDone({
        amount: data.bid.amount,
        spotId: data.bid.spotId,
        brandName: data.bid.brandName,
        isLeader: leader?.holderHandle === normalizedHandle,
      });
      onSubmitted();
    } catch {
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
            <a
              href={payUrl}
              target="_blank"
              rel="noreferrer"
              className="focus-ring mt-2 inline-block rounded-md px-4 py-2 font-medium transition hover:opacity-90"
              style={{ background: "var(--button-bg)", color: "var(--button-text)" }}
            >
              Pay to lock this spot
            </a>
            <p className="mt-2 text-xs leading-relaxed text-dim">
              You are the highest bid on this spot. Paying through Polar locks it
              for 12 months. No refund after a confirmed payment.
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
                    <a
                      href={donePayUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="focus-ring inline-block w-full rounded-md px-4 py-3 text-center font-medium transition hover:opacity-90"
                      style={{
                        background: "var(--button-bg)",
                        color: "var(--button-text)",
                      }}
                    >
                      Pay to lock this spot
                    </a>
                    <p className="text-xs">
                      You are the highest bid on this spot. Paying through Polar
                      locks it for 12 months. No refund after a confirmed payment.
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
                  setLogoFileName("");
                }}
                className="focus-ring w-full rounded-md border border-line bg-bg px-3 py-3 text-cream"
                placeholder="https://…/logo.png"
                disabled={ended || busy || spot.locked}
              />
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
                <span className="mt-1.5 block text-xs text-dim">
                  Uploaded: {logoFileName}
                </span>
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
