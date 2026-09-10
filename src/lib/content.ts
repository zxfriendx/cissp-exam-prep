/*
 * The app reads src/data/preview.json, NOT src/data/content.json.
 *
 * content.json is the whole paid bank -- 750 examination questions with their
 * keys and worked answers, 3 MB of it. An imported JSON module is bundled into
 * the client, so importing it here would hand the entire printed book to every
 * visitor. scripts/build-preview.mjs cuts the 160-question sample out of it at
 * build time; that file is what ships. See that script for the rest.
 */
import previewData from '@/data/preview.json';
import { BLUEPRINT, apportionByWeight, blueprintFor } from '@/lib/blueprint';
import { activeData, lookupStimulus, setPreviewBank } from '@/lib/bank';
import { domainIdOf, shuffled } from '@/lib/text';
import { isDrill, previewStats } from '@/lib/preview';

export interface Option {
    [key: string]: string; // "A": "Option text"
}

/**
 * Why a wrong option is wrong, and the question it answers instead.
 *
 * `label` is one of eight published values ("wrong phase", "wrong scope",
 * "right control, wrong problem", ...); the printed book's front matter lists
 * them and a build gate refuses any label outside the vocabulary.
 */
export interface DistractorReason {
    label: string;
    /** "What work genuinely does belong to the integration period?" */
    wouldAnswer: string;
}

/**
 * A scenario. Every domain has fifteen to nineteen of them, each with its own
 * organization -- NOT the single per-domain case study the app was built
 * around. A question names systems and people that exist only in its own
 * stimulus, so this has to be on screen while the question is being answered.
 */
export interface Stimulus {
    id: string;
    domainId: string;
    /** "testlet" today; the field exists so other shapes can be added. */
    kind: string;
    title: string;
    text: string;
    /** The shared fictional world, where several stimuli reuse one organization. */
    world?: string;
    /** The domain case study this scenario extends, when it extends one. */
    caseStudyId?: string;
    profile?: {
        organization?: string;
        regime?: string;
        environment?: string;
        state?: string;
    };
    outlineItems?: string[];
    editions?: string[];
}

/**
 * One question as scripts/import-questions.mjs writes it (bank schema 2).
 * The optional fields are new in schema 2: a quiz persisted in localStorage
 * before the restamp carries questions without them, so read the domain
 * through domainOfQuestion(), never q.domainId directly.
 *
 * The block from `form` down is the v2 examination's data. Everything the app
 * shows about WHY an answer is wrong comes from `distractorReasons`; items that
 * predate v2 carry none of it and the UI falls back to the explanation prose.
 */
export interface Question {
    id: string;
    /** The number the printed book gives it, within its domain. */
    number?: string;
    /** Schema 2. The domain the question belongs to. */
    domainId?: string;
    question: string;
    options: Option;
    correctAnswer: string;
    explanation: string;
    /** Passed through from a source when it carries them; none do yet. */
    level?: string;
    /** 2024 outline task ids, e.g. "1.3". */
    tasks?: string[];
    references?: string[];
    /** Content hash of stem, options, key and explanation. Changes when a re-import revises the question. */
    rev?: string;

    /** Which editions of the printed book carry it: "v1", "v2". */
    editions?: string[];
    /** "drill" for a domain question; "A" or "B" for a mock-form item. */
    form?: string;
    /** The scenario it is set in. Absent on a discrete item. */
    stimulusId?: string;
    /** Its position within that scenario's testlet, 1-based. */
    stimulusSeq?: number;
    /** 2024 outline objectives, e.g. "1.3.2". More precise than `tasks`. */
    outlineItems?: string[];
    /** Domains other than its own that the question also touches. */
    crossDomain?: string[];
    /** Each option in a few words, for the review pages. */
    optionsShort?: Option;
    /**
     * Keyed by the wrong option's letter; the key itself is never present, so
     * every lookup can miss and the value type says so.
     */
    distractorReasons?: Record<string, DistractorReason | undefined>;
    /** The question restated so the review block stands alone. */
    recallLine?: string;
    /** "governance", "technical", ... — the angle the question comes from. */
    lens?: string;
    /** Bloom-ish: "recall", "application", "analysis". */
    cognitive?: string;
    /** The word that decides between defensible options: BEST, FIRST, MOST. */
    discriminator?: string;
    /** 1 (straightforward) to 5 (hard). */
    difficulty?: number;
    /**
     * Standards and clauses the answer rests on. Present on the 340 items
     * written fresh for v2, along with `lens`, `cognitive`, `discriminator` and
     * `difficulty`; the 410 rewritten from v1 carry none of the five, so the UI
     * shows each of them only where it exists.
     */
    sources?: string[];
    /** The v1 question this one was rewritten from, for the 410 that were. */
    variantOf?: string;
    /** What the rewrite changed: "scenario", "discriminator", ... */
    variantAxis?: string;
}

export interface Domain {
    id: string;
    title: string;
    /** The single domain-wide case study. Kept for the study page and the debrief. */
    caseStudy: string;
    questions: Question[];
    /** The v2 scenarios. Fifteen to nineteen per domain. */
    stimuli?: Stimulus[];
    /** The v2 examination bank: 500 drills and 250 mock-form items, in total. */
    questionsV2?: Question[];
}

/** Written by the v2 merge; describes the examination bank inside content.json. */
export interface V2Manifest {
    schema: number;
    edition: string;
    itemCount: number;
    stimulusCount: number;
    byDomain: Record<string, number>;
    byForm: Record<string, number>;
    keyCounts: Record<string, number>;
    itemsInTestlets: number;
    annotationCoverage: Record<string, number>;
}

/** Written by the importer; describes the bank it built. */
export interface BankManifest {
    schema: number;
    /** Date of the pipeline bank this was imported from. */
    edition: string;
    questionCount: number;
    byDomain: Record<string, number>;
    keyCounts: Record<string, number>;
    sources: { path: string; items: number; added: number; changed: number }[];
    /** Absent on a content.json from before the v2 merge. */
    v2?: V2Manifest;
}

/** Written by scripts/build-preview.mjs; counted from the sample it cut. */
export interface PreviewMeta {
    schema: number;
    perDomain: number;
    served: number;
    scenarios: number;
    objectives: number;
    discrete: number;
    keyCounts: Record<string, number>;
    /** Questions in the paid examination this is a sample of. */
    paid: number;
    /** Per domain, how many drills the paid examination holds. */
    paidDrillsByDomain?: Record<string, number>;
}

export interface ContentData {
    preview?: PreviewMeta;
    bank?: BankManifest;
    domains: Domain[];
}

/*
 * The free preview is the baseline, not the only bank. A buyer who unlocks
 * swaps the 750-question paid bank in underneath every accessor below; see
 * src/lib/bank.ts, which owns that state and the re-render that follows it.
 * This module is the only one that imports preview.json, and it registers it
 * here at import time, before any accessor can run.
 */
setPreviewBank(previewData as unknown as ContentData);

/**
 * The BUILD's manifest, which does not change when the paid bank swaps in: it
 * is what the loader compares a cached bank's edition against.
 */
export const getBankManifest = (): BankManifest | undefined => activeData().bank;

/** The domain a question belongs to: the schema-2 field, or the id's domain_X_qY form for older persisted copies. */
export const domainOfQuestion = (q: Pick<Question, 'id' | 'domainId'>): string | undefined =>
    q.domainId ?? domainIdOf(q.id);

/**
 * A domain quiz is the whole preview for that domain (20 questions today), and
 * is also offered in sets of this many so a sitting can stop at a sensible
 * place. It was 25 when a domain quiz meant all 49-70 v1 questions.
 */
export const SET_SIZE = 10;

export const setCountFor = (questionCount: number): number =>
    questionCount > SET_SIZE ? Math.ceil(questionCount / SET_SIZE) : 1;

/** "1-10", "11-20": the positions in the set a sitting covers. */
export const setLabel = (set: number, questionCount: number): string => {
    const from = (set - 1) * SET_SIZE + 1;
    const to = Math.min(set * SET_SIZE, questionCount);
    return `${from}–${to}`;
};

const domainDescriptions: Record<string, string> = {
    "domain_1": "Security governance, compliance, law, and risk management. Master the foundational principles of information security.",
    "domain_2": "Data classification, handling, and asset lifecycle management. Protect your organization's most valuable resources.",
    "domain_3": "Security models, cryptography, and physical security. Design robust systems resistant to complex threats.",
    "domain_4": "Network architecture, transmission methods, and secure communication protocols. Ensure secure data transit across all channels.",
    "domain_5": "Authentication, authorization, and identity lifecycle. Control access to critical systems and data.",
    "domain_6": "Vulnerability assessment, penetration testing, and auditing. Validate and verify security controls effectiveness.",
    "domain_7": "Incident response, disaster recovery, and operational security. Maintain organizational resilience and day-to-day security.",
    "domain_8": "Secure coding practices and software development lifecycle. Build security into applications from the ground up."
};

/**
 * Quiz routes that are not a domain: /quiz/random, /quiz/weakness-hunter,
 * /quiz/exam and /quiz/review. They read their question list from the persisted
 * store instead of the bank, and each needs an entry in generateStaticParams so
 * the static export emits a page for it (a reload on one of these paths would
 * otherwise 404 on Apache).
 */
export const VIRTUAL_QUIZ_IDS = ['random', 'weakness-hunter', 'exam', 'review', 'form-a', 'form-b'] as const;
export type VirtualQuizId = typeof VIRTUAL_QUIZ_IDS[number];
export const isVirtualQuizId = (id: string): id is VirtualQuizId =>
    (VIRTUAL_QUIZ_IDS as readonly string[]).includes(id);

/** The bank's title, spelled the way the 2024 outline and the printed book spell it. */
export const domainTitle = (domain: Pick<Domain, 'id' | 'title'>): string =>
    blueprintFor(domain.id)?.name ?? domain.title;

// ── the scenarios ────────────────────────────────────────────────────────────

/*
 * The lookup lives in bank.ts because it has to be REBUILT when the paid bank
 * swaps in. Built here as a module const it would still be indexing the free
 * preview's 127 scenarios while the questions on screen came from the paid
 * bank's 133, and every unlocked question set in one of the six new ones would
 * render with no scenario at all.
 */

/** The scenario a question is set in, or undefined for a discrete item. */
export const getStimulus = (id?: string): Stimulus | undefined =>
    id ? lookupStimulus(id) : undefined;

export const getStimulusFor = (q: Pick<Question, 'stimulusId'>): Stimulus | undefined =>
    getStimulus(q.stimulusId);

/** The scenarios a domain's served questions are set in, in book order. */
export const getDomainStimuli = (domainId: string): Stimulus[] =>
    activeData().domains.find(d => d.id === domainId)?.stimuli ?? [];

// ── the free preview ─────────────────────────────────────────────────────────

/**
 * The questions the app serves for a domain: the free sample, or the paid
 * bank's drills once a licence is in. Already sampled on the free tier — the
 * pick happens in scripts/build-preview.mjs, so neither the picker nor the
 * questions it rejected reach the browser.
 *
 * Drills only. The paid bank's `questions` also carries the 250 mock-form items,
 * and a domain quiz that swept those in would hand the reader half of Form A
 * before they ever sat it. The filter is a no-op on the free tier, which is only
 * ever drills — so the free markup is byte-for-byte what it was.
 */
export const getPreviewQuestions = (domainId: string): Question[] =>
    activeData().domains.find(d => d.id === domainId)?.questions.filter(isDrill) ?? [];

/** The two mock forms, 125 questions each. Paid only: the preview carries none. */
export type MockForm = 'A' | 'B';

/**
 * A mock form in book order — domain by domain, testlets intact. The real
 * examination interleaves the domains, but the questions in a testlet share a
 * scenario and splitting them up would make the reader re-read it four times.
 */
export const getFormQuestions = (form: MockForm): Question[] =>
    activeData().domains.flatMap(d => d.questions.filter(q => q.form === form));

/** How many questions the printed examination holds, across every domain. */
export const getPaidBankCount = (): number => activeData().preview?.paid ?? getTotalQuestionCount();

export interface PreviewSummary {
    /** Questions the free app serves. */
    served: number;
    perDomain: number;
    scenarios: number;
    objectives: number;
    /** Questions in the paid examination. */
    paid: number;
    keyCounts: Record<string, number>;
}

/**
 * What the preview actually contains, counted rather than asserted. Every number
 * the practice page prints about itself comes from here, and the counting is
 * done by the generator over the file that ships -- which is how a page stops
 * being able to claim 491 free questions while the app renders 439.
 */
export const getPreviewSummary = (): PreviewSummary => {
    const meta = activeData().preview;
    if (meta) {
        return {
            served: meta.served,
            perDomain: meta.perDomain,
            scenarios: meta.scenarios,
            objectives: meta.objectives,
            paid: meta.paid,
            keyCounts: meta.keyCounts,
        };
    }
    // A preview.json from before the meta block, or a hand-built one.
    const all = activeData().domains.flatMap(d => d.questions);
    const stats = previewStats(all);
    return {
        served: stats.questions,
        perDomain: Math.round(stats.questions / Math.max(1, activeData().domains.length)),
        scenarios: stats.scenarios,
        objectives: stats.objectives,
        paid: stats.questions,
        keyCounts: stats.keyCounts,
    };
};

/**
 * How many drills the paid examination holds for a domain, so a card can say
 * "20 of 80" instead of implying 20 is all there is. Counted by the generator
 * from the bank, not typed in here.
 */
export const getDrillCountPaid = (domainId: string): number | undefined =>
    activeData().preview?.paidDrillsByDomain?.[domainId];

/**
 * One question by id, from whichever bank is active. The review queue stores
 * question ids rather than question objects — a scheduler that held the objects
 * would pin a copy of the paid bank in localStorage.
 */
export const getQuestionById = (id: string): Question | undefined => {
    for (const d of activeData().domains) {
        const hit = d.questions.find(q => q.id === id);
        if (hit) return hit;
    }
    return undefined;
};

// ── what the app serves ──────────────────────────────────────────────────────

export const getAllDomains = () => {
    return activeData().domains.map(d => ({
        id: d.id,
        title: domainTitle(d),
        number: blueprintFor(d.id)?.number ?? Number(d.id.replace('domain_', '')),
        weight: blueprintFor(d.id)?.weight,
        questionCount: getPreviewQuestions(d.id).length,
        scenarioCount: new Set(getPreviewQuestions(d.id).map(q => q.stimulusId).filter(Boolean)).size,
        description: domainDescriptions[d.id] || "Master this domain with practice questions and detailed explanations."
    }));
};

/**
 * A domain as the app serves it: its `questions` are the free preview, not the
 * whole bank. Everything downstream -- the store, the domain cards, the results
 * page -- reads the domain through here, so there is one answer to "what is in
 * this quiz".
 */
export const getDomainById = (domainId: string): Domain | undefined => {
    const d = activeData().domains.find(d => d.id === domainId);
    return d ? { ...d, title: domainTitle(d), questions: getPreviewQuestions(domainId) } : undefined;
};

/**
 * A domain's served questions in book order, or a random sample of `limit`.
 * Always a copy: an earlier version sorted the bank's own array in place, so one
 * Weakness Hunter run scrambled the order of every later domain quiz.
 */
export const getQuestionsForDomain = (domainId: string, limit?: number): Question[] => {
    const questions = getPreviewQuestions(domainId);
    if (!limit) return questions.slice();
    return shuffled(questions).slice(0, limit);
};

/** Set `set` (1-based) of a domain, in book order. Out of range gives an empty list. */
export const getQuestionSet = (domainId: string, set: number): Question[] =>
    getQuestionsForDomain(domainId).slice((set - 1) * SET_SIZE, set * SET_SIZE);

export const getRandomQuestions = (count: number): Question[] => {
    const allQuestions = activeData().domains.flatMap(d => getPreviewQuestions(d.id));
    return shuffled(allQuestions).slice(0, count);
};

export const getTotalQuestionCount = (): number =>
    activeData().domains.reduce((n, d) => n + getPreviewQuestions(d.id).length, 0);

/**
 * The practice examination. With no count: every question the app serves, in
 * the order the printed book presents them (domain by domain). With a count: a
 * sample apportioned to the 2024 exam blueprint weights, then mixed, the way the
 * real examination interleaves domains.
 */
export const getExamQuestions = (count?: number): Question[] => {
    if (!count) {
        return BLUEPRINT.flatMap(b => getPreviewQuestions(b.id));
    }
    const available: Record<string, number> = {};
    for (const d of activeData().domains) available[d.id] = getPreviewQuestions(d.id).length;
    const quota = apportionByWeight(count, available);
    const picked = activeData().domains.flatMap(d => shuffled(getPreviewQuestions(d.id)).slice(0, quota[d.id] ?? 0));
    return shuffled(picked);
};
