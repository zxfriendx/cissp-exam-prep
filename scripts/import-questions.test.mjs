import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkBank, importQuestions, itemsFromSource, normStem, normaliseItem, revOf } from './import-questions.mjs';

const q = (n, stem, key = 'A') => ({
    id: `domain_1_q${n}`,
    number: String(n),
    question: stem,
    options: { A: `alpha ${n}`, B: `bravo ${n}`, C: `charlie ${n}`, D: `delta ${n}` },
    correctAnswer: key,
    explanation: `because ${n}`,
});

const bank = () => ({
    domains: [
        { id: 'domain_1', title: 'Security and Risk Management', caseStudy: 'Scenario one.', questions: [q(1, 'Which control stops the phish first?', 'A'), q(2, 'What is the FIRST step after the breach?', 'B')] },
        { id: 'domain_2', title: 'Asset Security', caseStudy: 'Scenario two.', questions: [
            { ...q(1, 'Which classification applies to the drive?', 'C'), id: 'domain_2_q1' },
            { ...q(2, 'Who signs off the disposal of the drive?', 'D'), id: 'domain_2_q2' },
        ] },
    ],
});

test('normaliseItem accepts the pipeline shape and rejects broken items', () => {
    assert.equal(normaliseItem(q(1, 'Which control stops the phish first?')).problems.length, 0);
    const bad = normaliseItem({ question: 'short', options: { A: 'x', B: 'x', C: '', D: 'y', E: 'e' }, correct_answer: 'z', explanation: '', incomplete_question: true });
    assert.ok(bad.problems.some(p => p.includes('too short')));
    assert.ok(bad.problems.some(p => p.includes('option C empty')));
    assert.ok(bad.problems.some(p => p.includes('other than A-D')));
    assert.ok(bad.problems.some(p => p.includes('not A-D')));
    assert.ok(bad.problems.some(p => p.includes('explanation empty')));
    assert.ok(bad.problems.some(p => p.includes('two options are the same')));
    assert.ok(bad.problems.some(p => p.includes('incomplete')));
});

test('quiz-shaped and array sources map to domains', () => {
    const items = itemsFromSource({ quizzes: [{ domain: 4, domain_name: 'Comms', questions: [{ number: 1, question: 'x' }] }] });
    assert.deepEqual(items.map(i => i.domainId), ['domain_4']);
    const arr = itemsFromSource([{ id: 'domain_3_q9' }, { domainId: 'domain_5' }, { domain: 7 }]);
    assert.deepEqual(arr.map(i => i.domainId), ['domain_3', 'domain_5', 'domain_7']);
    assert.throws(() => itemsFromSource({ nope: [] }), /unrecognised/);
});

test('first run on an unstamped bank restamps every question and adds the manifest', () => {
    const { bank: out, report } = importQuestions(bank(), [], { edition: '2026-08-31' });
    assert.equal(report.restamped, 4);
    assert.equal(Object.keys(out)[0], 'bank');
    assert.equal(out.bank.schema, 2);
    assert.equal(out.bank.edition, '2026-08-31');
    assert.equal(out.bank.questionCount, 4);
    assert.deepEqual(out.bank.byDomain, { domain_1: 2, domain_2: 2 });
    assert.deepEqual(out.bank.keyCounts, { A: 1, B: 1, C: 1, D: 1 });
    const first = out.domains[0].questions[0];
    assert.deepEqual(Object.keys(first), ['id', 'number', 'domainId', 'question', 'options', 'correctAnswer', 'explanation', 'rev']);
    assert.equal(first.domainId, 'domain_1');
    assert.equal(first.rev, revOf(first));
    assert.deepEqual(checkBank(out), []);
});

test('a revision keeps ids and numbers, reports the changed fields, and is idempotent', () => {
    const revised = bank();
    revised.domains[0].questions[1].question = 'Which action comes FIRST after the breach is confirmed?';
    revised.domains[0].questions[1].correctAnswer = 'D';
    revised.domains[0].caseStudy = 'A case study the importer must ignore.';
    const { bank: out, report } = importQuestions(bank(), [{ path: 'revised.json', data: revised }]);
    assert.deepEqual(report.changed, [{ id: 'domain_1_q2', fields: ['question', 'correctAnswer'] }]);
    assert.equal(report.unchanged, 3);
    assert.equal(report.added.length, 0);
    assert.equal(out.domains[0].caseStudy, 'Scenario one.');
    assert.equal(out.domains[0].questions[1].number, '2');
    assert.equal(out.domains[0].questions[1].correctAnswer, 'D');
    const again = importQuestions(out, [{ path: 'revised.json', data: revised }]);
    assert.equal(again.report.changed.length, 0);
    assert.equal(again.report.unchanged, 4);
    assert.equal(again.report.restamped, 0);
});

test('new items get the next number; duplicates and broken items are skipped with reasons', () => {
    const src = {
        quizzes: [{
            domain: 1, domain_name: 'Security and Risk Management', questions: [
                { number: 1, question: 'A brand new scenario question about risk appetite?', options: { A: 'one', B: 'two', C: 'three', D: 'four' }, correct_answer: 'b', explanation: 'two wins' },
                { number: 2, question: 'Which control stops the phish FIRST?', options: { A: 'one', B: 'two', C: 'three', D: 'four' }, correct_answer: 'A', explanation: 'dupe of q1 by stem' },
                { number: 3, question: 'A brand new scenario question about risk appetite?', options: { A: 'one', B: 'two', C: 'three', D: 'four' }, correct_answer: 'A', explanation: 'dupe within the run' },
                { number: 4, question: 'Which option is missing its rationale entirely?', options: { A: 'one', B: 'two', C: 'three', D: 'four' }, correct_answer: 'A', explanation: '' },
            ],
        }, {
            domain: 9, domain_name: 'No such domain', questions: [
                { number: 1, question: 'Where does an unknown domain go by default?', options: { A: 'one', B: 'two', C: 'three', D: 'four' }, correct_answer: 'A', explanation: 'skipped' },
            ],
        }],
    };
    const { bank: out, report } = importQuestions(bank(), [{ path: 'quiz.json', data: src }]);
    assert.deepEqual(report.added.map(a => a.id), ['domain_1_q3']);
    assert.equal(out.domains[0].questions[2].number, '3');
    assert.equal(out.domains[0].questions[2].correctAnswer, 'B');
    assert.equal(out.domains[0].questions[2].domainId, 'domain_1');
    const reasons = Object.fromEntries(report.skipped.map(s => [s.label, s.reasons.join('; ')]));
    assert.match(reasons['quiz.json#2'], /same stem as domain_1_q1/);
    assert.match(reasons['quiz.json#3'], /earlier item in this run/);
    assert.match(reasons['quiz.json#4'], /explanation empty/);
    assert.match(reasons['quiz.json#1'], /unknown domain domain_9/);
    assert.equal(out.domains.length, 2);
    const created = importQuestions(bank(), [{ path: 'quiz.json', data: src }], { createDomains: true });
    assert.equal(created.bank.domains.length, 3);
    assert.ok(created.report.warnings.some(w => w.includes('created domain_9')));
});

test('checkBank catches hand edits, duplicate ids and a skewed key', () => {
    const { bank: out } = importQuestions(bank(), []);
    out.domains[0].questions[0].explanation = 'edited by hand';
    out.domains[1].questions[0].id = 'domain_1_q1';
    const problems = checkBank(out);
    assert.ok(problems.some(p => p.includes('domain_1_q1: rev') && p.includes('does not match')));
    assert.ok(problems.some(p => p.includes('duplicate id')));
    const skewed = bank();
    skewed.domains[0].questions[1].correctAnswer = 'A';
    skewed.domains[1].questions[0].correctAnswer = 'A';
    skewed.domains[1].questions[1].correctAnswer = 'A';
    const { report } = importQuestions(skewed, []);
    assert.ok(report.warnings.some(w => w.includes('answer key skewed')));
});

test('normStem folds case, punctuation and spacing', () => {
    assert.equal(normStem('  Which  control—stops the PHISH first? '), 'which control stops the phish first');
});
