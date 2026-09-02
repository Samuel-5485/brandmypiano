"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CONFIG } from "@/config";
import { money } from "@/lib/auction";
import type { PublicBoard, SpotPublicState } from "@/lib/types";
import { BidModal } from "@/components/BidModal";
import { Countdown } from "@/components/Countdown";
import { PianoGraphic } from "@/components/PianoGraphic";
import { LiveAuctionBoard } from "@/components/LiveAuctionBoard";
import { StickerMockup } from "@/components/StickerMockup";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";

type Props = {
  initialBoard: PublicBoard;
};

export function AuctionApp({ initialBoard }: Props) {
  const [board, setBoard] = useState(initialBoard);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [prefillAmount, setPrefillAmount] = useState<number | null>(null);

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
    if (selectedId == null) return null;
    return board.spots.find((s) => s.spotId === selectedId) ?? null;
  }, [selectedId, board.spots]);

  function selectSpot(id: number) {
    setSelectedId(id);
  }

  function openBidModal(id: number, amount?: number) {
    setSelectedId(id);
    setPrefillAmount(amount ?? null);
    setModalOpen(true);
  }

  function closeBidModal() {
    setModalOpen(false);
    setPrefillAmount(null);
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
          <p className="mt-5 max-w-2xl whitespace-pre-line text-base leading-relaxed text-dim sm:text-lg">
            {CONFIG.heroLede}
          </p>

          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Raised", value: money(board.raised) },
              { label: "Goal", value: money(board.goal) },
              { label: "Spots with a bid", value: `${board.spotsWithBid}/${CONFIG.spots.length}` },
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
            activeId={selectedId}
            spots={board.spots}
            onSelect={(id) => {
              selectSpot(id);
              openBidModal(id);
            }}
          />
        </section>

        <LiveAuctionBoard
          board={board}
          selectedId={selectedId}
          onSelectSpot={selectSpot}
          onBidSpot={openBidModal}
        />

        <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
          <h2 className="font-display text-3xl text-cream">How it works</h2>
          <ol className="mt-8 max-w-2xl space-y-4 text-base leading-relaxed text-dim">
            <li>
              <span className="font-medium text-cream">1.</span> Pick a spot and
              bid.
            </li>
            <li>
              <span className="font-medium text-cream">2.</span> Pay the bid
              through Polar. If someone outbids you on that same spot, you are
              refunded. If you stay 1st and lock, you are not refunded.
            </li>
            <li>
              <span className="font-medium text-cream">3.</span> 1st place logo
              stays on that part of the kit for {CONFIG.stickerDuration} —
              practice, dorm, lessons, YouTube. Not worship services.
            </li>
          </ol>
          <p className="mt-6 max-w-2xl text-sm leading-relaxed text-dim">
            {CONFIG.refundPublicCopy}
          </p>
          <ul className="mt-4 max-w-2xl space-y-2 text-sm leading-relaxed text-dim">
            <li>
              Paid + not locked = others may outbid that same spot. Beaten payer
              is refunded.
            </li>
            <li>
              Locked = nobody else can buy that spot. No refund to the locked
              winner.
            </li>
            <li>
              &ldquo;Pay to lock&rdquo; / admin Lock is the close.
            </li>
          </ul>

          <div className="mt-12">
            <h3 className="font-display text-2xl text-cream sm:text-3xl">
              How the sticker sits
            </h3>
            <div className="mt-5">
              <StickerMockup spots={board.spots} />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
          <h2 className="font-display text-3xl text-cream">Who you are backing</h2>
          <div className="mt-6 flex max-w-2xl flex-col gap-6 sm:flex-row sm:items-start">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={CONFIG.photo}
              alt={CONFIG.name}
              width={96}
              height={96}
              className="h-24 w-24 shrink-0 rounded-full object-cover"
            />
            <div className="space-y-4 text-base leading-relaxed text-dim">
              {CONFIG.story.split("\n\n").map((para) => (
                <p key={para.slice(0, 24)}>{para}</p>
              ))}
              <p>
                — {CONFIG.name} · {CONFIG.handle} · {CONFIG.location}
              </p>
            </div>
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
            stickers, and the money still buys the best PSR-E383 kit I can get.
            If the goal is passed: extra goes to a better bench, cables, or
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
            · {CONFIG.location}
          </p>
          <p className="mt-3 text-sm text-dim">{CONFIG.refundPublicCopy}</p>
        </footer>
      </main>

      <BidModal
        spot={activeSpot}
        open={modalOpen}
        ended={board.ended}
        paymentLink={board.paymentLink}
        prefillAmount={prefillAmount}
        onClose={closeBidModal}
        onSubmitted={refresh}
      />
    </>
  );
}

function FaqSection() {
  const items: {
    q: string;
    a?: string;
    bullets?: string[];
  }[] = [
    {
      q: "How long does the sticker stay?",
      a: "Until I no longer have this instrument.",
    },
    {
      q: "Can two people buy spot 1?",
      a: "Not after it is locked. Before lock, a higher bid can take 1st and the previous payment is refunded.",
    },
    {
      q: "Is this real?",
      a: `Yes. ${CONFIG.name} (${CONFIG.handle}), East Africa. The PSR-E383 is a real kit I will buy. Stickers are real vinyl. The branded kit is for practice, teaching, dorm, and videos — not the church pulpit.`,
    },
    {
      q: "Do I get guaranteed views or a church mention?",
      a: "No. No ROI. No church shoutouts. No pulpit ads.",
    },
    {
      q: "What if I get outbid?",
      a: "If you already paid and you are no longer 1st on that spot, you get a refund. I process it in Polar after I confirm the new leader paid or the bid is beaten.\nIf you locked the spot after I confirmed payment, no refund.",
    },
    {
      q: "Why is the goal $1,000?",
      a: "Kit (keyboard, stand, bench, bag, pedal, headphones) + vinyl printing + keeping the project up while I own the keyboard. The E383 alone is less than $1,000. Extra is not a secret MacBook.",
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
            {item.bullets ? (
              <ul className="list-disc space-y-2 pb-4 pl-5 text-sm leading-relaxed text-dim">
                {item.bullets.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : (
              <p className="pb-4 text-sm leading-relaxed text-dim">{item.a}</p>
            )}
          </details>
        ))}
      </div>
    </section>
  );
}
