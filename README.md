# Brand My Piano

One-page live auction: 10 vinyl sticker spots fund an 88-key Yamaha.

## Run locally

```bash
cd brandmypiano
npm install
cp .env.example .env.local
# set ADMIN_PASSWORD in .env.local
npm run dev
```

Open http://localhost:3000  
Admin: http://localhost:3000/admin

## Before you post on X — edit these

1. **`src/config.ts`** — name, handle, xProfile, paymentLink (Polar), goal, auctionEnd, parts, spots
2. **`.env.local` / Vercel env** — `ADMIN_PASSWORD`, `NEXT_PUBLIC_SITE_URL`
3. Optional: `PAYMENT_LINK` (overrides config), `BLOB_READ_WRITE_TOKEN` (Vercel Blob so bids persist on Vercel)

## Env vars

| Var | Required | Notes |
|---|---|---|
| `ADMIN_PASSWORD` | yes for admin | Protects `/admin` |
| `NEXT_PUBLIC_SITE_URL` | recommended | Canonical URL + OG |
| `PAYMENT_LINK` | no | Polar checkout link override |
| `BLOB_READ_WRITE_TOKEN` | for Vercel prod | Attach a Blob store in Vercel; local `data/bids.json` is enough for `npm run dev` |
| `STRIPE_SECRET_KEY` | no | Unused. Do not block launch on Stripe/Polar |

If Polar / payment link is empty, the bid modal still works: pay via link when you have one + DM `@YOURHANDLE`.

## Deploy to Vercel

1. Push this folder to GitHub (or import the directory in Vercel)
2. Set `ADMIN_PASSWORD` and `NEXT_PUBLIC_SITE_URL`
3. Storage → create Blob store → connect to the project (sets `BLOB_READ_WRITE_TOKEN`)
4. Deploy
5. Open `/admin`, log in, place a test bid on the site, confirm it

Local JSON works on your machine. On Vercel, attach Blob or bids will not survive cold starts.

## Test a bid

1. Tap a spot → enter brand, handle, amount
2. Complete the “pending” next steps (payment + DM)
3. In `/admin`, confirm the bid
4. Refresh the homepage — only confirmed bids appear; raised updates

## Launch tweet

```
I'm selling ad space on a piano I don't own yet.

→ 10 sticker spots
→ live auction
→ 14 days
→ the auction buys the Yamaha

I learned on my brother's little practice piano 4 years ago.
I want 88 real keys so I can practice every day and play in church.

Your logo sits on the instrument for 12 months.

[URL]
```

Film 15 seconds on the old practice piano and attach that video to the tweet.

## Notes

- Public board shows **confirmed** bids only. Raised starts at $0.
- Outbid deposits are refunded by you manually in v1.
- Not affiliated with Yamaha. No ROI / church-mention guarantee.
- Optional static OG: add `public/og.png`. Dynamic OG is already at `/opengraph-image`.
