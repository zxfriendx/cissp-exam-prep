"use client"

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const navLinks = [
  { label: "Practice", href: "/" },
  { label: "Study Materials", href: "/guides/" },
  { label: "Services", href: "https://securepathdigital.net/#services" },
  { label: "Contact", href: "https://securepathdigital.net/#contact" },
];

// The "Practice" tab is this app; anything else lives off-site.
const CURRENT = "Practice";

/** Vault Steel's vault-dial mark. Traced from
 *  securepathdigital-site/brand/kit-vault-steel.html — the copper index line at
 *  12 o'clock is deliberate and is the only coloured stroke in the mark. */
function VaultMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true" focusable="false">
      <circle cx="24" cy="24" r="21" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="24" cy="24" r="13.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <g stroke="currentColor" strokeWidth="2">
        <line x1="35.31" y1="12.69" x2="38.14" y2="9.86" />
        <line x1="40" y1="24" x2="44" y2="24" />
        <line x1="35.31" y1="35.31" x2="38.14" y2="38.14" />
        <line x1="24" y1="40" x2="24" y2="44" />
        <line x1="12.69" y1="35.31" x2="9.86" y2="38.14" />
        <line x1="8" y1="24" x2="4" y2="24" />
        <line x1="12.69" y1="12.69" x2="9.86" y2="9.86" />
      </g>
      <line x1="24" y1="8" x2="24" y2="4" stroke="rgb(var(--vault-copper))" strokeWidth="2.5" />
      <g stroke="currentColor" strokeWidth="2.4">
        <line x1="24" y1="19.5" x2="24" y2="10.5" />
        <line x1="27.9" y1="26.25" x2="35.69" y2="30.75" />
        <line x1="20.1" y1="26.25" x2="12.31" y2="30.75" />
      </g>
      <circle cx="24" cy="24" r="4.5" fill="none" stroke="currentColor" strokeWidth="2.4" />
    </svg>
  );
}

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const linkClass = (label: string, size: string) =>
    `${size} font-medium transition-colors ${
      label === CURRENT ? "text-accent" : "text-foreground hover:text-accent"
    }`;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[rgb(var(--vault-line))] bg-[rgb(var(--vault-bg)/0.86)] backdrop-blur-md">
      <div className="mx-auto flex h-[76px] max-w-[1280px] items-center justify-between px-6">
        <a
          href="https://securepathdigital.net"
          className="flex items-center gap-3.5 text-primary hover:text-accent transition-colors"
          aria-label="Secure Path Digital"
        >
          <VaultMark className="h-[38px] w-[38px] shrink-0 text-muted-foreground" />
          <span className="font-display text-[0.78rem] leading-[1.5] tracking-[0.14em]">
            SECURE PATH
            <span className="block text-[0.6rem] tracking-[0.42em] text-muted-foreground">
              DIGITAL
            </span>
          </span>
        </a>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center">
          <nav className="flex items-center gap-7">
            {navLinks.map((link) =>
              link.href.startsWith("/") ? (
                <Link key={link.label} href={link.href} className={linkClass(link.label, "text-[0.92rem]")}>
                  {link.label}
                </Link>
              ) : (
                <a key={link.label} href={link.href} className={linkClass(link.label, "text-[0.92rem]")}>
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
                  className={linkClass(link.label, "text-lg")}
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </Link>
              ) : (
                <a
                  key={link.label}
                  href={link.href}
                  className={linkClass(link.label, "text-lg")}
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
