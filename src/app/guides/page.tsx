import type { Metadata } from "next";
import Link from "next/link";

/* /guides/ was the study-materials page until 2026-09-06, when it became the
   site root so that social links land on the offer rather than on the free
   quiz. Real links to /guides/ are already out in the world — the main site,
   the Gumroad listing, anything shared — so this stays as a redirect rather
   than a 404.

   Static export has no server, so the redirect is a meta refresh plus a
   client-side replace, with a real link behind it for anyone who has scripts
   off and ignores the refresh. The canonical points at "/" so search engines
   consolidate on the destination instead of indexing this stub. */
export const metadata: Metadata = {
  title: "Study Materials — Secure Path Digital",
  description: "The Eight Domains CISSP study materials have moved to the site root.",
  alternates: { canonical: "https://learn.securepathdigital.net/" },
  robots: { index: false, follow: true },
  other: { refresh: "0; url=/" },
};

export default function GuidesRedirect() {
  return (
    <main style={{ padding: "6rem 1.5rem", textAlign: "center" }}>
      <script
        dangerouslySetInnerHTML={{
          __html: "window.location.replace('/');",
        }}
      />
      <p style={{ marginBottom: "1rem" }}>The study materials are now on the front page.</p>
      <Link href="/" style={{ textDecoration: "underline" }}>
        Continue to The Eight Domains &rarr;
      </Link>
    </main>
  );
}
