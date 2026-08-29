"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CONFIG } from "@/config";
import { money } from "@/lib/auction";
import type { PublicBoard, SpotPublicState } from "@/lib/types";
import { BidModal } from "@/components/BidModal";
import { Countdown } from "@/components/Countdown";
import { PianoGraphic } from "@/components/PianoGraphic";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";

type Props = {
  initialBoard: PublicBoard;
};

export function AuctionApp({ initialBoard }: Props) {
  const [board, setBoard] = useState(initialBoard);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/bids", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as PublicBoard;
      setBoard(data);
    } catch {
      // keep last good board
    }
  }, []);

  useEffect(() => {
    const id = setInterval(refresh, 20000);
    return () => clearInterval(id);
  }, [refresh]);

  const activeSpot: SpotPublicState | null = useMemo(() => {
    if (activeId == null) return null;
    return board.spots.find((s) => s.spotId === activeId) ?? null;
  }, [activeId, board.spots]);

  function openSpot(id: number) {
    setActiveId(id);
    setModalOpen(true);
  }

  const progressWidth = `${Math.min(100, board.percent)}%`;

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line backdrop-blur-md" style={{ background: "var(--header-bg)" }}>
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <a href="#top" className="font-display text-lg tracking-wide text-cream">
            brand my piano
          </a>
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeSwitcher />
            <a
              href="#spots"
              className="focus-ring rounded-md px-4 py-2.5 text-sm font-medium transition hover:opacity-90"
              style={{ background: "var(--button-bg)", color: "var(--button-text)" }}
            >
              Get a spot
            </a>
          </div>
        </div>
      </header>

      <main id="top">
        <section className="mx-auto max-w-5xl px-4 pb-10 pt-10 sm:px-6 sm:pt-14">
          <p className="mb-3 text-xs uppercase tracking-[0.22em] text-gold">
            {CONFIG.domainText}
          </p>
          <h1 className="font-display max-w-3xl text-4xl leading-[1.08] text-cream sm:text-5xl md:text-6xl">
            {CONFIG.headline}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-dim sm:text-lg">
            {CONFIG.heroLede}
          </p>

          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Raised", value: money(board.raised) },
              { label: "Goal", value: money(board.goal) },
              { label: "Spots with a bid", value: `${board.spotsWithBid}/10` },
              { label: "Funded", value: `${board.percent}%` },
            ].map((stat) => (
              <div key={stat.label} className="card-surface rounded-xl p-4">
                <p className="text-[11px] uppercase tracking-[0.16em] text-dim">
                  {stat.label}
                </p>
                <p className="mt-2 font-display text-2xl text-cream sm:text-3xl">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 card-surface rounded-xl p-4 sm:p-5">
            <div className="mb-2 flex items-center justify-between text-sm text-dim">
              <span>Progress to {money(board.goal)}</span>
              <span>{board.percent}%</span>
            </div>
            <div
              className="h-3 overflow-hidden rounded-full bg-bg"
              role="progressbar"
              aria-valuenow={board.percent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Fundraising progress"
            >
              <div
                className="h-full rounded-full bg-gold transition-[width] duration-500"
                style={{ width: progressWidth }}
              />
            </div>
            <div className="mt-5">
              <Countdown endsAt={board.auctionEnd} />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-6 sm:px-6" id="piano">
          <PianoGraphic
            activeId={activeId}
            spots={board.spots}
            onSelect={openSpot}
          />
        </section>

        <section id="spots" className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
          <h2 className="font-display text-3xl text-cream sm:text-4xl">
            Live auction
          </h2>
          <p className="mt-2 max-w-2xl text-dim">
            Highest confirmed bid when the clock hits zero wins that spot for 12
            months. Pending bids stay invisible until I confirm the deposit.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {board.spots.map((spot) => (
              <article
                key={spot.spotId}
                className={`card-surface rounded-xl p-4 transition ${
                  activeId === spot.spotId ? "ring-1 ring-gold" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-gold">
                      Spot {spot.spotId}
                    </p>
                    <h3 className="mt-1 font-display text-xl text-cream">
                      {spot.name}
                    </h3>
                    <p className="mt-1 text-sm text-dim">{spot.size}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openSpot(spot.spotId)}
                    disabled={board.ended}
                    className="focus-ring shrink-0 rounded-md px-3 py-2.5 text-sm font-medium transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    style={{ background: "var(--button-bg)", color: "var(--button-text)" }}
                  >
                    Bid
                  </button>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-dim">Starting</dt>
                    <dd className="text-cream">{money(spot.startingBid)}</dd>
                  </div>
                  <div>
                    <dt className="text-dim">Current</dt>
                    <dd className="text-cream">
                      {spot.currentBid != null ? money(spot.currentBid) : "—"}
                    </dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-dim">Holder</dt>
                    <dd className="text-cream">
                      {spot.holderBrand
                        ? `${spot.holderBrand} (${spot.holderHandle})`
                        : "Open"}
                    </dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
          <h2 className="font-display text-3xl text-cream">How it works</h2>
          <ol className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              {
                n: "1",
                t: "Pick a spot and bid",
                d: "Choose one of ten vinyl places on the piano, case, stand, or bag.",
              },
              {
                n: "2",
                t: "The auction buys the piano",
                d: "Deposits and winning bids fund an 88-key Yamaha and the kit around it.",
              },
              {
                n: "3",
                t: "Your logo rides along for 12 months",
                d: "From proof photos onward — practice, travel, and filmed sessions.",
              },
            ].map((step) => (
              <li key={step.n} className="card-surface rounded-xl p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-gold">
                  Step {step.n}
                </p>
                <h3 className="mt-2 font-display text-xl text-cream">{step.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-dim">{step.d}</p>
              </li>
            ))}
          </ol>

          <div className="mt-12">
            <h3 className="font-display text-2xl text-cream sm:text-3xl">
              How the sticker sits
            </h3>
            <div className="piano-stage mt-5 overflow-hidden rounded-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/piano-sticker.jpg"
                alt="Die-cut vinyl stickers placed on the music rest and just above the keys"
                className="h-auto w-full"
              />
            </div>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-dim sm:text-base">
              Die-cut vinyl on the music rest and just above the keys. 12 months
              on the real instrument.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
          <h2 className="font-display text-3xl text-cream">Who you are backing</h2>
          <div className="mt-6 max-w-2xl space-y-4 text-base leading-relaxed text-dim">
            {CONFIG.story.split("\n\n").map((para) => (
              <p key={para.slice(0, 24)}>{para}</p>
            ))}
            <p>
              — {CONFIG.name} · {CONFIG.handle} · {CONFIG.timezoneNote}
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
          <h2 className="font-display text-3xl text-cream">What the money buys</h2>
          <p className="mt-2 text-dim">
            Itemized to the cent. I can edit these in config anytime.
          </p>
          <div className="mt-6 overflow-hidden rounded-xl border border-line">
            <table className="w-full text-left text-sm">
              <thead className="bg-card text-dim">
                <tr>
                  <th className="px-4 py-3 font-medium">Item</th>
                  <th className="px-4 py-3 text-right font-medium">USD</th>
                </tr>
              </thead>
              <tbody>
                {CONFIG.parts.map((part) => (
                  <tr key={part.label} className="border-t border-line">
                    <td className="px-4 py-3 text-cream">{part.label}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-dim">
                      {money(part.amount)}
                    </td>
                  </tr>
                ))}
                <tr className="border-t border-line bg-card">
                  <td className="px-4 py-3 font-medium text-cream">Goal</td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums text-gold">
                    {money(CONFIG.goal)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-dim">
            {CONFIG.honestLine}
          </p>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-dim">
            If the goal is missed: the auction still settles, winners still get
            stickers, and the money still buys the best 88-key piano I can get.
            If the goal is passed: extra goes to strings, a cable kit, or
            lessons. Not affiliated with Yamaha.
          </p>
        </section>

        <FaqSection />

        <footer className="mx-auto max-w-5xl border-t border-line px-4 py-10 sm:px-6">
          <p className="font-display text-xl text-cream">brand my piano</p>
          <p className="mt-2 text-sm text-dim">
            {CONFIG.name} ·{" "}
            <a
              href={CONFIG.xProfile}
              className="text-gold hover:text-gold-hover"
              target="_blank"
              rel="noreferrer"
            >
              {CONFIG.handle}
            </a>{" "}
            · {CONFIG.timezoneNote}
          </p>
          <p className="mt-3 text-sm text-dim">
            Not affiliated with Yamaha. No ROI, impression, or church-mention
            guarantee.
          </p>
        </footer>
      </main>

      <BidModal
        spot={activeSpot}
        open={modalOpen}
        ended={board.ended}
        paymentLink={board.paymentLink}
        onClose={() => setModalOpen(false)}
        onSubmitted={refresh}
      />
    </>
  );
}

function FaqSection() {
  const items = [
    {
      q: "Is this real?",
      a: `Yes. I am ${CONFIG.name} (${CONFIG.handle}). I do not own the piano yet. Confirmed bids and this auction are how I buy it. Pending bids stay off the public board until I confirm your deposit.`,
    },
    {
      q: "What if the goal is missed?",
      a: "The auction still settles. Winners still get stickers. The money still buys the best 88-key piano I can get.",
    },
    {
      q: "How do I pay?",
      a: `Place a bid, then pay the 20% deposit (minimum $5) via the payment link when shown, and DM ${CONFIG.handle} with spot number, brand, and amount. If a Polar link is not set yet, DM me and I will send payment details. Launch is not blocked on Polar.`,
    },
    {
      q: "Do I get guaranteed views or a church mention?",
      a: "No. No ROI promise. No impression guarantee. No pulpit ads. No church shoutouts. Stickers live on my instrument, case, stand, or bag, and may appear in practice videos and photos — not forced into worship.",
    },
    {
      q: "How long does the sticker stay?",
      a: "12 months from proof photos after the piano arrives and stickers are applied.",
    },
    {
      q: "Are you affiliated with Yamaha?",
      a: "No.",
    },
    {
      q: "What if I get outbid?",
      a: "I refund your deposit by hand in v1. Say so clearly in your DM if you need a refund.",
    },
    {
      q: "Who approves the logo?",
      a: "I do, by hand. I can refuse a logo.",
    },
  ];

  return (
    <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <h2 className="font-display text-3xl text-cream">FAQ</h2>
      <div className="mt-6 divide-y divide-[var(--line)] rounded-xl border border-line">
        {items.map((item) => (
          <details key={item.q} className="group px-4 py-1">
            <summary className="focus-ring cursor-pointer list-none py-4 font-medium text-cream marker:content-none [&::-webkit-details-marker]:hidden">
              <span className="flex items-center justify-between gap-3">
                {item.q}
                <span className="text-gold transition group-open:rotate-45">+</span>
              </span>
            </summary>
            <p className="pb-4 text-sm leading-relaxed text-dim">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
