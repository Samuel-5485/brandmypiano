"use client";

import { useEffect, useState } from "react";

function pad(n: number) {
  return String(Math.max(0, n)).padStart(2, "0");
}

export function Countdown({ endsAt }: { endsAt: string }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const end = new Date(endsAt).getTime();
  const remaining = now === null ? null : Math.max(0, end - now);
  const ended = remaining === 0;

  let days = 0;
  let hours = 0;
  let mins = 0;
  let secs = 0;
  if (remaining !== null) {
    days = Math.floor(remaining / 86400000);
    hours = Math.floor((remaining % 86400000) / 3600000);
    mins = Math.floor((remaining % 3600000) / 60000);
    secs = Math.floor((remaining % 60000) / 1000);
  }

  const parts = [
    { label: "days", value: pad(days) },
    { label: "hrs", value: pad(hours) },
    { label: "min", value: pad(mins) },
    { label: "sec", value: pad(secs) },
  ];

  return (
    <div aria-live="polite">
      <p className="mb-2 text-xs uppercase tracking-[0.18em] text-dim">
        {ended ? "Auction ended — locking winners." : "Time left"}
      </p>
      <div className="grid grid-cols-4 gap-2">
        {parts.map((part) => (
          <div
            key={part.label}
            className="card-surface rounded-md px-2 py-3 text-center"
          >
            <div className="font-display text-2xl tabular-nums text-cream sm:text-3xl">
              {remaining === null ? "——" : part.value}
            </div>
            <div className="mt-1 text-[10px] uppercase tracking-wider text-dim">
              {part.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
