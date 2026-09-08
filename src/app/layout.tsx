import type { Metadata, Viewport } from "next";
import { Krona_One, Schibsted_Grotesk, Geist_Mono } from "next/font/google";
import "./globals.css";

// Vault Steel typography — see securepathdigital-site/brand/kit-vault-steel.html.
// Krona One is a DISPLAY face: hero, wordmark and small-caps labels only, always
// uppercase. Body and section headings are Schibsted Grotesk.
const krona = Krona_One({
  variable: "--font-krona",
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});

const schibsted = Schibsted_Grotesk({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { BankLoader } from "@/components/entitlement/bank-loader";
import { RegisterSW } from "@/components/pwa/register-sw";
import { InstallCoach } from "@/components/pwa/install-coach";

/* The root is the offer now, not the quiz, so the site-wide default describes
   the books. Pages that are not the offer — /practice/, /guides/ — set their
   own title. */
export const metadata: Metadata = {
  metadataBase: new URL("https://learn.securepathdigital.net"),
  title: "The Eight Domains — CISSP Study Materials — Secure Path Digital",
  description:
    "Three books covering the eight domains of the 2024 CISSP outline: a lesson for every objective, 439 practice questions with all four options explained, and one revision sheet per domain. $9.99. Free practice test alongside.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Eight Domains", statusBarStyle: "black-translucent" },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

// themeColor moved out of `metadata` in Next 16; it belongs here or it is ignored.
export const viewport: Viewport = { themeColor: "#0C0D10" };

/* One place to change the GA property. Both this app and the apex site's
   public/index.html carry the same id and the same linked-domain list; they are
   one property, split by hostname in reports rather than by having two. */
const GA_ID = "G-Y20Q6FPX5T";
const GA_LINKED_DOMAINS = [
  "securepathdigital.net",
  "learn.securepathdigital.net",
  "securepath6.gumroad.com",
  "gumroad.com",
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Vault Steel is a dark identity, so the app is dark-only: no theme toggle and
  // no light palette. `color-scheme: dark` makes the browser paint form controls,
  // scrollbars and the canvas to match instead of flashing white.
  return (
    <html lang="en" className="dark" style={{ colorScheme: "dark" }}>
      <head>
        {/* GA4. G-TYNW16GB14 used to sit here -- it is atmavailability's
            measurement ID, copied in with the rest of this layout when the app
            was forked from that one, so every visit to this property was being
            reported into that one until 2026-09-08. Both datasets were wrong.

            `linker.domains` is what keeps a buyer one person across the hop to
            Gumroad: without it the checkout starts a fresh session on a fresh
            domain and the sale attributes to nothing. It only works if the same
            measurement ID is also set in Gumroad's own Settings -> Advanced
            field, and if these domains are listed in the GA data stream. */}
        <script async src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}',{linker:{domains:${JSON.stringify(GA_LINKED_DOMAINS)}}});`,
          }}
        />
      </head>
      <body
        className={`${krona.variable} ${schibsted.variable} ${geistMono.variable} font-sans antialiased`}
      >
        {/* Renders nothing. Swaps the paid question bank in, after hydration,
            for a reader who has unlocked — on every route, so a bookmarked
            quiz URL gets the full domain rather than the free twenty. */}
        <BankLoader />
        {/* Both render nothing until they have something to do: RegisterSW only
            registers over https in production, InstallCoach only appears when the
            page is installable and the reader has not dismissed it. */}
        <RegisterSW />
        <InstallCoach />
        <div className="flex min-h-screen flex-col">
          <Header />
          <div className="flex-1">{children}</div>
          <Footer />
        </div>
      </body>
    </html>
  );
}
