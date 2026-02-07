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
            className={`hover:border-primary/50 transition-colors cursor-pointer group border-primary/20 ${!hasHistory ? 'opacity-80' : ''}`}
            onClick={handleStart}
        >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-primary">
                    Weakness Hunter Mode
                </CardTitle>
                <Target className="h-4 w-4 text-primary animate-pulse" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">Adaptive Set</div>
                <p className="text-xs text-muted-foreground mt-1">
                    {hasHistory
                        ? "Targets your lowest scoring domains"
                        : "Start practicing to unlock adaptive mode"
                    }
                </p>
                {!hasHistory && (
                    <div className="flex items-center gap-1 mt-2 text-xs text-amber-500 font-medium">
                        <Lock className="h-3 w-3" />
                        <span>Requires quiz history</span>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
