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

   Live on Gumroad since 2026-09-06. The books are never sold separately — the
   five PDFs are one purchase — which is why the cards on the offer page have no
   individual buy buttons and say "Included" instead.

   Two products, differing only in whether a licence key comes with them:
   $29 for the PDFs, $49 for the PDFs plus the key that turns this app into the
   full 750-question bank, offline. Same books in both.

   Priced at $9.99/$19.99 until 2026-09-10. Raising them means four surfaces move
   together or a buyer is quoted one price and charged another: this file, the
   apex `public/index.html`, `products/gumroad-landing/landing.html`, and the
   Gumroad products themselves (price, description and custom_summary, via the
   CLI). The hero artwork carries the price too -- PRICE in
   products/build/marketing_images.py -- and has to be regenerated.

   Gumroad is the merchant of record, so it handles EU VAT, delivery and
   refunds. Bluehost static hosting cannot take payment, so a checkout link is
   the whole integration.

   Deliberately a plain link rather than Gumroad's overlay script: gumroad.js
   restyles any element carrying .gumroad-button with its own branding, which
   fights Vault Steel. A branded button that leaves for Gumroad is the better
   trade. Swap it if the on-site modal turns out to matter more than the look.
   ───────────────────────────────────────────────────────────────────────────── */

export const CHECKOUT = {
    /* The five PDFs. No licence key, so nothing to unlock in this app. */
    bundle: {
        url: "https://securepath6.gumroad.com/l/eight-domains",
        price: "$29",
    },
    /* The same five PDFs plus a licence key. THIS is the product the unlock
       service validates against: Cloud Run runs with
       GUMROAD_PRODUCT_ID=O_wvGHBX4d_MOpvoZafVQw==, which is `lkidg`, not
       `eight-domains`. A key from the cheaper product does not exist, so any
       "unlock" call to action has to point here or it sells a thing the buyer
       will not receive. */
    plus: {
        url: "https://securepath6.gumroad.com/l/lkidg",
        price: "$49",
    },
} as const;

export const BUY = CHECKOUT.bundle;
export const BUY_PLUS = CHECKOUT.plus;

/* ?wanted=true skips Gumroad's product page and opens the checkout form with
   the item already in the cart — verified 2026-09-06. Without it a buyer who
   already decided has to read a second sales page and click again. */
export const BUY_HREF = `${BUY.url}?wanted=true`;
export const BUY_PLUS_HREF = `${BUY_PLUS.url}?wanted=true`;
