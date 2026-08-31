import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "Practice Exams — Secure Path Digital",
  description: "Master the CISSP exam with real-world case studies.",
};

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
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-TYNW16GB14" />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-TYNW16GB14');`,
          }}
        />
      </head>
      <body
        className={`${krona.variable} ${schibsted.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <div className="flex min-h-screen flex-col">
          <Header />
          <div className="flex-1">{children}</div>
          <Footer />
        </div>
      </body>
    </html>
  );
}
