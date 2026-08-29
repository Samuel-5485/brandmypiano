"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { CONFIG } from "@/config";
import { calcDeposit, money } from "@/lib/auction";
import type { SpotPublicState } from "@/lib/types";

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
    deposit: number;
    amount: number;
    spotId: number;
    brandName: string;
  } | null>(null);

  useEffect(() => {
    if (!open || !spot) return;
    setBrandName("");
    setHandle("");
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

  const parsedAmount = Number(amount);
  const depositPreview = Number.isFinite(parsedAmount)
    ? calcDeposit(parsedAmount)
    : 0;

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
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/bids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spotId: spot!.spotId,
          brandName,
          handle,
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
      setDone({
        deposit: data.bid.deposit,
        amount: data.bid.amount,
        spotId: data.bid.spotId,
        brandName: data.bid.brandName,
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

        {done ? (
          <div className="space-y-4 text-sm leading-relaxed text-dim">
            <p className="text-cream">
              Bid saved as <span className="text-gold">pending</span>. It will
              not show on the public board until I confirm your deposit.
            </p>
            <ol className="list-decimal space-y-2 pl-5">
              <li>
                Pay the {money(done.deposit)} deposit
                {paymentLink ? (
                  <>
                    {" "}
                    via{" "}
                    <a
                      href={paymentLink}
                      target="_blank"
                      rel="noreferrer"
                      className="text-gold underline underline-offset-2 hover:text-gold-hover"
                    >
                      this payment link
                    </a>
                  </>
                ) : (
                  <> (I will send or confirm a payment link when you DM me)</>
                )}
                .
              </li>
              <li>
                Post or DM{" "}
                <a
                  href={CONFIG.xProfile}
                  target="_blank"
                  rel="noreferrer"
                  className="text-gold underline underline-offset-2 hover:text-gold-hover"
                >
                  {CONFIG.handle}
                </a>{" "}
                with: spot {done.spotId}, {done.brandName}, {money(done.amount)}.
              </li>
            </ol>
            <p>
              If you are outbid later, I refund the deposit by hand in v1. I
              approve every logo by hand and can refuse one.
            </p>
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
            <label className="block text-sm">
              <span className="mb-1.5 block text-dim">Brand name</span>
              <input
                required
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                className="focus-ring w-full rounded-md border border-line bg-bg px-3 py-3 text-cream"
                placeholder="Acme Coffee"
                disabled={ended || busy}
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
                disabled={ended || busy}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block text-dim">Website (optional)</span>
              <input
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="focus-ring w-full rounded-md border border-line bg-bg px-3 py-3 text-cream"
                placeholder="https://"
                disabled={ended || busy}
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
                disabled={ended || busy}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block text-dim">Or upload a logo (optional)</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                className="focus-ring block w-full text-sm text-dim file:mr-3 file:rounded-md file:border-0 file:bg-gold file:px-3 file:py-2 file:text-sm file:font-medium file:text-[var(--button-text)]"
                disabled={ended || busy}
                onChange={(e) => onLogoFile(e.target.files?.[0] ?? null)}
              />
              {logoFileName && (
                <span className="mt-1.5 block text-xs text-dim">
                  Uploaded: {logoFileName}
                </span>
              )}
              <span className="mt-1.5 block text-xs text-dim">
                No logo yet? A letter avatar shows until I paste your logo in
                admin.
              </span>
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
                disabled={ended || busy}
              />
            </label>
            <p className="text-sm text-dim">
              Deposit to hold this bid:{" "}
              <span className="text-cream">{money(depositPreview)}</span>{" "}
              (20%, minimum $5). New bids must beat the current by at least $
              {CONFIG.minRaise}.
            </p>
            {error && (
              <p className="rounded-md border border-red-900/50 bg-red-950/30 px-3 py-2 text-sm text-red-200">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={ended || busy}
              className="focus-ring w-full rounded-md px-4 py-3.5 font-medium transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              style={{ background: "var(--button-bg)", color: "var(--button-text)" }}
            >
              {busy ? "Saving…" : "Place pending bid"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
