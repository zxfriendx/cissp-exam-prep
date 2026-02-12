"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Target, Lock } from "lucide-react"
import { useQuizStore } from "@/store/quiz-store"
import { useUserStatsStore } from "@/store/user-stats-store"
import { useRouter } from "next/navigation"

export function WeaknessHunterButton() {
    const startWeaknessHunterQuiz = useQuizStore(state => state.startWeaknessHunterQuiz);
    const getWeakestDomains = useUserStatsStore(state => state.getWeakestDomains);
    // Check if we have enough data to be useful? 
    // Maybe checking if stats is empty is enough.
    const stats = useUserStatsStore(state => state.stats);
    const hasHistory = Object.keys(stats).length > 0;

    const router = useRouter();

    const handleStart = () => {
        const weakDomains = getWeakestDomains();
        startWeaknessHunterQuiz(weakDomains);
        router.push('/quiz/weakness-hunter');
    };

    return (
        <Card
            className={`hover:border-secondary/50 hover:shadow-md transition-all duration-300 cursor-pointer group border-2 border-secondary/30 ${!hasHistory ? 'opacity-75' : ''}`}
            onClick={handleStart}
        >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-semibold text-primary">
                    Weakness Hunter Mode
                </CardTitle>
                <Target className="h-5 w-5 text-secondary stroke-2" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-primary mb-2" style={{ fontFamily: 'var(--font-plus-jakarta)' }}>
                    Adaptive Set
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                    {hasHistory
                        ? "Targets your lowest scoring domains"
                        : "Start practicing to unlock adaptive mode"
                    }
                </p>
                {!hasHistory && (
                    <div className="flex items-center gap-1.5 mt-3 text-xs text-amber-600 font-medium">
                        <Lock className="h-3.5 w-3.5" />
                        <span>Requires quiz history</span>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
