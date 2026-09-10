#!/usr/bin/env python3
"""
Raster the Vault Steel mark into the PWA icon set under public/icons/.

    python3 src/pwa/make-icons.py

WHY THIS IS A SCRIPT AND NOT A ONE-LINER IN A COMMIT MESSAGE
------------------------------------------------------------
The four PNGs are committed, because this repo has no raster tooling in
package.json and a build that shells out to cairosvg would fail on any machine
that does not happen to have it. Committed binaries rot the moment nobody can
say how they were made, so the recipe lives here, the exact command is stamped
into each PNG's tEXt chunk (read it back with
`python3 -c "from PIL import Image; print(Image.open('public/icons/icon-512.png').text)"`),
and the artwork it consumes is src/pwa/icon-mark.svg, itself a tracing of
src/components/vault-mark.tsx.

WHY THE THREE SIZES ARE NOT ONE FILE SCALED
-------------------------------------------
`maskable` is not a size, it is a different composition. Android crops a
maskable icon to whatever shape the launcher wants and only guarantees the
inner circle of 80% diameter survives, so the mark has to sit smaller inside a
bled ground. An "any" icon is never cropped, so the same padding there would
just look timid. Apple ignores the manifest entirely and takes
apple-touch-icon.png at 180px, masking it with its own squircle -- and it does
not composite over anything, so that file must be opaque.

Requires: python3-cairosvg, python3-pil (both present on this box, neither in
package.json -- see above).
"""

import re
import subprocess
import sys
from pathlib import Path

import cairosvg
from PIL import Image, PngImagePlugin

HERE = Path(__file__).resolve().parent
REPO = HERE.parent.parent
MARK = HERE / "icon-mark.svg"
OUT = REPO / "public" / "icons"

# Vault Steel ground. Same value as --vault-bg in src/app/globals.css.
GROUND = "#0C0D10"

# (filename, pixel size, fraction of the canvas the mark spans)
#
# The mark is essentially a disc, so for `maskable` it survives the 80% safe
# circle at any fraction up to 0.80. 0.60 is chosen well inside that because
# launchers that crop to a *squircle* keep more than the circle, and a mark that
# only just fits reads as if it is about to fall off the edge.
ICONS = [
    ("icon-192.png", 192, 0.76),
    ("icon-512.png", 512, 0.76),
    ("maskable-512.png", 512, 0.60),
    ("apple-touch-icon.png", 180, 0.72),
]

COMMAND = "python3 src/pwa/make-icons.py"


def mark_body() -> str:
    """The contents of icon-mark.svg with its own <svg> wrapper removed."""
    src = MARK.read_text()
    body = re.search(r"<svg[^>]*>(.*)</svg>", src, re.S)
    if not body:
        sys.exit(f"{MARK}: no <svg> element")
    return body.group(1)


def compose(body: str, size: int, fraction: float) -> str:
    span = size * fraction
    offset = (size - span) / 2
    scale = span / 48.0  # icon-mark.svg is authored on a 48-unit grid
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" '
        f'viewBox="0 0 {size} {size}">'
        f'<rect width="{size}" height="{size}" fill="{GROUND}"/>'
        f'<g transform="translate({offset:.4f},{offset:.4f}) scale({scale:.6f})">'
        f"{body}</g></svg>"
    )


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    body = mark_body()
    rev = subprocess.run(
        ["git", "-C", str(REPO), "rev-parse", "--short", "HEAD"],
        capture_output=True, text=True,
    ).stdout.strip() or "unknown"

    for name, size, fraction in ICONS:
        png = cairosvg.svg2png(
            bytestring=compose(body, size, fraction).encode(),
            output_width=size, output_height=size,
        )
        path = OUT / name
        path.write_bytes(png)

        # Stamp the recipe into the file itself. A PNG in a repo with no build
        # step that produces it is otherwise unregenerable folklore.
        img = Image.open(path).convert("RGB")  # no alpha: apple-touch-icon must be opaque
        meta = PngImagePlugin.PngInfo()
        meta.add_text("Software", "cairosvg " + cairosvg.__version__)
        meta.add_text(
            "Comment",
            f"Vault Steel PWA icon. Regenerate: {COMMAND} "
            f"(source src/pwa/icon-mark.svg, mark span {fraction:g} of {size}px, "
            f"ground {GROUND}; generated at cissp-exam-prep {rev})",
        )
        img.save(path, "PNG", pnginfo=meta, optimize=True)
        print(f"    {path.relative_to(REPO)}  {size}x{size}  {path.stat().st_size:,} B")


if __name__ == "__main__":
    main()
