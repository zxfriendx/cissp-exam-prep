"use client"

import { getAllDomains, getSampleCounts, SET_SIZE } from "@/lib/content";
import { useBankStore } from "@/lib/bank";
import { DomainCard } from "@/components/quiz/domain-card";

/**
 * The eight domain cards, and the line above them that says how big a sitting is.
 *
 * Reads `access` purely to re-render: getAllDomains() is what actually changes
 * when the paid bank swaps in or the email signup opens the other 120, and it
 * is not React state, so without a subscription here the grid would go on
 * showing five a domain after the signup.
 */
export function DomainGrid() {
    const access = useBankStore(state => state.access);
    const domains = getAllDomains();
    const counts = getSampleCounts();
    const paid = access === "paid";

    return (
        <section className="space-y-8">
            <div className="text-center space-y-2">
                <h2 className="text-3xl font-semibold tracking-tight text-primary">
                    Study by Domain
                </h2>
                {paid ? (
                    <p className="text-muted-foreground text-sm">
                        Pick a domain and start. Every question is set in a different organization, so you
                        read a new situation each time instead of grinding the same one. Take the whole
                        domain at once, or {SET_SIZE} at a time.
                    </p>
                ) : access === "joined" ? (
                    <p className="text-muted-foreground text-sm">
                        Pick a domain and start. Every question is set in a different organization, so you
                        read a new situation each time instead of grinding the same one. Take all{" "}
                        {counts.perDomain} at once, or {SET_SIZE} at a time.
                    </p>
                ) : (
                    <p className="text-muted-foreground text-sm">
                        Pick a domain and start. Every question is set in a different organization, so you
                        read a new situation each time instead of grinding the same one. {counts.openPerDomain} in
                        each domain are open now; a free email signup opens all {counts.perDomain}.
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
                        sampleCount={domain.sampleCount}
                        description={domain.description}
                        weight={domain.weight}
                    />
                ))}
            </div>
        </section>
    );
}
