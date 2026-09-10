#!/usr/bin/env node
/**
 * Generate out/sw.js from src/pwa/sw.template.js after the static export.
 *
 * Wired as `postbuild`, so it cannot be forgotten: a service worker whose
 * precache list describes the *previous* build is worse than no service worker
 * at all, because it pins visitors to stale chunks that the next deploy has
 * already deleted from the origin.
 *
 * WHY THE LIST IS READ OFF DISK AND NOT WRITTEN BY HAND
 * ----------------------------------------------------
 * Every URL in the precache list is a promise that a file is there to fetch. A
 * hand-maintained list is a list of promises that were true once. This walks
 * out/ and states what is actually in it, so the list cannot describe a route
 * that was renamed or a chunk that was split.
 *
 * WHAT IS DELIBERATELY LEFT OUT
 * -----------------------------
 *   *.map            source maps. Never requested by a browser that is not
 *                    showing devtools, and they are the largest files in out/.
 *   *.txt            the RSC payloads the client router prefetches. 179 files
 *                    and 776 KB in the current export, against 24 HTML files.
 *                    Leaving them out costs a soft navigation offline, not the
 *                    navigation itself: Next falls back to a full page load
 *                    when an RSC fetch fails, and the page it then loads is
 *                    precached.
 *   anything remote  there is nothing remote to precache. next/font self-hosts
 *                    Krona One and Schibsted Grotesk into _next/static/media,
 *                    so the app makes no cross-origin request for a font. If a
 *                    remote URL ever appears in this list something has gone
 *                    badly wrong -- see the assertion below, and the header of
 *                    src/pwa/sw.template.js for why it matters.
 *
 * Usage:  node scripts/build-sw.mjs [outDir]
 */

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, posix, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
export const TEMPLATE_PATH = join(repoRoot, 'src', 'pwa', 'sw.template.js');
export const MANIFEST_SOURCE = join(repoRoot, 'src', 'pwa', 'manifest.json');

/** Emitted by the metadata route src/app/manifest.ts; re-created here if it was not. */
const MANIFEST_FILE = 'manifest.webmanifest';

/** Walk a directory, yielding paths relative to it, in POSIX form. */
function walk(root, current = root, found = []) {
    for (const name of readdirSync(current).sort()) {
        const full = join(current, name);
        if (statSync(full).isDirectory()) walk(root, full, found);
        else found.push(relative(root, full).split(sep).join(posix.sep));
    }
    return found;
}

/**
 * The URL a browser will actually request for an exported HTML file.
 *
 * Two export shapes reach this. `trailingSlash: true` -- which is what the
 * Bluehost deployment builds with, because Apache has no MultiViews -- emits
 * practice/index.html and the browser asks for /practice/. A plain build emits
 * practice.html and the browser asks for /practice.html. Precaching the file
 * path instead of the request URL would produce a cache full of entries that
 * are never hit, and an app that looks precached and works offline for nothing.
 */
export function urlForHtml(relPath) {
    if (relPath === 'index.html') return '/';
    if (relPath.endsWith('/index.html')) return '/' + relPath.slice(0, -'index.html'.length);
    return '/' + relPath;
}

function shouldPrecache(relPath) {
    if (relPath === 'sw.js' || relPath === '.htaccess') return false;
    if (relPath.endsWith('.map')) return false;
    if (relPath.endsWith('.html')) return true;
    if (relPath.startsWith('_next/static/')) return true;
    if (relPath === MANIFEST_FILE) return true;
    if (relPath === 'favicon.ico') return true;
    if (relPath.startsWith('icons/')) return true;
    return false;
}

/**
 * The precache list for an export directory: `[{ url, file }]`, sorted by url.
 *
 * Sorted so the version hash depends on the content of out/ and not on the
 * order the filesystem happened to hand the entries back.
 */
export function collectPrecache(outDir) {
    const entries = walk(outDir)
        .filter(shouldPrecache)
        .map((relPath) => ({
            url: relPath.endsWith('.html') ? urlForHtml(relPath) : '/' + relPath,
            file: join(outDir, relPath.split(posix.sep).join(sep)),
        }));
    entries.sort((a, b) => (a.url < b.url ? -1 : a.url > b.url ? 1 : 0));
    return entries;
}

/**
 * A hash of what the worker will serve, not of when it was built.
 *
 * Content-derived so that rebuilding an unchanged tree produces an identical
 * sw.js: the browser byte-compares the worker it has against the one it
 * fetches, and a timestamp in here would make every deploy look like a new
 * worker and throw away a warm cache for nothing. The template is folded in as
 * well, because a change to the fetch strategy is a change to the worker even
 * when out/ is untouched.
 */
export function versionHash(entries, template) {
    const digest = createHash('sha256');
    digest.update(createHash('sha256').update(template).digest('hex'));
    for (const { url, file } of entries) {
        digest.update('\0');
        digest.update(url);
        digest.update('\0');
        digest.update(createHash('sha256').update(readFileSync(file)).digest('hex'));
    }
    return digest.digest('hex').slice(0, 12);
}

/**
 * The URL a navigation falls back to when it misses both network and cache.
 *
 * Derived rather than hard-coded because /practice/ only exists under
 * trailingSlash; a plain build spells the same page /practice.html. A shell
 * that is not in the precache list is a 504 for every unknown deep link.
 */
export function shellUrl(urls) {
    for (const candidate of ['/practice/', '/practice.html', '/']) {
        if (urls.includes(candidate)) return candidate;
    }
    return urls[0];
}

export function renderServiceWorker(template, version, urls) {
    const remote = urls.filter((url) => !url.startsWith('/') || url.startsWith('//'));
    if (remote.length) {
        throw new Error(
            `precache list contains ${remote.length} non-origin-relative URL(s), ` +
            `e.g. ${remote[0]} -- the worker must never cache another origin`,
        );
    }
    // replaceAll, not replace: a placeholder that also appeared in the
    // template's prose would otherwise absorb the substitution and leave the
    // real one in the shipped worker.
    return template
        .replaceAll('__SW_VERSION__', version)
        .replaceAll('__SW_PRECACHE__', JSON.stringify(urls, null, 4))
        .replaceAll("'__SW_SHELL__'", JSON.stringify(shellUrl(urls)));
}

/**
 * Make sure out/manifest.webmanifest exists, writing it from src/pwa if not.
 *
 * src/app/manifest.ts should have produced it: Next 16 prerenders metadata
 * routes even where static generation is otherwise off, and the exporter copies
 * an app-route handler's body straight to out/<route>. But an installed PWA
 * keeps whatever manifest it was installed with, so "the metadata route quietly
 * stopped emitting" is a failure that only shows up on devices nobody here
 * owns. Cheaper to guarantee the file than to trust the build step.
 */
export function ensureManifest(outDir) {
    const target = join(outDir, MANIFEST_FILE);
    if (existsSync(target)) return { written: false };
    writeFileSync(target, readFileSync(MANIFEST_SOURCE));
    console.warn(
        `[build-sw] WARNING: the export had no ${MANIFEST_FILE} -- src/app/manifest.ts did ` +
        `not emit. Wrote it from ${relative(repoRoot, MANIFEST_SOURCE)} instead; find out why.`,
    );
    return { written: true };
}

export function buildServiceWorker(outDir) {
    if (!existsSync(join(outDir, 'index.html'))) {
        throw new Error(`${outDir} does not look like a Next export: no index.html`);
    }
    const manifest = ensureManifest(outDir);
    const template = readFileSync(TEMPLATE_PATH, 'utf8');
    const entries = collectPrecache(outDir);
    const urls = entries.map((entry) => entry.url);
    const version = versionHash(entries, template);
    const source = renderServiceWorker(template, version, urls);
    writeFileSync(join(outDir, 'sw.js'), source);
    return { version, urls, bytes: entries.reduce((n, e) => n + statSync(e.file).size, 0), manifest };
}

if (import.meta.url === `file://${process.argv[1]}`) {
    const outDir = process.argv[2] ? resolve(process.argv[2]) : join(repoRoot, 'out');
    const { version, urls, bytes } = buildServiceWorker(outDir);
    const mb = (bytes / 1024 / 1024).toFixed(2);
    console.log(`[build-sw] out/sw.js  version ${version}  ${urls.length} precached  ${mb} MB`);
}
