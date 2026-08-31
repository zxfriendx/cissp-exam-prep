"use client"

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";

const navLinks = [
  { label: "Practice", href: "/" },
  { label: "Study Guides", href: "https://securepathdigital.net/#guides" },
  { label: "Services", href: "https://securepathdigital.net/#services" },
  { label: "Contact", href: "https://securepathdigital.net/#contact" },
];

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-6">
        <Link
          href="https://securepathdigital.net"
          className="text-lg font-semibold text-primary hover:text-accent transition-colors"
        >
          Secure Path Digital
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          <nav className="flex items-center gap-8">
            {navLinks.map((link) => {
              const isInternal = link.href === "/";
              const isCurrent = link.label === "CISSP Prep";
              const className = `text-sm font-medium transition-colors ${
                isCurrent
                  ? "text-accent"
                  : "text-foreground hover:text-accent"
              }`;
              return isInternal ? (
                <Link key={link.label} href={link.href} className={className}>
                  {link.label}
                </Link>
              ) : (
                <a key={link.label} href={link.href} className={className}>
                  {link.label}
                </a>
              );
            })}
          </nav>
          <ModeToggle />
        </div>

        {/* Mobile controls */}
        <div className="flex items-center gap-2 md:hidden">
          <ModeToggle />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <nav className="md:hidden border-t border-border bg-background px-6 py-4">
          <div className="flex flex-col gap-4">
            {navLinks.map((link) => {
              const isInternal = link.href === "/";
              const isCurrent = link.label === "CISSP Prep";
              const className = `text-lg font-medium transition-colors ${
                isCurrent
                  ? "text-accent"
                  : "text-foreground hover:text-accent"
              }`;
              return isInternal ? (
                <Link
                  key={link.label}
                  href={link.href}
                  className={className}
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </Link>
              ) : (
                <a
                  key={link.label}
                  href={link.href}
                  className={className}
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </a>
              );
            })}
          </div>
        </nav>
      )}
    </header>
  );
}
