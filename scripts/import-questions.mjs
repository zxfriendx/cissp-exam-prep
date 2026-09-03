#!/usr/bin/env node
/**
 * import-questions: bring question banks from the content pipeline into
 * src/data/content.json without hand-editing it.
 *
 *   node scripts/import-questions.mjs --source /data/video/pipeline/_product_audit_2026-08-29/content.rekeyed.json
 *   node scripts/import-questions.mjs --source a.json --source b.json --dry-run
 *   node scripts/import-questions.mjs                 # no sources: restamp the bank in place
 *   node scripts/import-questions.mjs --check         # validate only, exit 1 on drift
 *
 * Sources it understands, by shape (not by path):
 *   - bank-shaped   {domains:[{id, title, questions:[{id, number, question, options, correctAnswer, explanation}]}]}
 *                   (content.rekeyed.json, qrev/out/domain_*.json, this app's own file)
 *   - quiz-shaped   {quizzes:[{domain, domain_name, questions:[{number, question, options, correct_answer, explanation}]}]}
 *                   (reference/cissp/cissp-quiz-questions.json, generated_d4_d5.json)
 *   - a bare array of questions carrying domainId or a domain_N_qM id
 *
 * Rules:
 *   - An item whose id already exists in the bank is a REVISION: its wording
 *     is replaced in place and the id and number are kept. Ids are how the
 *     printed book, saved quizzes and the per-domain stats refer to a question.
 *   - An item with no id, or an unknown id, is NEW unless a question with the
 *     same normalised stem already exists in that domain (then it is skipped
 *     as a duplicate). New items get the next number in the domain.
 *   - Case studies and domain titles belong to the app. They are never read
 *     from a source.
 *   - Every question is stamped with domainId and rev (a content hash), so a
 *     later run can say what changed and the app can tell a stale saved quiz.
 *
 * Zero dependencies. Runs under node >= 20.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const LETTERS = ['A', 'B', 'C', 'D'];
export const SCHEMA = 2;
/** stage-learn.sh refuses a bank whose most common key letter is over 30%. */
export const MAX_KEY_SHARE = 0.30;

/** Lower-case, alphanumerics only, single spaces: "the same stem" for dedupe. */
export function normStem(s) {
    return String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/** Content hash of what a learner sees: stem, options in letter order, key, explanation. */
export function revOf(q) {
    const h = createHash('sha1');
    h.update(JSON.stringify([q.question, LETTERS.map(l => q.options?.[l] ?? ''), q.correctAnswer, q.explanation]));
    return h.digest('hex').slice(0, 12);
}

/** "domain_3_q12" -> "domain_3"; undefined when the id is not in that form. */
export function domainIdOf(id) {
    const m = /^(domain_\d+)_q\d+$/.exec(String(id ?? ''));
    return m ? m[1] : undefined;
}

const asStringList = v => Array.isArray(v) ? v.map(x => String(x).trim()).filter(Boolean) : [];

/**
 * Normalise one raw item from any source into the app's shape (minus id).
 * Returns { item, problems, sourceId }. Any problem means the item is skipped.
 */
export function normaliseItem(raw) {
    const problems = [];
    const question = String(raw?.question ?? raw?.stem ?? '').trim();
    const rawOpts = raw?.options ?? raw?.choices;
    const options = {};
    if (Array.isArray(rawOpts)) {
        if (rawOpts.length !== 4) problems.push(`${rawOpts.length} options, need 4`);
        rawOpts.slice(0, 4).forEach((t, i) => { options[LETTERS[i]] = String(t ?? '').trim(); });
    } else if (rawOpts && typeof rawOpts === 'object') {
        const extra = Object.keys(rawOpts).filter(k => !LETTERS.includes(k));
        if (extra.length) problems.push(`options carry keys other than A-D (${extra.join(', ')})`);
        for (const l of LETTERS) options[l] = String(rawOpts[l] ?? '').trim();
    } else {
        problems.push('no options');
    }
    const correctAnswer = String(raw?.correctAnswer ?? raw?.correct_answer ?? raw?.answer ?? '').trim().toUpperCase().slice(0, 1);
    const explanation = String(raw?.explanation ?? raw?.rationale ?? '').trim();

    if (question.length < 15) problems.push('stem missing or too short');
    for (const l of LETTERS) if (!options[l]) problems.push(`option ${l} empty`);
    if (!LETTERS.includes(correctAnswer)) problems.push(`correct answer ${JSON.stringify(correctAnswer)} is not A-D`);
    if (!explanation) problems.push('explanation empty');
    const texts = LETTERS.map(l => normStem(options[l])).filter(Boolean);
    if (new Set(texts).size < texts.length) problems.push('two options are the same');
    if (raw?.incomplete_question) problems.push('source marks the item incomplete');

    const item = { question, options, correctAnswer, explanation };
    const level = typeof raw?.level === 'string' ? raw.level : typeof raw?._level === 'string' ? raw._level : '';
    if (level) item.level = level.trim();
    const tasks = asStringList(raw?.tasks ?? raw?.blueprint_tasks);
    if (tasks.length) item.tasks = tasks;
    const references = asStringList(raw?.references);
    if (references.length) item.references = references;

    return { item, problems, sourceId: raw?.id != null ? String(raw.id) : undefined };
}

/** Flatten any supported source into [{ domainId, domainTitle, raw }]. */
export function itemsFromSource(data) {
    if (data && Array.isArray(data.domains)) {
        return data.domains.flatMap(d => (d.questions ?? []).map(raw => ({
            domainId: d.id ?? (d.domain != null ? `domain_${d.domain}` : undefined),
            domainTitle: d.title,
            raw,
        })));
    }
    if (data && Array.isArray(data.quizzes)) {
        return data.quizzes.flatMap(qz => (qz.questions ?? []).map(raw => ({
            domainId: qz.domain != null ? `domain_${qz.domain}` : undefined,
            domainTitle: qz.domain_name,
            raw,
        })));
    }
    if (Array.isArray(data)) {
        return data.map(raw => ({
            domainId: raw.domainId ?? domainIdOf(raw.id) ?? (raw.domain != null ? `domain_${raw.domain}` : undefined),
            domainTitle: undefined,
            raw,
        }));
    }
    throw new Error('unrecognised source shape: expected {domains:[...]}, {quizzes:[...]} or an array of questions');
}

const CONTENT_FIELDS = ['question', 'options', 'correctAnswer', 'explanation', 'level', 'tasks', 'references'];
const FIELD_ORDER = ['id', 'number', 'domainId', 'question', 'options', 'correctAnswer', 'explanation', 'level', 'tasks', 'references', 'rev'];

const sameJson = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

function orderFields(q) {
    const out = {};
    for (const k of FIELD_ORDER) if (q[k] !== undefined) out[k] = q[k];
    for (const k of Object.keys(q)) if (!(k in out)) out[k] = q[k];
    return out;
}

function nextNumber(domain) {
    let max = 0;
    for (const q of domain.questions) {
        const n = Number(q.number);
        const m = /_q(\d+)$/.exec(String(q.id ?? ''));
        max = Math.max(max, Number.isFinite(n) ? n : 0, m ? Number(m[1]) : 0);
    }
    return max + 1;
}

function keyShare(questions) {
    const counts = {};
    for (const q of questions) counts[q.correctAnswer] = (counts[q.correctAnswer] ?? 0) + 1;
    const total = questions.length || 1;
    const worst = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return { counts, worstLetter: worst?.[0], worstShare: (worst?.[1] ?? 0) / total };
}

/**
 * Merge sources into a copy of `bank`. Pure: returns { bank, report }.
 *   sources: [{ path, data }]
 *   opts:    { edition, createDomains }
 */
export function importQuestions(bank, sources, opts = {}) {
    const out = structuredClone(bank ?? {});
    out.domains = Array.isArray(out.domains) ? out.domains : [];
    for (const d of out.domains) d.questions = Array.isArray(d.questions) ? d.questions : [];

    const report = { added: [], changed: [], unchanged: 0, skipped: [], warnings: [], sources: [] };
    const byDomain = new Map(out.domains.map(d => [d.id, d]));
    const byId = new Map();
    const byStem = new Map(); // `${domainId}|${normStem}` -> question
    for (const d of out.domains) {
        for (const q of d.questions) {
            byId.set(q.id, { d, q });
            byStem.set(`${d.id}|${normStem(q.question)}`, q);
        }
    }
    const seenInRun = new Set();

    for (const src of sources) {
        const srcReport = { path: src.path, items: 0, added: 0, changed: 0, unchanged: 0, skipped: 0 };
        for (const { domainId, domainTitle, raw } of itemsFromSource(src.data)) {
            srcReport.items += 1;
            const label = raw?.id ?? `${basename(src.path)}#${raw?.number ?? srcReport.items}`;
            const { item, problems, sourceId } = normaliseItem(raw);
            if (!domainId) problems.push('no domain');
            if (problems.length) {
                report.skipped.push({ label, source: src.path, reasons: problems });
                srcReport.skipped += 1;
                continue;
            }

            let dom = byDomain.get(domainId);
            if (!dom) {
                if (!opts.createDomains) {
                    report.skipped.push({ label, source: src.path, reasons: [`unknown domain ${domainId} (pass --create-domains to add it)`] });
                    srcReport.skipped += 1;
                    continue;
                }
                dom = { id: domainId, title: domainTitle ?? domainId, caseStudy: '', questions: [] };
                out.domains.push(dom);
                byDomain.set(domainId, dom);
                report.warnings.push(`created ${domainId} ("${dom.title}") with no case study`);
            }

            const stemKey = `${dom.id}|${normStem(item.question)}`;
            if (seenInRun.has(stemKey)) {
                report.skipped.push({ label, source: src.path, reasons: ['same stem as an earlier item in this run'] });
                srcReport.skipped += 1;
                continue;
            }
            seenInRun.add(stemKey);

            const existing = sourceId ? byId.get(sourceId) : undefined;
            if (existing) {
                if (existing.d.id !== dom.id) {
                    report.skipped.push({ label, source: src.path, reasons: [`id belongs to ${existing.d.id}, source says ${dom.id}`] });
                    srcReport.skipped += 1;
                    continue;
                }
                const fields = CONTENT_FIELDS.filter(k => !sameJson(existing.q[k], item[k]));
                if (fields.length === 0) {
                    report.unchanged += 1;
                    srcReport.unchanged += 1;
                    continue;
                }
                byStem.delete(`${dom.id}|${normStem(existing.q.question)}`);
                for (const k of CONTENT_FIELDS) {
                    if (item[k] === undefined) delete existing.q[k];
                    else existing.q[k] = item[k];
                }
                byStem.set(stemKey, existing.q);
                report.changed.push({ id: existing.q.id, fields });
                srcReport.changed += 1;
                continue;
            }

            const dupe = byStem.get(stemKey);
            if (dupe) {
                report.skipped.push({ label, source: src.path, reasons: [`same stem as ${dupe.id}`] });
                srcReport.skipped += 1;
                continue;
            }

            const n = nextNumber(dom);
            const q = { id: `${dom.id}_q${n}`, number: String(n), ...item };
            dom.questions.push(q);
            byId.set(q.id, { d: dom, q });
            byStem.set(stemKey, q);
            report.added.push({ id: q.id, from: label, source: src.path });
            srcReport.added += 1;
        }
        report.sources.push(srcReport);
    }

    // Stamp every question (schema 2) and fix the field order.
    let restamped = 0;
    for (const d of out.domains) {
        d.questions = d.questions.map(q => {
            const rev = revOf(q);
            if (q.domainId !== d.id || q.rev !== rev) restamped += 1;
            return orderFields({ ...q, domainId: d.id, rev });
        });
    }
    report.restamped = restamped;

    const all = out.domains.flatMap(d => d.questions);
    const { counts, worstLetter, worstShare } = keyShare(all);
    if (worstShare > MAX_KEY_SHARE) {
        report.warnings.push(`answer key skewed: ${worstLetter} is ${(worstShare * 100).toFixed(1)}% of ${all.length} (stage-learn.sh refuses over ${MAX_KEY_SHARE * 100}%)`);
    }

    const byDomainCount = {};
    for (const d of out.domains) byDomainCount[d.id] = d.questions.length;
    const keyCounts = {};
    for (const l of LETTERS) keyCounts[l] = counts[l] ?? 0;
    const previous = bank?.bank ?? {};
    out.bank = {
        schema: SCHEMA,
        edition: opts.edition ?? previous.edition ?? today(),
        questionCount: all.length,
        byDomain: byDomainCount,
        keyCounts,
        sources: sources.length
            ? sources.map((s, i) => ({ path: s.path, items: report.sources[i].items, added: report.sources[i].added, changed: report.sources[i].changed }))
            : (previous.sources ?? []),
    };
    // The manifest goes first so a reader sees the edition before 800 KB of questions.
    const { bank: manifest, ...rest } = out;
    return { bank: { bank: manifest, ...rest }, report };
}

/**
 * Validate a bank as it sits on disk. Returns a list of problems (empty = ok).
 * Fails on: duplicate ids, an item that would not import, a domainId that
 * disagrees with the domain, a rev that no longer matches the content (edited
 * by hand: run the importer with no sources to restamp), duplicate stems in a
 * domain, a skewed key.
 */
export function checkBank(bank) {
    const problems = [];
    if (!bank || !Array.isArray(bank.domains) || bank.domains.length === 0) return ['no domains'];
    if (bank.bank?.schema !== SCHEMA) problems.push(`bank.schema is ${bank.bank?.schema ?? 'missing'}, expected ${SCHEMA} (run the importer to restamp)`);
    const ids = new Map();
    for (const d of bank.domains) {
        if (!d.id || !d.title) problems.push(`domain without id/title: ${JSON.stringify(d.id ?? d.title)}`);
        if (!String(d.caseStudy ?? '').trim()) problems.push(`${d.id}: empty case study`);
        const stems = new Map();
        for (const q of d.questions ?? []) {
            if (ids.has(q.id)) problems.push(`${q.id}: duplicate id (also in ${ids.get(q.id)})`);
            ids.set(q.id, d.id);
            const { problems: p } = normaliseItem(q);
            for (const x of p) problems.push(`${q.id}: ${x}`);
            if (q.domainId !== d.id) problems.push(`${q.id}: domainId ${JSON.stringify(q.domainId)} is not ${d.id}`);
            if (q.rev !== revOf(q)) problems.push(`${q.id}: rev ${q.rev ?? 'missing'} does not match the content (edited by hand? restamp)`);
            const key = normStem(q.question);
            if (stems.has(key)) problems.push(`${q.id}: same stem as ${stems.get(key)}`);
            stems.set(key, q.id);
        }
    }
    const all = bank.domains.flatMap(d => d.questions ?? []);
    if (bank.bank && bank.bank.questionCount !== all.length) problems.push(`bank.questionCount ${bank.bank.questionCount} != ${all.length}`);
    const { worstLetter, worstShare } = keyShare(all);
    if (worstShare > MAX_KEY_SHARE) problems.push(`answer key skewed: ${worstLetter} is ${(worstShare * 100).toFixed(1)}%`);
    return problems;
}

function today() {
    return new Date().toISOString().slice(0, 10);
}

/** Serialise the way the pipeline does (1-space indent), so diffs stay readable. */
export function serialiseBank(bank) {
    return JSON.stringify(bank, null, 1) + '\n';
}

// ---------------------------------------------------------------- CLI ----

function parseArgs(argv) {
    const args = { sources: [], dryRun: false, check: false, createDomains: false };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        const next = () => { if (i + 1 >= argv.length) throw new Error(`${a} needs a value`); return argv[++i]; };
        if (a === '--source' || a === '-s') args.sources.push(next());
        else if (a === '--bank') args.bank = next();
        else if (a === '--edition') args.edition = next();
        else if (a === '--report') args.report = next();
        else if (a === '--dry-run') args.dryRun = true;
        else if (a === '--check') args.check = true;
        else if (a === '--create-domains') args.createDomains = true;
        else if (a === '--help' || a === '-h') args.help = true;
        else throw new Error(`unknown argument ${a}`);
    }
    return args;
}

function printReport(report, bank) {
    const pad = (s, n) => String(s).padEnd(n);
    console.log('');
    if (report.sources.length) {
        console.log(`  ${pad('source', 72)} ${pad('items', 6)} ${pad('added', 6)} ${pad('changed', 8)} ${pad('same', 6)} skipped`);
        for (const s of report.sources) {
            const p = s.path.length > 70 ? '…' + s.path.slice(-69) : s.path;
            console.log(`  ${pad(p, 72)} ${pad(s.items, 6)} ${pad(s.added, 6)} ${pad(s.changed, 8)} ${pad(s.unchanged, 6)} ${s.skipped}`);
        }
    }
    for (const c of report.changed.slice(0, 20)) console.log(`  changed  ${c.id}: ${c.fields.join(', ')}`);
    if (report.changed.length > 20) console.log(`  … ${report.changed.length - 20} more changed`);
    for (const a of report.added.slice(0, 20)) console.log(`  added    ${a.id}  <- ${a.from}`);
    if (report.added.length > 20) console.log(`  … ${report.added.length - 20} more added`);
    for (const s of report.skipped.slice(0, 40)) console.log(`  skipped  ${s.label}: ${s.reasons.join('; ')}`);
    if (report.skipped.length > 40) console.log(`  … ${report.skipped.length - 40} more skipped`);
    for (const w of report.warnings) console.log(`  WARNING  ${w}`);
    const m = bank.bank;
    console.log('');
    console.log(`  bank: edition ${m.edition}, ${m.questionCount} questions, ` +
        Object.entries(m.byDomain).map(([k, v]) => `${k.replace('domain_', 'D')}=${v}`).join(' ') +
        `, keys ${LETTERS.map(l => `${l}:${m.keyCounts[l] ?? 0}`).join(' ')}` +
        (report.restamped ? `, ${report.restamped} restamped` : ''));
}

function main() {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) {
        console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('*/')[0].replace(/^\/\*\*\n/, '').replace(/^ \* ?/gm, ''));
        return 0;
    }
    const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
    const bankPath = resolve(args.bank ?? resolve(repoRoot, 'src/data/content.json'));
    const bank = existsSync(bankPath) ? JSON.parse(readFileSync(bankPath, 'utf8')) : { domains: [] };

    if (args.check) {
        const problems = checkBank(bank);
        if (problems.length) {
            for (const p of problems.slice(0, 60)) console.error(`  FAIL  ${p}`);
            if (problems.length > 60) console.error(`  … ${problems.length - 60} more`);
            console.error(`\n${problems.length} problem(s) in ${bankPath}`);
            return 1;
        }
        const n = bank.domains.reduce((a, d) => a + d.questions.length, 0);
        console.log(`ok: ${bankPath} — schema ${bank.bank?.schema}, edition ${bank.bank?.edition}, ${n} questions, ${bank.domains.length} domains`);
        return 0;
    }

    const sources = args.sources.map(p => {
        const path = resolve(p);
        if (!existsSync(path)) throw new Error(`source not found: ${path}`);
        return { path, data: JSON.parse(readFileSync(path, 'utf8')) };
    });
    const { bank: next, report } = importQuestions(bank, sources, { edition: args.edition, createDomains: args.createDomains });
    printReport(report, next);

    if (args.report) writeFileSync(resolve(args.report), JSON.stringify(report, null, 2) + '\n');
    const problems = checkBank(next);
    if (problems.length) {
        for (const p of problems.slice(0, 40)) console.error(`  FAIL  ${p}`);
        console.error(`\nrefusing to write: ${problems.length} problem(s) in the merged bank`);
        return 1;
    }
    if (args.dryRun) {
        console.log(`\ndry run: ${bankPath} not written`);
        return 0;
    }
    writeFileSync(bankPath, serialiseBank(next));
    console.log(`\nwrote ${bankPath}`);
    return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    try {
        process.exitCode = main();
    } catch (e) {
        console.error(`import-questions: ${e.message}`);
        process.exitCode = 2;
    }
}
