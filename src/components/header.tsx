"use client"

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { VaultLockup } from "@/components/vault-mark";

/*
 * The site header. ONE bar for both properties.
 *
 * The apex (securepathdigital.net) renders the same bar from
 * securepathdigital-site/scripts/sync_header.py, and src/app/site-header.css is a
 * verbatim copy of that script's CSS. SHARED_NAV below must stay identical to
 * that script's NAV: same text, same order, same URLs. Change both together.
 *
 * Every route in this app gets this header from the root layout; no page renders
 * its own. Do not add links that appear only after hydration (a conditional
 * Progress link used to pop in and shove the bar sideways).
 */
const APEX = "https://securepathdigital.net";
const LEARN = "https://learn.securepathdigital.net";

export const SHARED_NAV = [
  { label: "Free Practice Test", href: `${LEARN}/practice/` },
  { label: "Study Materials", href: `${LEARN}/` },
  { label: "Free Revision Sheets", href: `${APEX}/cissp-revision-sheets/` },
  { label: "FAQ", href: `${APEX}/cissp-faq/` },
  { label: "About", href: `${APEX}/about/` },
  { label: "Contact", href: `${APEX}/#contact` },
] as const;

/* The learn header carries exactly the shared links. Unlock was a seventh item until
   2026-10-29: a buyers-only step in the menu every free visitor reads, easy to mistake
   for the free email signup. Buyers reach /unlock/ from the Gumroad receipt, the
   practice upsell ("Already bought? Enter your key."), the signup panel and the footer. */
const NAV = SHARED_NAV;

/* The practice app's screens, all reached from /practice/. On these the Free
   Practice Test link is marked as the current section. */
const PRACTICE_SECTION = ["/quiz/", "/study/", "/report/", "/progress/"];

const slash = (p: string) => (p.endsWith("/") ? p : `${p}/`);

/** aria-current for a nav link on the page at `pathname`. */
function currentFor(href: string, pathname: string): "page" | "true" | undefined {
  if (!href.startsWith(`${LEARN}/`)) return undefined;
  const path = slash(href.slice(LEARN.length));
  const here = slash(pathname || "/");
  if (path === here) return "page";
  if (path === "/practice/" && PRACTICE_SECTION.some(s => here.startsWith(s))) return "true";
  return undefined;
}

export function Header() {
  const pathname = usePathname();
  const button = useRef<HTMLButtonElement>(null);
  // The menu is open FOR a path, so a route change (any link, back/forward)
  // closes it without an effect.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const setOpen = (v: boolean) => setOpenOn(v ? pathname : null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setOpenOn(null); button.current?.focus(); }
    };
    // Growing past the breakpoint shows the inline links; drop the open state.
    const mq = window.matchMedia("(min-width:1024px)");
    const onWide = () => { if (mq.matches) setOpenOn(null); };
    document.addEventListener("keydown", onKey);
    mq.addEventListener("change", onWide);
    return () => {
      document.removeEventListener("keydown", onKey);
      mq.removeEventListener("change", onWide);
    };
  }, [open]);

  return (
    <header className={open ? "site is-open" : "site"}>
      <div className="wrap nav">
        <a className="brand" href={`${APEX}/`} aria-label="Secure Path Digital — home">
          <VaultLockup />
        </a>
        <button
          ref={button}
          type="button"
          className="nav-button"
          aria-label="Menu"
          aria-expanded={open}
          aria-controls="site-nav"
          onClick={() => setOpen(!open)}
        >
          <svg className="icon-open" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               strokeWidth="2" strokeLinecap="round" aria-hidden="true" focusable="false">
            <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
          </svg>
          <svg className="icon-close" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               strokeWidth="2" strokeLinecap="round" aria-hidden="true" focusable="false">
            <line x1="5" y1="5" x2="19" y2="19" /><line x1="19" y1="5" x2="5" y2="19" />
          </svg>
        </button>
        <nav className="nav-menu" id="site-nav" aria-label="Main">
          <ul className="nav-links">
            {NAV.map(({ label, href }) => {
              const current = currentFor(href, pathname);
              const close = () => setOpen(false);
              // Same-host links route client-side; the rest are ordinary anchors.
              return (
                <li key={label}>
                  {href.startsWith(`${LEARN}/`) ? (
                    <Link href={href.slice(LEARN.length)} aria-current={current} onClick={close}>{label}</Link>
                  ) : (
                    <a href={href} aria-current={current} onClick={close}>{label}</a>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}
