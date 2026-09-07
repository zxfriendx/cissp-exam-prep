"use client"

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VaultLockup } from "@/components/vault-mark";
import { useBankStore } from "@/lib/bank";
import { useProgressStore } from "@/store/progress-store";

const navLinks = [
  { label: "Study Materials", href: "/" },
  { label: "Free Practice Test", href: "/practice/" },
  { label: "Services", href: "https://securepathdigital.net/#services" },
  { label: "Contact", href: "https://securepathdigital.net/#contact" },
];

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  /* The tier, not the token: it says what the reader is actually being served.
     It starts "free" on the server and on the first client render and only
     flips once BankLoader has the paid bank in hand, so the label never
     promises questions that have not arrived. */
  const tier = useBankStore(state => state.tier);
  /* Progress is only worth a nav slot once there is some: the page is honest but
     bleak with an empty attempt log, and a permanent link to it invites a reader
     to check a score they have not earned yet. */
  const hasProgress = useProgressStore(state => state.attempts.length > 0);
  const links = [
    ...navLinks,
    ...(hasProgress ? [{ label: "Progress", href: "/progress/" }] : []),
    { label: tier === "paid" ? "Unlocked" : "Unlock", href: "/unlock/" },
  ];

  // The root is the offer now and /practice/ is the free quiz, so the active
  // tab is derived from the path. Off-site links never match.
  const isCurrent = (href: string) =>
    href === "/" ? pathname === "/" : href.startsWith("/") && pathname.startsWith(href);

  const linkClass = (href: string, size: string) =>
    `${size} font-medium transition-colors ${
      isCurrent(href) ? "text-accent" : "text-foreground hover:text-accent"
    }`;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[rgb(var(--vault-line))] bg-[rgb(var(--vault-bg)/0.86)] backdrop-blur-md">
      <div className="mx-auto flex h-[76px] max-w-[1280px] items-center justify-between px-6">
        {/* "/" — the home of THIS property, matching /guides/ and the main site,
            which both point their mark at their own root. It used to jump
            off-subdomain, so the mark did something different on Practice than
            on Study Materials. Services/Contact in the nav still go off-site. */}
        <Link
          href="/"
          className="flex items-center gap-3.5 text-primary hover:text-accent transition-colors"
          aria-label="Secure Path Digital"
        >
          <VaultLockup />
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center">
          <nav className="flex items-center gap-7">
            {links.map((link) =>
              link.href.startsWith("/") ? (
                <Link key={link.label} href={link.href} aria-current={isCurrent(link.href) ? "page" : undefined} className={linkClass(link.href, "text-[0.92rem]")}>
                  {link.label}
                </Link>
              ) : (
                <a key={link.label} href={link.href} className={linkClass(link.href, "text-[0.92rem]")}>
                  {link.label}
                </a>
              )
            )}
          </nav>
        </div>

        {/* Mobile controls */}
        <div className="flex items-center gap-2 md:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <nav className="md:hidden border-t border-border bg-background px-6 py-4">
          <div className="flex flex-col gap-4">
            {links.map((link) =>
              link.href.startsWith("/") ? (
                <Link
                  key={link.label}
                  href={link.href}
                  className={linkClass(link.href, "text-lg")}
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </Link>
              ) : (
                <a
                  key={link.label}
                  href={link.href}
                  className={linkClass(link.href, "text-lg")}
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </a>
              )
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
