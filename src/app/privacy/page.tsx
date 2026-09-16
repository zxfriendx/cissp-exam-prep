import type { Metadata } from "next";

/* The privacy policy lives in ONE place, securepathdigital.net/privacy/, and
   covers both properties and the app. This route exists so that
   learn.securepathdigital.net/privacy/ is a real address rather than a 404,
   and it sends the reader to the one copy. Same mechanism as /guides/: static
   export has no server, so a meta refresh, a client-side replace, and a real
   link for anyone with scripts off. */
const PRIVACY_URL = "https://securepathdigital.net/privacy/";

export const metadata: Metadata = {
  title: "Privacy — Secure Path Digital",
  description: "What securepathdigital.net, learn.securepathdigital.net and the CISSP practice app collect, where it goes, and how to stop it.",
  alternates: { canonical: PRIVACY_URL },
  robots: { index: false, follow: true },
};

export default function PrivacyRedirect() {
  return (
    <main style={{ padding: "6rem 1.5rem", textAlign: "center" }}>
      {/* Not in `metadata.other`: Next renders that as <meta name="refresh">,
          which is inert. The pragma is honored wherever it sits in the DOM. */}
      <meta httpEquiv="refresh" content={`0; url=${PRIVACY_URL}`} />
      <script
        dangerouslySetInnerHTML={{
          __html: `window.location.replace(${JSON.stringify(PRIVACY_URL)});`,
        }}
      />
      <p style={{ marginBottom: "1rem" }}>The privacy policy for both sites is on securepathdigital.net.</p>
      <a href={PRIVACY_URL} style={{ textDecoration: "underline" }}>
        Read the privacy policy &rarr;
      </a>
    </main>
  );
}
