/**
 * The swap between the free preview and the paid bank.
 *
 * A fixture rather than the real files: what is being checked here is the
 * mechanics of the exchange — what survives it, what is rebuilt by it, what
 * happens if the two halves arrive in the wrong order — and a fixture small
 * enough to read makes each of those visible. The real banks are counted in
 * test/preview.test.mjs and test/wp0-seams.test.mjs.
 *
 * The scenario index is the interesting one. It used to be a module const in
 * content.ts, built once from the preview; after a swap it would still have
 * been answering for the free bank's scenarios while the questions on screen
 * came from the paid one.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';

register('../scripts/node-ts-resolve.mjs', import.meta.url);

const {
    activeData,
    activeTier,
    lookupStimulus,
    resetBankForTests,
    setActiveBank,
    setPreviewBank,
    useBankStore,
} = await import('../src/lib/bank.ts');

const question = (id, form) => ({
    id,
    question: `stem ${id}`,
    options: { A: 'a', B: 'b', C: 'c', D: 'd' },
    correctAnswer: 'A',
    explanation: 'because',
    form,
    stimulusId: `${id}_sc`,
});

const PREVIEW = {
    preview: { schema: 1, perDomain: 2, served: 4, scenarios: 4, objectives: 9, discrete: 0,
               keyCounts: { A: 4, B: 0, C: 0, D: 0 }, paid: 12,
               paidDrillsByDomain: { domain_1: 5, domain_2: 3 } },
    bank: { schema: 2, edition: '2026-08-31', questionCount: 4, byDomain: {}, keyCounts: {}, sources: [],
            v2: { schema: 1, edition: '2026-09-06', itemCount: 12, stimulusCount: 4, byDomain: {},
                  byForm: {}, keyCounts: {}, itemsInTestlets: 0, annotationCoverage: {} } },
    domains: [
        { id: 'domain_1', title: 'One', caseStudy: 'cs1',
          stimuli: [{ id: 'free_sc', domainId: 'domain_1', kind: 'testlet', title: 'Free', text: '...' }],
          questions: [question('d1_q001', 'drill'), question('d1_q002', 'drill')] },
        { id: 'domain_2', title: 'Two', caseStudy: 'cs2',
          stimuli: [],
          questions: [question('d2_q001', 'drill'), question('d2_q002', 'drill')] },
    ],
};

const PAID = {
    schema: 1,
    edition: '2026-09-06',
    domains: [
        { id: 'domain_1', title: 'One', caseStudy: 'cs1',
          stimuli: [
              { id: 'free_sc', domainId: 'domain_1', kind: 'testlet', title: 'Free', text: '...' },
              { id: 'paid_sc', domainId: 'domain_1', kind: 'testlet', title: 'Paid only', text: '...' },
          ],
          questions: [
              question('d1_q001', 'drill'), question('d1_q002', 'drill'), question('d1_q003', 'drill'),
              question('d1_q004', 'drill'), question('d1_q005', 'drill'),
              question('d1_A001', 'A'), question('d1_B001', 'B'),
          ] },
        { id: 'domain_2', title: 'Two', caseStudy: 'cs2', stimuli: [],
          questions: [
              question('d2_q001', 'drill'), question('d2_q002', 'drill'), question('d2_q003', 'drill'),
              question('d2_A001', 'A'), question('d2_B001', 'B'),
          ] },
    ],
};

const fresh = () => {
    resetBankForTests();
    setPreviewBank(PREVIEW);
};

test('the preview is the baseline, and the store says free', () => {
    fresh();
    assert.equal(activeTier(), 'free');
    assert.equal(activeData(), PREVIEW);
    const s = useBankStore.getState();
    assert.equal(s.tier, 'free');
    assert.equal(s.served, 4);
    // The build's expected edition is the v2 one, which is what the loader
    // compares a cached bank against.
    assert.equal(s.edition, '2026-09-06');
});

test('setActiveBank swaps the questions and the tier', () => {
    fresh();
    setActiveBank(PAID);
    assert.equal(activeTier(), 'paid');
    assert.equal(activeData().domains[0].questions.length, 7);
    const s = useBankStore.getState();
    assert.equal(s.tier, 'paid');
    assert.equal(s.served, 12, 'counts mock-form items too — 12, not the 8 drills');
    assert.equal(s.edition, PAID.edition);
});

test('the build metadata survives the swap', () => {
    fresh();
    setActiveBank(PAID);
    // getBankManifest() and getPreviewSummary() read these. The first has to keep
    // naming the edition this BUILD expects; the second has to keep describing
    // the free sample, or the upsell copy starts describing the paid bank to
    // someone who already owns it.
    assert.equal(activeData().bank, PREVIEW.bank);
    assert.equal(activeData().preview, PREVIEW.preview);
});

test('the scenario index is rebuilt, both ways', () => {
    fresh();
    assert.equal(lookupStimulus('free_sc')?.title, 'Free');
    assert.equal(lookupStimulus('paid_sc'), undefined);

    setActiveBank(PAID);
    assert.equal(lookupStimulus('paid_sc')?.title, 'Paid only', 'a paid-only scenario must resolve after the swap');
    assert.equal(lookupStimulus('free_sc')?.title, 'Free');

    setActiveBank(null);
    assert.equal(lookupStimulus('paid_sc'), undefined, 'and stop resolving after the swap back');
});

test('setActiveBank(null) puts the preview back exactly', () => {
    fresh();
    setActiveBank(PAID);
    setActiveBank(null);
    assert.equal(activeTier(), 'free');
    assert.equal(activeData(), PREVIEW);
    assert.deepEqual(
        { tier: useBankStore.getState().tier, served: useBankStore.getState().served },
        { tier: 'free', served: 4 },
    );
});

test('a late setPreviewBank does not clobber a loaded paid bank', () => {
    // Module init order is not something a component can rely on: content.ts
    // registers the preview when it is first imported, which can be after a
    // route chunk has already put the cached paid bank in.
    fresh();
    setActiveBank(PAID);
    setPreviewBank(PREVIEW);
    assert.equal(activeTier(), 'paid');
    assert.equal(useBankStore.getState().served, 12);
});

test('the store is a fresh object each publish, so subscribers actually fire', () => {
    fresh();
    const seen = [];
    const stop = useBankStore.subscribe(s => seen.push(s.tier));
    setActiveBank(PAID);
    setActiveBank(null);
    stop();
    assert.deepEqual(seen, ['paid', 'free']);
});
