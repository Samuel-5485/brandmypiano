import Link from "next/link";
import { CONFIG } from "@/config";

export const metadata = {
  title: "Payment received",
};

export default function SuccessPage() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center px-4 py-16 sm:px-6">
      <p className="text-xs uppercase tracking-[0.16em] text-gold">
        {CONFIG.siteName}
      </p>
      <h1 className="font-display mt-3 text-3xl text-cream sm:text-4xl">
        Thanks. Payment received.
      </h1>
      <p className="mt-5 text-base leading-relaxed text-dim">
        I will confirm your payment in admin. If you stay 1st, I lock the spot
        after any beaten payers are refunded. Do not pay twice.{" "}
        {CONFIG.refundPublicCopy}
      </p>
      <Link
        href="/"
        className="focus-ring mt-8 inline-block rounded-md px-4 py-3 text-center font-medium transition hover:opacity-90"
        style={{ background: "var(--button-bg)", color: "var(--button-text)" }}
      >
        Back to the auction
      </Link>
    </main>
  );
}
