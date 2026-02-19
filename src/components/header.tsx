"use client"

import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";

const navLinks = [
  { label: "Featured Work", href: "https://portfolio.atmavailability.com/#featured-work" },
  { label: "Pelotonia", href: "https://portfolio.atmavailability.com/#pelotonia" },
  { label: "CISSP Prep", href: "/" },
  { label: "Blog", href: "https://atmavailability.com/blog/" },
  { label: "Contact", href: "https://portfolio.atmavailability.com/#contact" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-primary/10 bg-background/95 backdrop-blur-sm">
      <div className="container max-w-7xl mx-auto flex h-16 items-center justify-between px-6 sm:px-10">
        <Link
          href="https://portfolio.atmavailability.com"
          className="text-lg font-semibold text-primary hover:text-secondary transition-colors"
        >
          William Friend
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => {
            const isInternal = link.href === "/";
            const isCurrent = link.label === "CISSP Prep";
            return isInternal ? (
              <Link
                key={link.label}
                href={link.href}
                className={`text-sm font-medium transition-colors ${
                  isCurrent
                    ? "text-secondary"
                    : "text-foreground hover:text-secondary"
                }`}
              >
                {link.label}
              </Link>
            ) : (
              <a
                key={link.label}
                href={link.href}
                className="text-sm font-medium text-foreground hover:text-secondary transition-colors"
              >
                {link.label}
              </a>
            );
          })}
          <ModeToggle />
        </nav>
      </div>
    </header>
  );
}
