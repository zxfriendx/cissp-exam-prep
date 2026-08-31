"use client"

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VaultLockup } from "@/components/vault-mark";

const navLinks = [
  { label: "Practice", href: "/" },
  { label: "Study Materials", href: "/guides/" },
  { label: "Services", href: "https://securepathdigital.net/#services" },
  { label: "Contact", href: "https://securepathdigital.net/#contact" },
];

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  // /guides/ is now a route in this app rather than a separate hand-written
  // page, so the active tab is derived instead of hardcoded to "Practice" —
  // otherwise Study Materials would never light up. Off-site links never match.
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
        <a
          href="/"
          className="flex items-center gap-3.5 text-primary hover:text-accent transition-colors"
          aria-label="Secure Path Digital"
        >
          <VaultLockup />
        </a>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center">
          <nav className="flex items-center gap-7">
            {navLinks.map((link) =>
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
            {navLinks.map((link) =>
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
