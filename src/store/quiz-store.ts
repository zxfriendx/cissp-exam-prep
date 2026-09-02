import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getDomainById, getExamQuestions, getQuestionsForDomain, getRandomQuestions, Question } from '@/lib/content';
import { shuffled } from '@/lib/text';

interface QuizState {
    currentDomainId: string | null;
    currentQuestionIndex: number;
    questions: Question[]; // Explicit list of active questions
    quizTitle: string;    // Display title for the quiz
    answers: Record<string, string>;
    score: number;
    isQuizActive: boolean;
    /**
     * Examination mode: answers are recorded but not marked until the end,
     * like the printed book ("mark your answers on a separate sheet, since the
     * key is at the back"). Practice modes mark each question as you go.
     */
    deferFeedback: boolean;
    startedAt: number | null;
    finishedAt: number | null;

    // Actions
    startQuiz: (domainId: string) => void;
    startRandomQuiz: (count: number) => void;
    startWeaknessHunterQuiz: (weakDomainIds: string[]) => void;
    /** Blueprint-weighted sample of `count`, or the whole book in order when omitted. */
    startExamQuiz: (count?: number) => void;
    /** Retake the same question set from the top. */
    restartQuiz: () => void;
    answerQuestion: (questionId: string, answer: string, isCorrect: boolean) => void;
    nextQuestion: () => void;
    prevQuestion: () => void;
    resetQuiz: () => void;
}

const fresh = (questions: Question[], currentDomainId: string, quizTitle: string, deferFeedback = false) => ({
    currentDomainId,
    currentQuestionIndex: 0,
    questions,
    quizTitle,
    answers: {},
    score: 0,
    isQuizActive: true,
    deferFeedback,
    startedAt: Date.now(),
    finishedAt: null,
});

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
            deferFeedback: false,
            startedAt: null,
            finishedAt: null,

            startQuiz: (domainId) => {
                const domain = getDomainById(domainId);
                const questions = domain ? domain.questions.slice() : [];
                set(fresh(questions, domainId, domain?.title || "Quiz"));
            },

            startRandomQuiz: (count) => {
                set(fresh(getRandomQuestions(count), 'random', `Random Practice (${count} Questions)`));
            },

            startWeaknessHunterQuiz: (weakDomainIds: string[]) => {
                let selectedQuestions: Question[] = [];

                if (weakDomainIds.length === 0) {
                    // Fallback to random if no history
                    selectedQuestions = getRandomQuestions(20);
                } else {
                    // 10 questions from each weak domain
                    weakDomainIds.forEach(id => {
                        selectedQuestions = [...selectedQuestions, ...getQuestionsForDomain(id, 10)];
                    });
                }

                set(fresh(shuffled(selectedQuestions), 'weakness-hunter', "Weakness Hunter Mode"));
            },

            startExamQuiz: (count) => {
                const questions = getExamQuestions(count);
                const title = count
                    ? `Practice Examination (${questions.length} Questions)`
                    : `Practice Examination (Full Book, ${questions.length} Questions)`;
                set(fresh(questions, 'exam', title, true));
            },

            restartQuiz: () => set({
                currentQuestionIndex: 0,
                answers: {},
                score: 0,
                isQuizActive: true,
                startedAt: Date.now(),
                finishedAt: null,
            }),

            answerQuestion: (questionId, answer, isCorrect) => set((state) => ({
                answers: { ...state.answers, [questionId]: answer },
                score: isCorrect ? state.score + 1 : state.score
            })),

            nextQuestion: () => set((state) => {
                const next = state.currentQuestionIndex + 1;
                const done = next >= state.questions.length;
                return {
                    currentQuestionIndex: next,
                    finishedAt: done && !state.finishedAt ? Date.now() : state.finishedAt,
                };
            }),

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
                isQuizActive: false,
                deferFeedback: false,
                startedAt: null,
                finishedAt: null,
            })
        }),
        {
            name: 'cissp-quiz-storage',
            // Persist questions too: the URL alone cannot rebuild a random,
            // weakness-hunter or examination set.
            partialize: (state) => ({
                currentDomainId: state.currentDomainId,
                currentQuestionIndex: state.currentQuestionIndex,
                answers: state.answers,
                score: state.score,
                isQuizActive: state.isQuizActive,
                questions: state.questions,
                quizTitle: state.quizTitle,
                deferFeedback: state.deferFeedback,
                startedAt: state.startedAt,
                finishedAt: state.finishedAt,
            }),
        }
    )
);
