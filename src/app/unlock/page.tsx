import type { Metadata } from "next";
import { UnlockPageClient } from "./unlock-client";

/*
 * A static route like every other page here: the export writes /unlock/index.html
 * and the licence check happens in the browser, against the unlock service.
 * Nothing on this page is personalised at build time, so there is nothing for a
 * static host to get wrong.
 */
export const metadata: Metadata = {
  title: "Unlock Your Questions — Secure Path Digital",
  description:
    "Enter the licence key from your Gumroad receipt to load all 750 practice questions into this app, " +
    "on this device, ready to use offline.",
  // Nothing to index: the page is a form for people who have already bought.
  robots: { index: false, follow: true },
};

export default function UnlockPage() {
  return <UnlockPageClient />;
}
