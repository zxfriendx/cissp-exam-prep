/**
 * Icon sprite for the /guides/ route, lifted verbatim from the standalone page.
 *
 * Held as a raw string and injected as markup rather than transcribed into JSX:
 * the symbols use hyphenated SVG attributes that JSX renames, and retyping them
 * is exactly the kind of copy that drifts. Injected inline (not referenced as an
 * external file) so `currentColor` still resolves against the page.
 */
export const ICON_SPRITE = `
<symbol id="ic-book" viewBox="0 0 24 24">
      <g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter">
        <path d="M4 4h7a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4Z"/>
        <path d="M20 4h-7a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h7Z"/>
      </g>
      <circle cx="12" cy="4" r="1.7" fill="var(--copper,#C97B3F)"/>
    </symbol>
<symbol id="ic-clipboard" viewBox="0 0 24 24">
      <g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter">
        <rect x="4.5" y="4" width="15" height="17"/>
        <path d="M9 2.5h6v3H9Z"/>
        <path d="M8.5 11h7M8.5 15h4"/>
      </g>
      <circle cx="16.5" cy="15" r="1.7" fill="var(--copper,#C97B3F)"/>
    </symbol>
<symbol id="ic-sheet" viewBox="0 0 24 24">
      <g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter">
        <path d="M5 3h9l5 5v13H5Z"/>
        <path d="M14 3v5h5"/>
        <path d="M8.5 13h7M8.5 17h5"/>
      </g>
      <circle cx="8.5" cy="9" r="1.7" fill="var(--copper,#C97B3F)"/>
    </symbol>
<symbol id="ic-scale" viewBox="0 0 24 24">
      <g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter">
        <path d="M4 7h16M12 4v16M7 20h10"/>
        <path d="M4 7 L2 12 L6 12 Z M20 7 L18 12 L22 12 Z"/>
      </g>
      <circle cx="12" cy="7" r="1.7" fill="var(--copper,#C97B3F)"/>
    </symbol>
<symbol id="ic-source" viewBox="0 0 24 24">
      <g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter">
        <rect x="3.5" y="4" width="17" height="16"/>
        <path d="M3.5 9h17M8 4v16"/>
      </g>
      <circle cx="14.5" cy="14" r="1.7" fill="var(--copper,#C97B3F)"/>
    </symbol>
<symbol id="ic-grid" viewBox="0 0 24 24">
      <g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter">
        <rect x="3.5" y="3.5" width="7" height="7"/>
        <rect x="13.5" y="3.5" width="7" height="7"/>
        <rect x="3.5" y="13.5" width="7" height="7"/>
        <rect x="13.5" y="13.5" width="7" height="7"/>
      </g>
      <circle cx="17" cy="17" r="1.7" fill="var(--copper,#C97B3F)"/>
    </symbol>
<symbol id="ic-shield" viewBox="0 0 24 24">
      <g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter">
        <path d="M12 2.8 L20 5.8 V12 L12 21.2 L4 12 V5.8 Z"/>
      </g>
      <circle cx="12" cy="10.5" r="1.7" fill="var(--copper,#C97B3F)"/>
    </symbol>
`;
