"use client"

import { getAllDomains, getPreviewSummary, SET_SIZE } from "@/lib/content";
import { useBankStore } from "@/lib/bank";
import { DomainCard } from "@/components/quiz/domain-card";

/**
 * The eight domain cards, and the line above them that says how big a sitting is.
 *
 * Reads `tier` purely to re-render: getAllDomains() is what actually changes
 * when the paid bank swaps in, and it is not React state, so without a
 * subscription here the grid would go on showing twenty a domain after the
 * unlock.
 */
export function DomainGrid() {
    const tier = useBankStore(state => state.tier);
    const domains = getAllDomains();
    const summary = getPreviewSummary();
    const paid = tier === "paid";

    return (
        <section className="space-y-8">
            <div className="text-center space-y-2">
                <h2 className="text-3xl font-semibold tracking-tight text-primary">
                    Study by Domain
                </h2>
                {paid ? (
                    <p className="text-muted-foreground text-sm">
                        Pick a domain and start. Each question drops you into a different organization, so you
                        are always reading a new situation cold instead of grinding the same one. Take
                        the whole domain at once, or {SET_SIZE} at a time.
                    </p>
                ) : (
                    <p className="text-muted-foreground text-sm">
                        Pick a domain and start. Each question drops you into a different organization, so you
                        are always reading a new situation cold instead of grinding the same one. Take
                        all {summary.perDomain} at once, or {SET_SIZE} at a time.
                    </p>
                )}
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 pt-4">
                {domains.map((domain) => (
                    <DomainCard
                        key={domain.id}
                        id={domain.id}
                        title={domain.title}
                        questionCount={domain.questionCount}
                        description={domain.description}
                        weight={domain.weight}
                    />
                ))}
            </div>
        </section>
    );
}
