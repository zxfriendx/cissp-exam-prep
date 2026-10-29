/**
 * The site header: one component, one stylesheet, the same bar as the apex.
 *
 * The apex (securepathdigital.net) renders the same header from
 * securepathdigital-site/scripts/sync_header.py. When that file is reachable
 * (SPD_SITE, or the sibling checkout ../securepathdigital-site) this also checks
 * the two copies have not drifted: same links in the same order, same CSS.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

const CANONICAL = [
  ['Free Practice Test', 'https://learn.securepathdigital.net/practice/'],
  ['Study Materials', 'https://learn.securepathdigital.net/'],
  ['Free Revision Sheets', 'https://securepathdigital.net/cissp-revision-sheets/'],
  ['FAQ', 'https://securepathdigital.net/cissp-faq/'],
  ['About', 'https://securepathdigital.net/about/'],
  ['Contact', 'https://securepathdigital.net/#contact'],
];

function sharedNav() {
  const src = read('src/components/header.tsx');
  const block = src.slice(src.indexOf('export const SHARED_NAV'), src.indexOf('] as const'));
  const expand = (s) => s.replace('${LEARN}', 'https://learn.securepathdigital.net').replace('${APEX}', 'https://securepathdigital.net');
  return [...block.matchAll(/label: "([^"]+)", href: `([^`]+)`/g)].map(m => [m[1], expand(m[2])]);
}

function walk(dir) {
  return readdirSync(dir).flatMap(f => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

test('the shared nav is the canonical list, in order', () => {
  assert.deepEqual(sharedNav(), CANONICAL);
});

test('one header: only header.tsx renders the bar, only the root layout mounts it', () => {
  const files = walk(join(root, 'src')).filter(p => /\.(tsx|ts)$/.test(p));
  const renders = files.filter(p => /<header className=\{?["'`]?site|className=\{open \? "site/.test(readFileSync(p, 'utf8')));
  assert.deepEqual(renders.map(p => relative(root, p)), ['src/components/header.tsx']);
  const mounts = files.filter(p => /import \{ Header \} from "@\/components\/header"/.test(readFileSync(p, 'utf8')));
  assert.deepEqual(mounts.map(p => relative(root, p)), ['src/app/layout.tsx']);
  assert.match(read('src/app/layout.tsx'), /import "\.\/site-header\.css";/);
});

const site = process.env.SPD_SITE || join(root, '..', 'securepathdigital-site');
const sync = join(site, 'scripts', 'sync_header.py');

test('matches the apex header source', { skip: !existsSync(sync) && `no ${sync}` }, () => {
  const py = readFileSync(sync, 'utf8');
  const nav = py.slice(py.indexOf('NAV = ['), py.indexOf(']\n', py.indexOf('NAV = [')));
  const apex = [...nav.matchAll(/\("([^"]+)", f"\{(LEARN|APEX)\}([^"]*)"\)/g)].map(m =>
    [m[1], (m[2] === 'LEARN' ? 'https://learn.securepathdigital.net' : 'https://securepathdigital.net') + m[3]]);
  assert.deepEqual(apex, sharedNav(), 'NAV in sync_header.py differs from SHARED_NAV');

  // The CSS, minus its opening comment, must be the same text in both repos.
  const body = (s) => s.slice(s.indexOf('*/') + 2, s.indexOf('/* site-header:end */')).trim();
  const apexCss = py.slice(py.indexOf('CSS = """') + 9, py.indexOf('"""', py.indexOf('CSS = """') + 9));
  assert.equal(body(read('src/app/site-header.css')), body(apexCss), 'site-header.css differs from sync_header.py CSS');
});
