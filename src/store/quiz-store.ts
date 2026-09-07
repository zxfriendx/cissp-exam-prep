import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getDomainById, getExamQuestions, getFormQuestions, getQuestionById, getQuestionSet, getQuestionsForDomain, getRandomQuestions, type MockForm, Question, setLabel } from '@/lib/content';
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
    /** The whole domain in book order, or one set of it (1-based) when `set` is given. */
    startQuiz: (domainId: string, set?: number) => void;
    startRandomQuiz: (count: number) => void;
    startWeaknessHunterQuiz: (weakDomainIds: string[]) => void;
    /**
     * The spaced-repetition queue: an explicit list of question ids the
     * scheduler chose. Ids, not questions — see startReviewQuiz.
     */
    startReviewQuiz: (ids: string[]) => void;
    /** Blueprint-weighted sample of `count`, or the whole book in order when omitted. */
    startExamQuiz: (count?: number) => void;
    /**
     * One of the two paid mock forms, 125 questions, as the printed book sets
     * it. Paid only — the free preview carries no form items at all.
     */
    startFormQuiz: (form: MockForm) => void;
    /** Retake the same question set from the top. */
    restartQuiz: () => void;
    answerQuestion: (questionId: string, answer: string, isCorrect: boolean) => void;
    nextQuestion: () => void;
    prevQuestion: () => void;
    resetQuiz: () => void;
}

/**
 * Bump when what is IN a persisted quiz changes, not just its shape.
 *
 * v2: the app stopped serving the 439 v1 questions and started serving a
 * 160-question preview of the v2 examination. A quiz saved before that holds
 * questions with no scenario and no distractor reasons, so it would finish in a
 * UI built around both, silently missing half of what the page promises. There
 * is nothing to migrate -- the questions themselves are gone from the served
 * pool -- so the migration drops the sitting and the reader starts a new one.
 */
const PERSIST_VERSION = 2;

const NO_QUIZ = {
    currentDomainId: null,
    currentQuestionIndex: 0,
    questions: [] as Question[],
    quizTitle: "",
    answers: {} as Record<string, string>,
    score: 0,
    isQuizActive: false,
    deferFeedback: false,
    startedAt: null,
    finishedAt: null,
};

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
            ...NO_QUIZ,

            startQuiz: (domainId, setIndex) => {
                const domain = getDomainById(domainId);
                const all = domain ? domain.questions.slice() : [];
                const questions = setIndex ? getQuestionSet(domainId, setIndex) : all;
                const title = domain
                    ? (setIndex ? `${domain.title} · Questions ${setLabel(setIndex, all.length)}` : domain.title)
                    : "Quiz";
                set(fresh(questions, domainId, title));
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

            /**
             * Takes ids and resolves them here, because the progress store
             * deals only in question ids: a scheduler that held question
             * objects would pin a copy of the bank in localStorage alongside
             * this store's own persisted sitting. An id that the loaded bank
             * cannot resolve is dropped rather than rendered as a blank card —
             * it means the paid bank was cached when the queue was built and
             * is not loaded now.
             */
            startReviewQuiz: (ids) => {
                const questions = ids
                    .map(getQuestionById)
                    .filter((q): q is Question => q !== undefined);
                set(fresh(questions, 'review', `Due Today (${questions.length} Questions)`));
            },

            startExamQuiz: (count) => {
                const questions = getExamQuestions(count);
                const title = count
                    ? `Practice Examination (${questions.length} Questions)`
                    : `Practice Examination (Full Book, ${questions.length} Questions)`;
                set(fresh(questions, 'exam', title, true));
            },

            /*
             * A sitting is capped at one form, and the cap is a storage
             * decision rather than a pedagogical one: this store persists whole
             * question OBJECTS (see partialize), so a 750-question sitting
             * would rewrite ~2.3 MB of localStorage on every answer and blow
             * the ~5 MB budget outright. 125 is the largest set the printed
             * book actually asks anyone to sit in one go, so the cap costs the
             * reader nothing.
             */
            startFormQuiz: (form) => {
                const questions = getFormQuestions(form);
                set(fresh(questions, `form-${form.toLowerCase()}`, `Mock Form ${form} (${questions.length} Questions)`, true));
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

            resetQuiz: () => set({ ...NO_QUIZ })
        }),
        {
            name: 'cissp-quiz-storage',
            version: PERSIST_VERSION,
            // Nothing carries forward: see PERSIST_VERSION.
            migrate: () => ({ ...NO_QUIZ }),
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
