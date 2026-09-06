import Link from "next/link";

/**
 * Custom 404.
 *
 * Not cosmetic: without this file Next renders its BUILT-IN not-found page,
 * which ships its own stylesheet and sets a white body background. Against the
 * Vault Steel palette that produced #ECEEF2 header text on #FFFFFF — a contrast
 * ratio of 1.16:1, i.e. invisible. Defining the page ourselves means the app's
 * own stylesheet is the only one in play.
 */
export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-6">
      <div className="max-w-xl text-center space-y-6">
        <p className="vault-label justify-center">Error 404</p>
        <h1 className="font-display uppercase text-2xl sm:text-3xl font-normal text-primary">
          Page <span className="grad-copper">not found</span>
        </h1>
        <p className="text-muted-foreground leading-relaxed">
          That address doesn&rsquo;t exist here. It may have moved, or the link
          that brought you might be out of date.
        </p>
        <div className="flex flex-wrap gap-3 justify-center pt-2">
          <Link
            href="/"
            className="inline-flex items-center rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground transition hover:brightness-110"
          >
            Back to CISSP Prep
          </Link>
          <Link
            href="/practice/"
            className="inline-flex items-center rounded-md border border-border/40 px-5 py-2.5 text-sm font-semibold text-foreground transition hover:border-accent hover:text-accent"
          >
            Study materials
          </Link>
        </div>
      </div>
    </div>
  );
}
