/**
 * The Eight Domains service worker — TEMPLATE.
 *
 * scripts/build-sw.mjs fills in the version, the precache list and the shell
 * URL, and writes the result to out/sw.js. Do not ship this file as-is: with
 * the placeholders still in it the worker throws on install and never
 * activates. (Do not name the placeholder tokens in prose anywhere in this
 * file: the substitution is a global string replace, so a mention in a comment
 * gets the whole precache array pasted into it.)
 *
 * ── THE ONE RULE ──────────────────────────────────────────────────────────
 * This worker NEVER writes to a cache at runtime. The install-time precache is
 * the only thing that ever puts a response on disk, and that list is generated
 * from files that exist in out/.
 *
 * That is not tidiness, it is the whole safety argument. The paid 750-question
 * examination is deliberately absent from the export — an unlocked buyer's
 * browser fetches it at runtime from a separate origin (the Cloud Run unlock
 * service). A worker that opportunistically cached what it saw would write that
 * bank to disk on any device that ever touched it, behind the unlock check and
 * out of reach of anything the unlock service can revoke. So cross-origin
 * requests are not merely left out of the cache: they are not intercepted at
 * all. `fetch` returns without calling respondWith() and the browser issues the
 * request exactly as if no worker were installed.
 *
 * ── STRATEGIES ────────────────────────────────────────────────────────────
 *   /_next/static/…   cache-first. The filenames carry a content hash, so a
 *                     hit is always the right bytes and a miss is a new build.
 *   navigations       network-first, falling back to the precached page, then
 *                     to the app shell. Network-first because the HTML is
 *                     rewritten by every deploy and a stale shell would pin a
 *                     visitor to the previous build until the cache turned over.
 *   everything else   same-origin: network, falling back to the precache.
 *                     cross-origin: not touched.
 */

const VERSION = '__SW_VERSION__';
const CACHE = `eight-domains-${VERSION}`;

/** Built from out/ at build time. Origin-relative, every one of them. */
const PRECACHE = __SW_PRECACHE__;

/**
 * The page served when a navigation misses both network and cache — a deep link
 * to a route that did not exist when this worker was installed.
 *
 * Substituted, not hard-coded: the practice route is /practice/ in the
 * trailingSlash build that Bluehost gets and /practice.html in a plain one, and
 * a shell that is not in PRECACHE is a 504 for every unknown deep link.
 */
const SHELL = '__SW_SHELL__';

self.addEventListener('install', (event) => {
    event.waitUntil(
        (async () => {
            const cache = await caches.open(CACHE);
            // In batches: 250-odd parallel requests on a phone on mobile data is
            // how an install times out. cache.addAll is also all-or-nothing, so a
            // single 404 in a batch would abort the whole precache — batching at
            // least keeps that blast radius to the batch, and the request below
            // is `reload` so an install can never seed the cache from the HTTP
            // cache's copy of the previous build.
            for (let i = 0; i < PRECACHE.length; i += 24) {
                const batch = PRECACHE.slice(i, i + 24);
                await Promise.all(
                    batch.map((url) =>
                        cache.add(new Request(url, { cache: 'reload' })).catch((err) => {
                            console.warn('[sw] precache miss', url, err);
                        }),
                    ),
                );
            }
        })(),
    );
    // The app has no cross-tab state that a mid-session worker swap can corrupt
    // — quiz progress lives in IndexedDB, written per answer — so taking over
    // immediately is worth more than waiting for every tab to close.
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        (async () => {
            const names = await caches.keys();
            await Promise.all(
                names
                    .filter((name) => name.startsWith('eight-domains-') && name !== CACHE)
                    .map((name) => caches.delete(name)),
            );
            await self.clients.claim();
        })(),
    );
});

/** Cache keys are stored as the URL the browser will ask for, ignoring search. */
function cacheKeyFor(url) {
    return url.origin + url.pathname;
}

async function fromCache(key) {
    const cache = await caches.open(CACHE);
    return cache.match(key, { ignoreSearch: true });
}

async function networkFirst(request, key, fallbacks) {
    try {
        return await fetch(request);
    } catch {
        for (const candidate of [key, ...fallbacks]) {
            const hit = await fromCache(candidate);
            if (hit) return hit;
        }
        return new Response('Offline, and this page was not saved for offline use.', {
            status: 504,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
    }
}

self.addEventListener('fetch', (event) => {
    const request = event.request;

    // Not GET: a POST to the unlock service must reach it, and there is nothing
    // a cache could usefully do with one anyway.
    if (request.method !== 'GET') return;

    const url = new URL(request.url);

    // CROSS-ORIGIN: hands off entirely. See the header — this is the paid bank.
    if (url.origin !== self.location.origin) return;

    // Hashed build output. Immutable by construction, so a hit is authoritative
    // and there is no revalidation to do.
    if (url.pathname.startsWith('/_next/static/')) {
        event.respondWith(
            (async () => {
                const hit = await fromCache(cacheKeyFor(url));
                return hit || fetch(request);
            })(),
        );
        return;
    }

    if (request.mode === 'navigate') {
        // A trailing-slash URL and its directory index are the same page, and
        // which one the router asks for depends on how the visitor arrived, so
        // both spellings fall back to the same cached entry.
        const withSlash = url.pathname.endsWith('/') ? url.pathname : url.pathname + '/';
        event.respondWith(
            networkFirst(request, cacheKeyFor(url), [
                url.origin + withSlash,
                url.origin + SHELL,
            ]),
        );
        return;
    }

    event.respondWith(networkFirst(request, cacheKeyFor(url), []));
});
