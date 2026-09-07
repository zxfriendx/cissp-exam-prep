# unlock service

Verifies a Gumroad licence key and serves the paid CISSP question bank — 750
questions and 133 scenarios, the cut `scripts/build-paid.mjs` makes out of
`src/data/content.json`. The free app ships 160 of those and never sees the rest.

Zero runtime dependencies: `node:http`, `node:crypto`, `node:zlib` and the global
`fetch`. There is no build step — Node 22 runs the TypeScript directly — and no
`node_modules` in the image.

```
POST /v1/activate   { key }          -> { ok, token, exp, edition, uses, cap }
POST /v1/refresh    { key, token }   -> { ok, token, exp, edition, uses, cap }
GET  /v1/bank       Bearer <token>   -> the bank, gzipped, ETag: "<edition>"
GET  `/v1/health` (and `/healthz` locally)                        -> { ok, edition, items, stimuli, kid }
```

The wire contract — request and response shapes, and every `code` a failure can
carry — is `src/lib/unlock-protocol.ts` in the app, imported here with
`import type`. `src/contract.ts` mirrors its two runtime values and
`test/contract.test.ts` fails if the two ever drift.

## The rule that matters

Gumroad's `decrement_uses_count` needs an OAuth token; `verify` does not. **An
increment cannot be undone.** So an activation calls verify twice:

1. `increment_uses_count=false` — read `uses`.
2. If `uses < DEVICE_CAP`, call again with `increment_uses_count=true`.

An over-cap buyer is refused between those two calls and loses nothing. A refresh
calls verify once and never increments, and is not subject to the cap at all: the
activation it re-checks was already paid for, and failing it at the cap would lock
out exactly the people who used every device they bought.

Anything Gumroad answers that is not `success: true` is a rejection, and the raw
body goes in the log. The shape of the rest is deliberately not parsed — the live
API returned `{success:false,error:{code:"not_found",status_code:404}}` where the
published docs promise `{success:false,message:"..."}`.

## Environment

| Variable | Required | Default | What it does |
| --- | --- | --- | --- |
| `UNLOCK_SIGNING_KEYS` | yes | — | `kid:hex,kid:hex`. The **first signs**, all of them verify, so a key can be rotated in front of the old one without logging anyone out. At least 16 bytes of hex each. |
| `GUMROAD_PRODUCT_ID` | yes | — | Sent as `product_id` on every verify. |
| `GUMROAD_API_BASE` | no | `https://api.gumroad.com` | Point at `mock-gumroad.ts` to run without Gumroad. |
| `DEVICE_CAP` | no | `4` | Activations allowed per licence. Judged against Gumroad's `uses`. |
| `UNLOCK_GRANTS` | no | — | `label:key,label:key`. These keys skip Gumroad and get a `src:'grant'` token. Keys must still be licence-shaped. |
| `UNLOCK_DENY` | no | — | Comma list of `sub` **prefixes**, refused at all three endpoints. |
| `ALLOWED_ORIGINS` | no | — | Comma list of exact origins, or `*`. An unlisted origin gets no CORS headers and a 403 on preflight. |
| `PORT` | no | `8080` | |
| `PAID_BANK_PATH` | no | `../data/paid.json` | |
| `UNLOCK_LOG` | no | — | `off` silences the log. |

Tokens are `base64url(payload).base64url(HMAC-SHA256)`, valid 30 days, and
`/v1/refresh` still accepts one for **90 days past `exp`** — a refresh is a
re-check, not a fresh activation, and someone who opened the app after a month
offline should not have to find their licence key again. `/v1/bank` gives no
grace.

The payload holds `sub`, a `sha256` prefix of the key, never the key. That is
what gets logged and what `UNLOCK_DENY` lists, so neither a log nor the denylist
is a file of live licence keys.

## Running it locally

```bash
cd services/unlock
node ../../scripts/build-paid.mjs          # cuts data/paid.json (gitignored, 2.3 MB)

node mock-gumroad.ts &                     # fake Gumroad on 127.0.0.1:9999

UNLOCK_SIGNING_KEYS="k1:$(openssl rand -hex 32)" \
GUMROAD_API_BASE=http://127.0.0.1:9999 \
GUMROAD_PRODUCT_ID=prod_test \
UNLOCK_GRANTS="dev:FEEDFACE-FEEDFACE-FEEDFACE-FEEDFACE" \
ALLOWED_ORIGINS="http://localhost:3000" \
PORT=8787 node src/server.ts
```

```bash
curl -s localhost:8787/healthz
TOKEN=$(curl -s -X POST localhost:8787/v1/activate \
  -d '{"key":"FEEDFACE-FEEDFACE-FEEDFACE-FEEDFACE"}' | jq -r .token)
curl -s -H "Authorization: Bearer $TOKEN" -H 'Accept-Encoding: gzip' \
  localhost:8787/v1/bank --output bank.json.gz     # 671 KB, 2.33 MB inflated
```

### mock-gumroad fixture keys

`LICENCE_KEY_RE` is hex, so the mnemonics are spelled in the letters hex allows.
`uses` is held in memory: an increment shows on the next verify, and a restart
resets every count.

| Key (each group repeated four times) | Gumroad says | Service answers |
| --- | --- | --- |
| `600DBEEF-600DBEEF-600DBEEF-600DBEEF` | a clean sale, `uses` 0 | 200, `uses` climbs by one per activation |
| `EFD00DED-EFD00DED-EFD00DED-EFD00DED` | `purchase.refunded` | 403 `refunded` |
| `C4A46EBA-C4A46EBA-C4A46EBA-C4A46EBA` | `purchase.chargebacked` | 403 `chargebacked` |
| `D15AB1ED-D15AB1ED-D15AB1ED-D15AB1ED` | `purchase.disabled` | 403 `disabled` |
| `A7CA9004-A7CA9004-A7CA9004-A7CA9004` | `uses` 4 — at the default cap | 409 `device_cap`, **no increment** |
| anything else | `{success:false,error:{code:"not_found"}}` | 404 `not_found` |

`MOCK_PORT` moves it off 9999.

## Tests

```bash
cd services/unlock && node --test          # 58 tests, no network, no Gumroad
```

`node --test services/unlock/` from the repo root does **not** work on Node
22.23 — a directory positional is loaded as a module, not searched. Use the glob
from the root instead:

```bash
node --test 'services/unlock/**/*.test.ts'
```

Typecheck (the service has its own tsconfig; the app's excludes `services/`):

```bash
node ../../node_modules/typescript/bin/tsc -p services/unlock/tsconfig.json
```

## Deploy

The build context is the **repo root** — the image cuts its own bank, so
`data/paid.json` is never committed and never shipped alongside.

```bash
docker build -f services/unlock/Dockerfile -t cissp-unlock .
docker run --rm -p 8080:8080 \
  -e UNLOCK_SIGNING_KEYS="k1:$(openssl rand -hex 32)" \
  -e GUMROAD_PRODUCT_ID=... -e ALLOWED_ORIGINS=https://learn.securepathdigital.net \
  cissp-unlock
```

`docker build` reruns `scripts/build-paid.mjs`, so **the edition in the image is
whatever `src/data/content.json` held at build time**. `/healthz` reports it, and
it is the `/v1/bank` ETag; a client holding the previous edition re-downloads on
its next refresh. Check it after every deploy:

```bash
curl -s https://<host>/healthz     # {"ok":true,"edition":"2026-09-06","items":750,...}
```

Rate limits are **in-memory and per instance** — activate 5/min/IP and 3/hour/sub,
refresh 30/min/IP. With max-instances 2 the real ceiling is twice that. This is a
brake on scripted key-guessing, not a licensing control; the thing that actually
stops a shared key is the device cap, which Gumroad counts centrally. Restarting
an instance clears its counters.

## Support commands

**Which `sub` is this buyer?** — to read the logs for one person, or to deny them.

```bash
node -e 'const{createHash}=require("node:crypto");
  console.log(createHash("sha256").update(process.argv[1].trim().toUpperCase()).digest("hex").slice(0,16))' \
  AAAAAAAA-BBBBBBBB-CCCCCCCC-DDDDDDDD
```

Then `UNLOCK_DENY=<that, or a prefix of it>` and redeploy. A denial is checked at
activate, refresh **and** bank, so an already-issued token stops working; it does
not need to expire first.

**What is in a token?** The payload is base64url, not encrypted.

```bash
node -e 'console.log(JSON.parse(Buffer.from(process.argv[1].split(".")[0],"base64url").toString()))' "$TOKEN"
```

**Rotate the signing key** without logging anyone out: put the new one first and
keep the old one second.

```
UNLOCK_SIGNING_KEYS="k2:<new hex>,k1:<old hex>"
```

Every token issued before the change was signed by `k1` and still verifies; every
new one is signed by `k2`. Drop `k1` after 30 days plus the 90-day refresh grace
and the last old token is dead.

**Give someone access without a sale** — a reviewer, a refund the buyer should
keep, a support case:

```
UNLOCK_GRANTS="press:600D0000-600D0000-600D0000-600D0000,refund-1842:<their key>"
```

Grants skip Gumroad entirely, so a grant on a real licence key also gets the buyer
past a `refunded` or `device_cap` verdict.

**A buyer says "too many devices"** — they are at `DEVICE_CAP` and Gumroad counts
activations centrally, so nothing here can reset it. Either raise `DEVICE_CAP`
(it applies to everyone), or add their key to `UNLOCK_GRANTS`.
