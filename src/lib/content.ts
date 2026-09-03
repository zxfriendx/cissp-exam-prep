import contentData from '@/data/content.json';
import { BLUEPRINT, apportionByWeight, blueprintFor } from '@/lib/blueprint';
import { domainIdOf, shuffled } from '@/lib/text';

export interface Option {
    [key: string]: string; // "A": "Option text"
}

/**
 * One question as scripts/import-questions.mjs writes it (bank schema 2).
 * The optional fields are new in schema 2: a quiz persisted in localStorage
 * before the restamp carries questions without them, so read the domain
 * through domainOfQuestion(), never q.domainId directly.
 */
export interface Question {
    id: string;
    /** The number the printed book gives it, within its domain. */
    number: string;
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
}

export interface Domain {
    id: string;
    title: string;
    caseStudy: string;
    questions: Question[];
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
}

export interface ContentData {
    bank?: BankManifest;
    domains: Domain[];
}

const data = contentData as ContentData;

export const getBankManifest = (): BankManifest | undefined => data.bank;

/** The domain a question belongs to: the schema-2 field, or the id's domain_X_qY form for older persisted copies. */
export const domainOfQuestion = (q: Pick<Question, 'id' | 'domainId'>): string | undefined =>
    q.domainId ?? domainIdOf(q.id);

/**
 * A domain quiz is the whole domain in book order (49-70 questions today).
 * Domains longer than one set are also offered in sets of this many, still in
 * book order, so a sitting can stop at a sensible place.
 */
export const SET_SIZE = 25;

export const setCountFor = (questionCount: number): number =>
    questionCount > SET_SIZE ? Math.ceil(questionCount / SET_SIZE) : 1;

/** "1-25", "26-50", "51-70": the book numbers a set covers. */
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
 * Quiz routes that are not a domain: /quiz/random, /quiz/weakness-hunter and
 * /quiz/exam. They read their question list from the persisted store instead
 * of the bank, and each needs an entry in generateStaticParams so the static
 * export emits a page for it (a reload on one of these paths would otherwise
 * 404 on Apache).
 */
export const VIRTUAL_QUIZ_IDS = ['random', 'weakness-hunter', 'exam'] as const;
export type VirtualQuizId = typeof VIRTUAL_QUIZ_IDS[number];
export const isVirtualQuizId = (id: string): id is VirtualQuizId =>
    (VIRTUAL_QUIZ_IDS as readonly string[]).includes(id);

/** The bank's title, spelled the way the 2024 outline and the printed book spell it. */
export const domainTitle = (domain: Pick<Domain, 'id' | 'title'>): string =>
    blueprintFor(domain.id)?.name ?? domain.title;

export const getAllDomains = () => {
    return data.domains.map(d => ({
        id: d.id,
        title: domainTitle(d),
        number: blueprintFor(d.id)?.number ?? Number(d.id.replace('domain_', '')),
        weight: blueprintFor(d.id)?.weight,
        questionCount: d.questions.length,
        description: domainDescriptions[d.id] || "Master this domain with practice questions and detailed explanations."
    }));
};

export const getDomainById = (domainId: string): Domain | undefined => {
    const d = data.domains.find(d => d.id === domainId);
    return d ? { ...d, title: domainTitle(d) } : undefined;
};

/**
 * A domain's questions in book order, or a random sample of `limit`. Always a
 * copy: an earlier version sorted the bank's own array in place, so one
 * Weakness Hunter run scrambled the order of every later domain quiz.
 */
export const getQuestionsForDomain = (domainId: string, limit?: number): Question[] => {
    const domain = getDomainById(domainId);
    if (!domain) return [];
    if (!limit) return domain.questions.slice();
    return shuffled(domain.questions).slice(0, limit);
};

/** Set `set` (1-based) of a domain, in book order. Out of range gives an empty list. */
export const getQuestionSet = (domainId: string, set: number): Question[] =>
    getQuestionsForDomain(domainId).slice((set - 1) * SET_SIZE, set * SET_SIZE);

export const getRandomQuestions = (count: number): Question[] => {
    const allQuestions = data.domains.flatMap(d => d.questions);
    return shuffled(allQuestions).slice(0, count);
};

export const getTotalQuestionCount = (): number =>
    data.domains.reduce((n, d) => n + d.questions.length, 0);

/**
 * The practice examination. With no count: every question, in the order the
 * printed book presents them (domain by domain). With a count: a sample
 * apportioned to the 2024 exam blueprint weights, then mixed, the way the real
 * examination interleaves domains.
 */
export const getExamQuestions = (count?: number): Question[] => {
    if (!count) {
        return BLUEPRINT.flatMap(b => getDomainById(b.id)?.questions ?? []);
    }
    const available: Record<string, number> = {};
    for (const d of data.domains) available[d.id] = d.questions.length;
    const quota = apportionByWeight(count, available);
    const picked = data.domains.flatMap(d => shuffled(d.questions).slice(0, quota[d.id] ?? 0));
    return shuffled(picked);
};
