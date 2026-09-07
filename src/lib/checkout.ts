/**
 * Where to send a buyer. Lifted out of the offer page because the unlock page
 * needs the same URL and two copies of a checkout link is how one of them goes
 * stale.
 *
 * The permalink is the pretty one; the Gumroad CLI keys on the original
 * (`pvzbycc`) and the licence API on the product id. See
 * securepathdigital-site/docs/GUMROAD.md before changing any of the three.
 */

/* ─────────────────────────────────────────────────────────────────────────────
   CHECKOUT WIRING

   Live on Gumroad since 2026-09-06 as ONE product — the three books together,
   not three SKUs. That is why the cards below have no individual buy buttons:
   there is nothing to buy separately, and a "Coming soon" chip beside a live
   bundle reads as broken. If the books are ever split, add entries here and
   give each card its own button back.

   Gumroad is the merchant of record, so it handles EU VAT, delivery and
   refunds. Bluehost static hosting cannot take payment, so a checkout link is
   the whole integration.

   Deliberately a plain link rather than Gumroad's overlay script: gumroad.js
   restyles any element carrying .gumroad-button with its own branding, which
   fights Vault Steel. A branded button that leaves for Gumroad is the better
   trade. Swap it if the on-site modal turns out to matter more than the look.
   ───────────────────────────────────────────────────────────────────────────── */

export const CHECKOUT = {
    bundle: {
        url: "https://securepath6.gumroad.com/l/eight-domains",
        price: "$9.99",
    },
} as const;

export const BUY = CHECKOUT.bundle;

/* ?wanted=true skips Gumroad's product page and opens the checkout form with
   the item already in the cart — verified 2026-09-06. Without it a buyer who
   already decided has to read a second sales page and click again. */
export const BUY_HREF = `${BUY.url}?wanted=true`;
