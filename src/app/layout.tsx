import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Sans } from "next/font/google";
import { CONFIG } from "@/config";
import "./globals.css";

const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

const body = IBM_Plex_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${CONFIG.siteName} — ${CONFIG.headline}`,
    template: `%s · ${CONFIG.siteName}`,
  },
  description: CONFIG.heroLede,
  openGraph: {
    title: `${CONFIG.siteName} — ${CONFIG.headline}`,
    description: CONFIG.heroLede,
    type: "website",
    siteName: CONFIG.siteName,
  },
  twitter: {
    card: "summary_large_image",
    title: `${CONFIG.siteName} — ${CONFIG.headline}`,
    description: CONFIG.heroLede,
    creator: CONFIG.handle,
  },
};

const themeInitScript = `(function(){try{var k='brandmypiano-theme';var p=localStorage.getItem(k);if(p!=='default'&&p!=='dark'&&p!=='light')p='default';if(p==='system')p='default';var r=document.documentElement;r.setAttribute('data-theme',p);r.setAttribute('data-theme-preference',p);}catch(e){document.documentElement.setAttribute('data-theme','default');document.documentElement.setAttribute('data-theme-preference','default');}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} h-full`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
