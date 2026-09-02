/**
 * ISC2 CISSP Detailed Content Outline (effective 2024-04-15): the domain names
 * and exam weights the printed practice examination carries on every domain
 * opener and in its contents page.
 *
 * Kept outside content.json on purpose. The deploy script
 * (securepathdigital-site/stage-learn.sh) overwrites that file with the
 * pipeline's question bank and asserts only on question ids, so anything the
 * app adds to the JSON would be lost on the next deploy.
 *
 * Source: content-pipeline/reference/isc2/cissp_outline_2024.json.
 */
export interface DomainBlueprint {
    id: string;
    number: number;
    name: string;
    /** Percentage of the real examination, per the 2024 outline. Sums to 100. */
    weight: number;
}

export const BLUEPRINT: DomainBlueprint[] = [
    { id: "domain_1", number: 1, name: "Security and Risk Management", weight: 16 },
    { id: "domain_2", number: 2, name: "Asset Security", weight: 10 },
    { id: "domain_3", number: 3, name: "Security Architecture and Engineering", weight: 13 },
    { id: "domain_4", number: 4, name: "Communication and Network Security", weight: 13 },
    { id: "domain_5", number: 5, name: "Identity and Access Management (IAM)", weight: 13 },
    { id: "domain_6", number: 6, name: "Security Assessment and Testing", weight: 12 },
    { id: "domain_7", number: 7, name: "Security Operations", weight: 13 },
    { id: "domain_8", number: 8, name: "Software Development Security", weight: 10 },
];

/** "Allow roughly 1 minute 15 seconds per question, which is the pace the real
 *  examination demands." (practice examination, How to use) */
export const PACE_SECONDS_PER_QUESTION = 75;

export const blueprintFor = (id: string): DomainBlueprint | undefined =>
    BLUEPRINT.find((b) => b.id === id);

export const paceBudgetSeconds = (questionCount: number): number =>
    questionCount * PACE_SECONDS_PER_QUESTION;

/** "62 min" / "1 h 15 min" style, for pace guidance. */
export function formatMinutes(totalSeconds: number): string {
    const minutes = Math.round(totalSeconds / 60);
    if (minutes < 60) return `${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m ? `${h} h ${m} min` : `${h} h`;
}

/**
 * Apportion `count` questions across domains in proportion to their exam
 * weight (largest-remainder method), never exceeding what a domain has
 * available. Any quota a capped domain cannot fill moves to the domains with
 * spare questions, so the total always comes out to `count` while the bank
 * has that many questions.
 */
export function apportionByWeight(count: number, available: Record<string, number>): Record<string, number> {
    const total = Object.values(available).reduce((a, b) => a + b, 0);
    const target = Math.min(count, total);
    const quota: Record<string, number> = {};
    const remainder: { id: string; frac: number }[] = [];
    let assigned = 0;

    for (const b of BLUEPRINT) {
        const exact = (target * b.weight) / 100;
        const base = Math.min(Math.floor(exact), available[b.id] ?? 0);
        quota[b.id] = base;
        assigned += base;
        remainder.push({ id: b.id, frac: exact - Math.floor(exact) });
    }

    // Largest fractional parts first, then round-robin over whatever still
    // has room, so a domain shorter than its share (domain 7 has 49) cannot
    // leave the set short.
    remainder.sort((a, b) => b.frac - a.frac);
    let guard = 0;
    while (assigned < target && guard < 1000) {
        let progressed = false;
        for (const r of remainder) {
            if (assigned >= target) break;
            if (quota[r.id] < (available[r.id] ?? 0)) {
                quota[r.id] += 1;
                assigned += 1;
                progressed = true;
            }
        }
        if (!progressed) break;
        guard += 1;
    }
    return quota;
}
