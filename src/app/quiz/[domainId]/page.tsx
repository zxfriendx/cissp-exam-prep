import { getAllDomains, VIRTUAL_QUIZ_IDS } from "@/lib/content"
import QuizPageClient from "./quiz-client"

export async function generateStaticParams() {
    const domains = getAllDomains();
    const params = domains.map((domain) => ({
        domainId: domain.id,
    }));
    // The static export needs a page for every quiz route, including the
    // ones that read their questions from the store rather than the URL.
    return [...params, ...VIRTUAL_QUIZ_IDS.map((domainId) => ({ domainId }))];
}

export default function QuizPage() {
    return <QuizPageClient />
}
