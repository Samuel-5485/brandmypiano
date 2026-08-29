"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { CONFIG } from "@/config";
import { money } from "@/lib/auction";
import type { Bid, PublicBoard } from "@/lib/types";

type AdminPayload = {
  bids: Bid[];
  board: PublicBoard;
  adminNote: string;
};

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<AdminPayload | null>(null);
  const [busy, setBusy] = useState(false);

  const [manual, setManual] = useState({
    spotId: "1",
    brandName: "",
    handle: "",
    website: "",
    amount: "",
    status: "confirmed",
  });

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/bids", { cache: "no-store" });
    if (res.status === 401) {
      setAuthed(false);
      setData(null);
      return;
    }
    if (!res.ok) {
      setError("Could not load bids.");
      return;
    }
    const json = (await res.json()) as AdminPayload;
    setData(json);
    setAuthed(true);
  }, []);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  async function login(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Login failed.");
        setBusy(false);
        return;
      }
      setAuthed(true);
      await load();
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/admin/login", { method: "DELETE" });
    setAuthed(false);
    setData(null);
  }

  async function act(body: Record<string, unknown>) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/bids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Action failed.");
      } else {
        await load();
      }
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  if (!authed) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
        <h1 className="font-display text-3xl text-cream">Admin</h1>
        <p className="mt-2 text-sm text-dim">
          Password from <code className="text-gold">ADMIN_PASSWORD</code>.
        </p>
        <form onSubmit={login} className="mt-6 space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="focus-ring w-full rounded-md border border-line bg-card px-3 py-3 text-cream"
            placeholder="Password"
            autoComplete="current-password"
          />
          {error && <p className="text-sm text-red-300">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="focus-ring w-full rounded-md px-4 py-3 font-medium transition hover:opacity-90"
            style={{ background: "var(--button-bg)", color: "var(--button-text)" }}
          >
            {busy ? "…" : "Enter"}
          </button>
        </form>
      </main>
    );
  }

  const bids = data?.bids ?? [];
  const pending = bids.filter((b) => b.status === "pending");
  const confirmed = bids.filter((b) => b.status === "confirmed");
  const rejected = bids.filter((b) => b.status === "rejected");

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-cream">Admin</h1>
          <p className="mt-1 text-sm text-dim">{data?.adminNote}</p>
          {data && (
            <p className="mt-2 text-sm text-dim">
              Raised {money(data.board.raised)} / {money(data.board.goal)} ·{" "}
              {data.board.spotsWithBid}/10 spots
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <a
            href="/api/admin/bids?format=csv"
            className="focus-ring rounded-md border border-line px-3 py-2 text-sm text-cream hover:border-gold"
          >
            Download CSV
          </a>
          <button
            type="button"
            onClick={logout}
            className="focus-ring rounded-md border border-line px-3 py-2 text-sm text-dim hover:text-cream"
          >
            Log out
          </button>
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-red-300">{error}</p>}

      <section className="mt-8">
        <h2 className="font-display text-xl text-cream">Manually add a bid</h2>
        <form
          className="mt-3 grid gap-3 sm:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault();
            act({
              action: "create",
              spotId: Number(manual.spotId),
              brandName: manual.brandName,
              handle: manual.handle,
              website: manual.website,
              amount: Number(manual.amount),
              status: manual.status,
            });
          }}
        >
          <select
            value={manual.spotId}
            onChange={(e) => setManual({ ...manual, spotId: e.target.value })}
            className="focus-ring rounded-md border border-line bg-card px-3 py-2 text-cream"
          >
            {CONFIG.spots.map((s) => (
              <option key={s.id} value={s.id}>
                {s.id}. {s.name}
              </option>
            ))}
          </select>
          <input
            required
            placeholder="Brand"
            value={manual.brandName}
            onChange={(e) => setManual({ ...manual, brandName: e.target.value })}
            className="focus-ring rounded-md border border-line bg-card px-3 py-2 text-cream"
          />
          <input
            required
            placeholder="@handle"
            value={manual.handle}
            onChange={(e) => setManual({ ...manual, handle: e.target.value })}
            className="focus-ring rounded-md border border-line bg-card px-3 py-2 text-cream"
          />
          <input
            placeholder="https://"
            value={manual.website}
            onChange={(e) => setManual({ ...manual, website: e.target.value })}
            className="focus-ring rounded-md border border-line bg-card px-3 py-2 text-cream"
          />
          <input
            required
            type="number"
            placeholder="Amount"
            value={manual.amount}
            onChange={(e) => setManual({ ...manual, amount: e.target.value })}
            className="focus-ring rounded-md border border-line bg-card px-3 py-2 text-cream"
          />
          <select
            value={manual.status}
            onChange={(e) => setManual({ ...manual, status: e.target.value })}
            className="focus-ring rounded-md border border-line bg-card px-3 py-2 text-cream"
          >
            <option value="confirmed">confirmed</option>
            <option value="pending">pending</option>
            <option value="rejected">rejected</option>
          </select>
          <button
            type="submit"
            disabled={busy}
            className="focus-ring rounded-md px-3 py-2 font-medium transition hover:opacity-90 sm:col-span-3"
            style={{ background: "var(--button-bg)", color: "var(--button-text)" }}
          >
            Add bid
          </button>
        </form>
      </section>

      <BidTable
        title={`Pending (${pending.length})`}
        bids={pending}
        busy={busy}
        onConfirm={(id) => act({ action: "confirm", id })}
        onReject={(id) => act({ action: "reject", id })}
        onUpdate={(id, patch) => act({ action: "update", id, ...patch })}
      />
      <BidTable
        title={`Confirmed (${confirmed.length})`}
        bids={confirmed}
        busy={busy}
        onConfirm={(id) => act({ action: "confirm", id })}
        onReject={(id) => act({ action: "reject", id })}
        onUpdate={(id, patch) => act({ action: "update", id, ...patch })}
      />
      <BidTable
        title={`Rejected (${rejected.length})`}
        bids={rejected}
        busy={busy}
        onConfirm={(id) => act({ action: "confirm", id })}
        onReject={(id) => act({ action: "reject", id })}
        onUpdate={(id, patch) => act({ action: "update", id, ...patch })}
      />
    </main>
  );
}

function BidTable({
  title,
  bids,
  busy,
  onConfirm,
  onReject,
  onUpdate,
}: {
  title: string;
  bids: Bid[];
  busy: boolean;
  onConfirm: (id: string) => void;
  onReject: (id: string) => void;
  onUpdate: (id: string, patch: Record<string, unknown>) => void;
}) {
  return (
    <section className="mt-10">
      <h2 className="font-display text-xl text-cream">{title}</h2>
      <div className="mt-3 overflow-x-auto rounded-xl border border-line">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-card text-dim">
            <tr>
              <th className="px-3 py-2">Spot</th>
              <th className="px-3 py-2">Brand / handle</th>
              <th className="px-3 py-2">Amount</th>
              <th className="px-3 py-2">Deposit</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {bids.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-4 text-dim">
                  None
                </td>
              </tr>
            )}
            {bids.map((bid) => (
              <tr key={bid.id} className="border-t border-line align-top">
                <td className="px-3 py-3 text-cream">{bid.spotId}</td>
                <td className="px-3 py-3">
                  <div className="text-cream">{bid.brandName}</div>
                  <div className="text-dim">{bid.handle}</div>
                  {bid.website && (
                    <div className="truncate text-xs text-dim">{bid.website}</div>
                  )}
                  {bid.note && (
                    <div className="mt-1 text-xs text-dim">{bid.note}</div>
                  )}
                </td>
                <td className="px-3 py-3">
                  <input
                    type="number"
                    defaultValue={bid.amount}
                    className="focus-ring w-24 rounded border border-line bg-bg px-2 py-1 text-cream"
                    onBlur={(e) => {
                      const amount = Number(e.target.value);
                      if (amount !== bid.amount) onUpdate(bid.id, { amount });
                    }}
                  />
                </td>
                <td className="px-3 py-3 text-dim">{money(bid.deposit)}</td>
                <td className="px-3 py-3">
                  <select
                    defaultValue={bid.status}
                    className="focus-ring rounded border border-line bg-bg px-2 py-1 text-cream"
                    onChange={(e) => onUpdate(bid.id, { status: e.target.value })}
                  >
                    <option value="pending">pending</option>
                    <option value="confirmed">confirmed</option>
                    <option value="rejected">rejected</option>
                  </select>
                </td>
                <td className="px-3 py-3">
                  <div className="flex flex-col gap-1">
                    {bid.status !== "confirmed" && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => onConfirm(bid.id)}
                        className="text-left text-gold hover:text-gold-hover"
                      >
                        Confirm
                      </button>
                    )}
                    {bid.status !== "rejected" && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => onReject(bid.id)}
                        className="text-left text-dim hover:text-cream"
                      >
                        Reject
                      </button>
                    )}
                    <input
                      defaultValue={bid.handle}
                      className="focus-ring mt-1 w-28 rounded border border-line bg-bg px-2 py-1 text-xs text-cream"
                      title="Edit handle"
                      onBlur={(e) => {
                        if (e.target.value !== bid.handle) {
                          onUpdate(bid.id, { handle: e.target.value });
                        }
                      }}
                    />
                    <input
                      defaultValue={bid.brandName}
                      className="focus-ring w-28 rounded border border-line bg-bg px-2 py-1 text-xs text-cream"
                      title="Edit brand"
                      onBlur={(e) => {
                        if (e.target.value !== bid.brandName) {
                          onUpdate(bid.id, { brandName: e.target.value });
                        }
                      }}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
