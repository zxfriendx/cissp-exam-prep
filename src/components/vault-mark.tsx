/**
 * Vault Steel's vault-dial mark.
 *
 * Traced from securepathdigital-site/brand/kit-vault-steel.html. The copper
 * index line at 12 o'clock is deliberate and is the only coloured stroke.
 *
 * This lives in its own module because the Header and the Footer both draw it.
 * It previously existed as a second copy inside header.tsx, alongside further
 * copies inlined as an SVG <symbol> in each hand-written page — which is how
 * the surfaces drifted apart in the first place. One mark, one file.
 */
export function VaultMark({ className = "" }: { className?: string }) {
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

/**
 * The wordmark lock-up: mark + "SECURE PATH / DIGITAL".
 *
 * Header and Footer render the identical lock-up, so its metrics live here too.
 * These sizes are pinned by tools/qa/header_consistency.py in the site repo.
 */
export function VaultLockup({ markClass = "h-[38px] w-[38px]" }: { markClass?: string }) {
  return (
    <>
      <VaultMark className={`${markClass} shrink-0 text-muted-foreground`} />
      <span className="font-display text-[0.78rem] leading-[1.5] tracking-[0.14em]">
        SECURE PATH
        <span className="block text-[0.6rem] tracking-[0.42em] text-muted-foreground">
          DIGITAL
        </span>
      </span>
    </>
  );
}
