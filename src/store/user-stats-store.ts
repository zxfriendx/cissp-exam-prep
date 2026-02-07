import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface DomainStat {
    correct: number;
    total: number;
}

interface UserStatsState {
    stats: Record<string, DomainStat>; // key: domain_id (e.g., 'domain_1')

    // Actions
    recordResult: (domainId: string, isCorrect: boolean) => void;
    getWeakestDomains: () => string[];
    getOverallAccuracy: () => number;
}

export const useUserStatsStore = create<UserStatsState>()(
    persist(
        (set, get) => ({
            stats: {},

            recordResult: (domainId, isCorrect) => set((state) => {
                const currentStat = state.stats[domainId] || { correct: 0, total: 0 };
                return {
                    stats: {
                        ...state.stats,
                        [domainId]: {
                            correct: currentStat.correct + (isCorrect ? 1 : 0),
                            total: currentStat.total + 1
                        }
                    }
                };
            }),

            getWeakestDomains: () => {
                const stats = get().stats;
                const domains = Object.entries(stats);

                if (domains.length === 0) return [];

                // Calculate accuracy for each domain
                const accuracy = domains.map(([id, stat]) => ({
                    id,
                    percentage: stat.total === 0 ? 0 : (stat.correct / stat.total)
                }));

                // Sort by percentage ascending (lowest first)
                // If percentage is same, maybe sort by total attempts (more practice needed?)
                return accuracy.sort((a, b) => a.percentage - b.percentage)
                    .slice(0, 3) // Return top 3 weakest
                    .map(d => d.id);
            },

            getOverallAccuracy: () => {
                const stats = get().stats;
                let totalCorrect = 0;
                let totalQuestions = 0;
                Object.values(stats).forEach(s => {
                    totalCorrect += s.correct;
                    totalQuestions += s.total;
                });
                return totalQuestions === 0 ? 0 : (totalCorrect / totalQuestions) * 100;
            }
        }),
        {
            name: 'cissp-user-stats',
        }
    )
);
