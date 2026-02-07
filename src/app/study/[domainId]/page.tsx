import { getAllDomains } from "@/lib/content"
import StudyPageClient from "./study-client"

export async function generateStaticParams() {
    const domains = getAllDomains();
    return domains.map((domain) => ({
        domainId: domain.id,
    }));
}

export default function StudyPage() {
    return <StudyPageClient />
}
