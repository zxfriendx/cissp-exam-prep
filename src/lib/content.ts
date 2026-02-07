import contentData from '@/data/content.json';

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
    "domain_4": "Network architecture, transmission methods, and secure communication protocols. ensure secure data transit across all channels.",
    "domain_5": "Authentication, authorization, and identity lifecycle. Control access to critical systems and data.",
    "domain_6": "Vulnerability assessment, penetration testing, and auditing. Validate and verify security controls effectiveness.",
    "domain_7": "Incident response, disaster recovery, and operational security. maintain organizational resilience and day-to-day security.",
    "domain_8": "Secure coding practices and software development lifecycle. Build security into applications from the ground up."
};

export const getAllDomains = () => {
    return data.domains.map(d => ({
        id: d.id,
        title: d.title,
        questionCount: d.questions.length,
        description: domainDescriptions[d.id] || "Master this domain with practice questions and detailed explanations."
    }));
};

export const getDomainById = (domainId: string): Domain | undefined => {
    return data.domains.find(d => d.id === domainId);
};

export const getQuestionsForDomain = (domainId: string, limit?: number): Question[] => {
    const domain = getDomainById(domainId);
    if (!domain) return [];

    const questions = domain.questions;
    if (!limit) return questions;

    // Basic shuffle (optional, can be improved) and limit
    return questions.sort(() => 0.5 - Math.random()).slice(0, limit);
};

export const getRandomQuestions = (count: number): Question[] => {
    const allQuestions = data.domains.flatMap(d => d.questions);
    return allQuestions.sort(() => 0.5 - Math.random()).slice(0, count);
};
