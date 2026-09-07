import Link from "next/link";
import { VaultLockup } from "@/components/vault-mark";

/**
 * The Vault Steel site footer.
 *
 * This replaces the app's old two-line "Built by Secure Path Digital" bar. That
 * bar was a different footer from the one the /guides/ page carried, so moving
 * between Practice and Study Materials swapped the whole footer out — the same
 * fault the header had, and a larger one. Both routes now render this.
 *
 * Styling lives in globals.css under .vault-footer so the main site can adopt
 * the identical rules; the container matches the Header's 1280/24 measure.
 */
export function Footer() {
  return (
    <footer className="vault-footer">
      <div className="mx-auto max-w-[1280px] px-6">
        <div className="foot-grid">
          <div>
            <Link
              href="/"
              className="flex items-center gap-3.5 text-primary hover:text-accent transition-colors"
              aria-label="Secure Path Digital"
            >
              <VaultLockup />
            </Link>
            <p className="foot-tag">
              Bank-grade security for growing businesses. Fractional CISO &amp; cybersecurity
              advisory for regulated firms.
            </p>
          </div>

          <div className="foot-col">
            <h4>Study</h4>
            <ul>
              <li><Link href="/">Study materials</Link></li>
              <li><Link href="/practice/">Free practice test</Link></li>
            </ul>
          </div>

          <div className="foot-col">
            <h4>Contact</h4>
            <ul>
              <li><p>Columbus, Ohio</p></li>
              <li><a href="tel:+16148878772">(614) 887-8772</a></li>
              <li><a href="https://securepathdigital.net">securepathdigital.net</a></li>
            </ul>
          </div>
        </div>

        <div className="machined" aria-hidden="true">
          <span className="bolt b1" />
          <span className="bolt b2" />
          <span className="bolt b3" />
        </div>

        <div className="foot-legal">
          <p>© 2026 Secure Path Digital LLC</p>
          <p className="tm">
            CISSP® and ISC2® are registered trademarks of International Information System
            Security Certification Consortium, Inc. This publication is independent, unofficial,
            and is not endorsed by, affiliated with, sponsored by, or approved by ISC2, and it
            reproduces no exam content.
          </p>
        </div>
      </div>
    </footer>
  );
}
