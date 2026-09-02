import contentData from '@/data/content.json';
import { BLUEPRINT, apportionByWeight, blueprintFor } from '@/lib/blueprint';
import { shuffled } from '@/lib/text';

export interface Option {
    [key: string]: string; // "A": "Option text"
}

export interface Question {
    id: string;
    number: string;
    question: string;
    options: Option;
    correctAnswer: string;
    explanation: string;
}

export interface Domain {
    id: string;
    title: string;
    caseStudy: string;
    questions: Question[];
}

export interface ContentData {
    domains: Domain[];
}

const data = contentData as ContentData;

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
