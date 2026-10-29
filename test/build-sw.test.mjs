/**
 * scripts/build-sw.mjs — the precache list and the version hash.
 *
 * These run against fixture export trees written into a temp dir, not against
 * the real out/, because out/ is a build artifact: it is gitignored, it is not
 * there on a clean checkout, and whichever build last ran decides its shape.
 * The two shapes that actually ship are both fixtured here — the plain export
 * and the trailingSlash one that stage-learn.sh builds for Bluehost — since the
 * URL a browser asks for differs between them and precaching the wrong spelling
 * produces a cache that is never hit.
 *
 * What these tests CANNOT reach: the worker's own runtime behaviour. There is
 * no browser harness in this repo, so nothing here exercises install, activate,
 * the fetch strategies or the cross-origin pass-through — those are asserted by
 * reading the template, and only a real browser can confirm them.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
    MANIFEST_SOURCE,
    TEMPLATE_PATH,
    buildServiceWorker,
    collectPrecache,
    ensureManifest,
    renderServiceWorker,
    shellUrl,
    urlForHtml,
    versionHash,
} from '../scripts/build-sw.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const template = readFileSync(TEMPLATE_PATH, 'utf8');

/** Files common to both fixture shapes: hashed chunks, a font, the icons. */
const COMMON = {
    '_next/static/chunks/aaaa1111.js': 'console.log(1)',
    '_next/static/chunks/aaaa1111.js.map': '{"version":3}',
    '_next/static/css/bbbb2222.css': 'body{}',
    '_next/static/media/krona-one.woff2': 'FONTBYTES',
    'favicon.ico': 'ICO',
    'icons/icon-192.png': 'PNG192',
    'icons/icon-512.png': 'PNG512',
    'icons/maskable-512.png': 'PNGMASK',
    'icons/apple-touch-icon.png': 'PNGAPPLE',
    'manifest.webmanifest': '{"name":"The Eight Domains"}',
    'index.txt': 'rsc payload',
};

const PLAIN = {
    ...COMMON,
    'index.html': '<html>root</html>',
    'practice.html': '<html>practice</html>',
    'guides.html': '<html>guides</html>',
    '404.html': '<html>404</html>',
    'quiz/domain_1.html': '<html>d1</html>',
};

const TRAILING_SLASH = {
    ...COMMON,
    'index.html': '<html>root</html>',
    'practice/index.html': '<html>practice</html>',
    'guides/index.html': '<html>guides</html>',
    '404.html': '<html>404</html>',
    '404/index.html': '<html>404</html>',
    'quiz/domain_1/index.html': '<html>d1</html>',
};

function fixture(files) {
    const dir = mkdtempSync(join(tmpdir(), 'sw-fixture-'));
    for (const [relPath, body] of Object.entries(files)) {
        const full = join(dir, relPath);
        mkdirSync(dirname(full), { recursive: true });
        writeFileSync(full, body);
    }
    return dir;
}

const urlsOf = (files) => collectPrecache(fixture(files)).map((e) => e.url);

test('an exported HTML file maps to the URL a browser will ask for', () => {
    assert.equal(urlForHtml('index.html'), '/');
    assert.equal(urlForHtml('practice/index.html'), '/practice/');
    assert.equal(urlForHtml('quiz/domain_1/index.html'), '/quiz/domain_1/');
    assert.equal(urlForHtml('practice.html'), '/practice.html');
    assert.equal(urlForHtml('404.html'), '/404.html');
});

test('the precache list covers every page, chunk, font, icon and the manifest', () => {
    for (const [name, files] of [['plain', PLAIN], ['trailingSlash', TRAILING_SLASH]]) {
        const urls = urlsOf(files);
        const missing = [
            '/',
            '/404.html',
            '/_next/static/chunks/aaaa1111.js',
            '/_next/static/css/bbbb2222.css',
            '/_next/static/media/krona-one.woff2',
            '/favicon.ico',
            '/icons/icon-192.png',
            '/icons/icon-512.png',
            '/icons/maskable-512.png',
            '/icons/apple-touch-icon.png',
            '/manifest.webmanifest',
        ].filter((url) => !urls.includes(url));
        assert.deepEqual(missing, [], `${name}: not precached`);
    }

    assert.ok(urlsOf(PLAIN).includes('/practice.html'), 'plain: the practice page');
    assert.ok(urlsOf(TRAILING_SLASH).includes('/practice/'), 'trailingSlash: the practice page');
    assert.ok(urlsOf(TRAILING_SLASH).includes('/quiz/domain_1/'), 'trailingSlash: a deep route');
});

test('every HTML file in the export is precached — none is silently dropped', () => {
    for (const files of [PLAIN, TRAILING_SLASH]) {
        const pages = Object.keys(files).filter((f) => f.endsWith('.html'));
        const urls = urlsOf(files);
        for (const page of pages) {
            assert.ok(urls.includes(urlForHtml(page)), `${page} is missing from the precache`);
        }
    }
});

test('source maps and RSC payloads stay out of the list', () => {
    const urls = urlsOf(PLAIN);
    assert.ok(!urls.some((u) => u.endsWith('.map')), 'a source map was precached');
    assert.ok(!urls.some((u) => u.endsWith('.txt')), 'an RSC payload was precached');
});

test('no entry names another origin', () => {
    for (const files of [PLAIN, TRAILING_SLASH]) {
        for (const url of urlsOf(files)) {
            assert.ok(url.startsWith('/'), `${url} is not origin-relative`);
            assert.ok(!url.startsWith('//'), `${url} is protocol-relative, so cross-origin`);
            assert.doesNotMatch(url, /^\/[a-z+.-]*:/i, `${url} carries a scheme`);
        }
    }
});

test('a cross-origin URL is refused rather than written into the worker', () => {
    assert.throws(
        () => renderServiceWorker(template, 'deadbeef', ['/', 'https://fonts.gstatic.com/x.woff2']),
        /never cache another origin/,
    );
    assert.throws(
        () => renderServiceWorker(template, 'deadbeef', ['/', '//cdn.example.com/x.js']),
        /never cache another origin/,
    );
});

test('the version hash changes when any precached byte changes', () => {
    const before = collectPrecache(fixture(PLAIN));
    const same = collectPrecache(fixture(PLAIN));
    assert.equal(versionHash(before, template), versionHash(same, template),
        'the same tree must hash the same, or every deploy throws away a warm cache');

    const edited = collectPrecache(fixture({ ...PLAIN, 'practice.html': '<html>practice v2</html>' }));
    assert.notEqual(versionHash(before, template), versionHash(edited, template),
        'an edited page did not change the version');

    const added = collectPrecache(fixture({ ...PLAIN, 'study/domain_1.html': '<html>s1</html>' }));
    assert.notEqual(versionHash(before, template), versionHash(added, template),
        'a new page did not change the version');

    assert.notEqual(versionHash(before, template), versionHash(before, template + '\n// tweak'),
        'a change to the worker itself did not change the version');
});

test('the shell is a page that is really in the list, in either export shape', () => {
    assert.equal(shellUrl(urlsOf(TRAILING_SLASH)), '/practice/');
    assert.equal(shellUrl(urlsOf(PLAIN)), '/practice.html');
    // A build with no practice route at all still gets a shell that exists.
    assert.equal(shellUrl(['/', '/404.html']), '/');
});

test('the generated worker has no placeholder left in it', () => {
    const dir = fixture(TRAILING_SLASH);
    const { version, urls } = buildServiceWorker(dir);
    const sw = readFileSync(join(dir, 'sw.js'), 'utf8');

    assert.doesNotMatch(sw, /__SW_(VERSION|PRECACHE|SHELL)__/, 'an unsubstituted placeholder');
    assert.match(sw, new RegExp(`eight-domains-\\$\\{VERSION\\}`));
    assert.ok(sw.includes(`'${version}'`), 'the version is not in the worker');
    assert.ok(sw.includes('"/practice/"'), 'the shell is not in the worker');
    assert.equal(JSON.parse(sw.match(/const PRECACHE = (\[[\s\S]*?\]);/)[1]).length, urls.length);
    rmSync(dir, { recursive: true, force: true });
});

test('sw.js never precaches itself, however many times the build runs', () => {
    const dir = fixture(TRAILING_SLASH);
    buildServiceWorker(dir);
    const second = buildServiceWorker(dir);
    assert.ok(!second.urls.includes('/sw.js'), 'the worker precached itself');
    rmSync(dir, { recursive: true, force: true });
});

test('a missing manifest is written from src/pwa, and an existing one is left alone', () => {
    const without = fixture(Object.fromEntries(
        Object.entries(TRAILING_SLASH).filter(([f]) => f !== 'manifest.webmanifest'),
    ));
    assert.equal(ensureManifest(without).written, true);
    assert.deepEqual(
        JSON.parse(readFileSync(join(without, 'manifest.webmanifest'), 'utf8')),
        JSON.parse(readFileSync(MANIFEST_SOURCE, 'utf8')),
    );

    const with_ = fixture(TRAILING_SLASH);
    assert.equal(ensureManifest(with_).written, false);
    assert.equal(readFileSync(join(with_, 'manifest.webmanifest'), 'utf8'), '{"name":"The Eight Domains"}');
});

test('the manifest the app ships says what an installed app needs', () => {
    const manifest = JSON.parse(readFileSync(MANIFEST_SOURCE, 'utf8'));
    assert.equal(manifest.name, 'The Eight Domains');
    assert.equal(manifest.start_url, '/practice/');
    assert.equal(manifest.display, 'standalone');
    assert.equal(manifest.theme_color, '#0C0D10');
    assert.equal(manifest.background_color, '#0C0D10');
    // Android crops anything without a maskable icon into a white rounded square.
    assert.ok(manifest.icons.some((i) => i.purpose === 'maskable' && i.sizes === '512x512'));
    assert.ok(manifest.icons.some((i) => i.purpose === 'any' && i.sizes === '192x192'));
    assert.ok(manifest.icons.some((i) => i.purpose === 'any' && i.sizes === '512x512'));
    for (const icon of manifest.icons) {
        assert.ok(icon.src.startsWith('/icons/'), `${icon.src} is not in public/icons`);
        readFileSync(join(repoRoot, 'public', icon.src.replace(/^\//, '')));
    }
});

test('the template hands cross-origin requests back to the browser untouched', () => {
    // The paid 750-question bank is fetched from another origin at runtime. This
    // is a source-level check because there is no browser here to run it in --
    // it catches the edit that adds an `if` above this line, not a subtle bug.
    const guard = template.indexOf('if (url.origin !== self.location.origin) return;');
    assert.ok(guard > 0, 'the cross-origin pass-through is gone');
    assert.ok(
        guard < template.indexOf('event.respondWith'),
        'something calls respondWith before the cross-origin check',
    );
    assert.ok(!/cache\.put\(/.test(template), 'the worker writes to the cache at runtime');
});
