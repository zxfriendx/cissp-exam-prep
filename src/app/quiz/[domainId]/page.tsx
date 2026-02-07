import { getAllDomains } from "@/lib/content"
import QuizPageClient from "./quiz-client"

export async function generateStaticParams() {
    const domains = getAllDomains();
    const params = domains.map((domain) => ({
        domainId: domain.id,
    }));
    return [...params, { domainId: 'random' }];
}

export default function QuizPage() {
    return <QuizPageClient />
}
