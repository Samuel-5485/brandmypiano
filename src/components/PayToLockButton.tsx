import { lockPaymentUrl, money } from "@/lib/auction";

type Props = {
  paymentLink: string;
  bidAmount: number;
  className?: string;
  fullWidth?: boolean;
};

export function PayToLockButton({
  paymentLink,
  bidAmount,
  className = "",
  fullWidth = false,
}: Props) {
  const url = lockPaymentUrl(paymentLink, bidAmount);
  if (!url || bidAmount <= 0) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className={`focus-ring inline-block rounded-md px-4 py-2.5 text-sm font-medium transition hover:opacity-90 ${
        fullWidth ? "w-full text-center" : ""
      } ${className}`}
      style={{ background: "var(--button-bg)", color: "var(--button-text)" }}
    >
      Pay to lock — {money(bidAmount)}
    </a>
  );
}
