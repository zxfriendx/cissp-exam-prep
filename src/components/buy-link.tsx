"use client"

import { BUY_HREF, BUY_PLUS_HREF } from "@/lib/checkout";
import { trackBuyClick, type BuyTier } from "@/lib/analytics";

type Props = Omit<React.ComponentPropsWithRef<"a">, "href"> & {
    /** Which Gumroad product: the five books, or the books plus the licence key. */
    buy: BuyTier;
    /** Where on the site the link sits, e.g. "offer_tier", "practice_upsell". */
    placement: string;
};

/**
 * Every checkout link on the site. It owns the href, the rel, and the
 * buy_click event, so a new buy button cannot forget any of the three. The
 * offer page is a server component and cannot attach an onClick itself, which
 * is why this is a component and not a helper.
 *
 * Spreads the rest of its props onto the anchor so it can sit inside
 * `<Button asChild>`: Radix Slot merges className and ref onto it.
 */
export function BuyLink({ buy, placement, onClick, children, ...rest }: Props) {
    const href = buy === "plus" ? BUY_PLUS_HREF : BUY_HREF;
    return (
        <a
            href={href}
            rel="noopener"
            onClick={(e) => {
                trackBuyClick(buy, placement);
                onClick?.(e);
            }}
            {...rest}
        >
            {children}
        </a>
    );
}
