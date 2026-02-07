import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getDomainById, getQuestionsForDomain, getRandomQuestions, Question } from '@/lib/content';

interface QuizState {
    currentDomainId: string | null;
    currentQuestionIndex: number;
    questions: Question[]; // Added: Explicit list of active questions
    quizTitle: string;    // Added: Display title for the quiz
    answers: Record<string, string>;
    score: number;
    isQuizActive: boolean;

    // Actions
    startQuiz: (domainId: string) => void;
    startRandomQuiz: (count: number) => void;
    startWeaknessHunterQuiz: (weakDomainIds: string[]) => void; // Added
    answerQuestion: (questionId: string, answer: string, isCorrect: boolean) => void;
    nextQuestion: () => void;
    prevQuestion: () => void;
    resetQuiz: () => void;
}

export const useQuizStore = create<QuizState>()(
    persist(
        (set) => ({
            currentDomainId: null,
            currentQuestionIndex: 0,
            questions: [],
            quizTitle: "",
            answers: {},
            score: 0,
            isQuizActive: false,

            startQuiz: (domainId) => {
                const domain = getDomainById(domainId);
                const questions = domain ? domain.questions : [];
                set({
                    currentDomainId: domainId,
                    currentQuestionIndex: 0,
                    questions: questions,
                    quizTitle: domain?.title || "Quiz",
                    answers: {},
                    score: 0,
                    isQuizActive: true
                });
            },

            startRandomQuiz: (count) => {
                const questions = getRandomQuestions(count);
                set({
                    currentDomainId: 'random',
                    currentQuestionIndex: 0,
                    questions: questions,
                    quizTitle: `Random Practice (${count} Questions)`,
                    answers: {},
                    score: 0,
                    isQuizActive: true
                });
            },

            startWeaknessHunterQuiz: (weakDomainIds: string[]) => {
                // Fetch questions from weak domains
                let selectedQuestions: Question[] = [];

                if (weakDomainIds.length === 0) {
                    // Fallback to random if no history
                    selectedQuestions = getRandomQuestions(20);
                } else {
                    // Get 10 questions from each weak domain
                    weakDomainIds.forEach(id => {
                        const qs = getQuestionsForDomain(id, 10);
                        selectedQuestions = [...selectedQuestions, ...qs];
                    });
                }

                // Shuffle the pool
                selectedQuestions = selectedQuestions.sort(() => 0.5 - Math.random());

                set({
                    currentDomainId: 'weakness-hunter',
                    currentQuestionIndex: 0,
                    questions: selectedQuestions,
                    quizTitle: "Weakness Hunter Mode 🎯",
                    answers: {},
                    score: 0,
                    isQuizActive: true
                });
            },

            answerQuestion: (questionId, answer, isCorrect) => set((state) => ({
                answers: { ...state.answers, [questionId]: answer },
                score: isCorrect ? state.score + 1 : state.score
            })),

            nextQuestion: () => set((state) => ({
                currentQuestionIndex: state.currentQuestionIndex + 1
            })),

            prevQuestion: () => set((state) => ({
                currentQuestionIndex: Math.max(0, state.currentQuestionIndex - 1)
            })),

            resetQuiz: () => set({
                currentDomainId: null,
                currentQuestionIndex: 0,
                questions: [],
                quizTitle: "",
                answers: {},
                score: 0,
                isQuizActive: false
            })
        }),
        {
            name: 'cissp-quiz-storage',
            // We need to persist questions now since URL alone isn't enough for random mode
            partialize: (state) => ({
                currentDomainId: state.currentDomainId,
                currentQuestionIndex: state.currentQuestionIndex,
                answers: state.answers,
                score: state.score,
                isQuizActive: state.isQuizActive,
                questions: state.questions, // Important: Persist the randomized list
                quizTitle: state.quizTitle
            }),
        }
    )
);
