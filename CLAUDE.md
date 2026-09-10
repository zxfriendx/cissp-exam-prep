# cissp-exam-prep

See [README.md](README.md) for the project itself.

## Brand

Brand: **Secure Path Digital — Vault Steel**. Master record: `~/source/securepathdigital-site/brand/kit-vault-steel.html` for tokens, mark and type; the decision and the print rules are `~/source/infrastructure-docs/registry/brands.md` § 3. Edit the master first, then sync the copies
here; never fork a palette into this project. Copies in this repo are derivatives, not
sources: `src/app/globals.css` `--vault-*` tokens (branch `vault-steel-rebrand`). Index of every brand's master record and its known copies:
`~/source/infrastructure-docs/registry/brands.md`.

## What this repo is, in one screen

The **question bank** (`src/data/content.json`) and the **practice app** deployed to
`learn.securepathdigital.net`. The printed books are built in
`~/source/securepathdigital-site`, which reads this bank — **that repo's `CLAUDE.md` is the
one to read for the products, the store and the deploy runbooks.**

- **One file, two populations.** `domains[].questions[]` is the frozen v1 439, kept only as
  provenance for 410 `variantOf` links; gate V0 in the builder holds it at exactly 439.
  `domains[].questionsV2[]` is the 750 the books print, with scenarios in `stimuli[]`.
- ⚠ **Nothing under `src/` may import `content.json`.** An imported JSON module is bundled
  into the client, so importing the bank publishes the paid examination — measured, 4.2 MB
  of chunks with all 590 withheld questions reachable, against 1.8 MB and none. A test
  (`no file under src/ imports the full bank or the paid cut`) enforces it, and
  `stage-learn.sh` re-checks the built export.
- **The app imports `src/data/preview.json`** — 160 questions, 20 per domain, cut by
  `scripts/build-preview.mjs`, which npm runs as `prebuild` so it cannot go stale.
- **`services/unlock/`** is a zero-dependency Node 22 service on Cloud Run that trades a
  Gumroad licence key for a signed token and serves the full 750. Its own README carries
  the runbook. `scripts/build-paid.mjs` cuts the bank it ships; `data/paid.json` is
  gitignored and built inside the image.

### Two Gumroad products, and only one issues keys

| | permalink | price | what it delivers |
|---|---|---|---|
| Books | `eight-domains` | $9.99 | the five PDFs |
| Books + app | `lkidg` | $19.99 | the same five, plus a licence key |

Cloud Run runs with `GUMROAD_PRODUCT_ID=O_wvGHBX4d_MOpvoZafVQw==`, which is `lkidg`. **A
key cannot come from the $9.99 product**, so any "unlock the app" call to action has to
point at `lkidg` or it sells something the buyer will not receive. Both URLs live in
`src/lib/checkout.ts`; the unlock page and the practice upsell both got this wrong until
2026-09-08.

### Bumping the bank

`bank.v2.edition` in `content.json` **is** the `/v1/bank` ETag. Change the content without
changing it and every client that already holds the bank sends `If-None-Match`, takes a
304, and keeps the old text forever. Bump it in the same commit as the content, then
rebuild `preview.json` and `paid.json` and redeploy the service.

### `.env`, not `.env.production`

`NEXT_PUBLIC_UNLOCK_URL` lives in `.env` because `next dev` never reads `.env.production` —
a value only there leaves the dev server with the licence check disabled and the unlock
page correctly saying so, which reads as a bug and is not one. `.gitignore` has `!.env`.

### Copy

Every product number on the storefront is measured from the built PDFs; the commands that
produce each one are in a comment above `FACTS` in `src/app/page.tsx`. Re-measure rather
than copying from a changelog — the page claimed 491 questions while the app served 439,
and 35 diagrams while the book prints 29.
