import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User, Question, AnswersRecord } from '@/types';

interface ExamStore {
    // User data
    user: User | null;
    setUser: (user: User | null) => void;

    // Questions
    questions: Question[];
    setQuestions: (questions: Question[]) => void;

    // Current question index
    currentQuestionIndex: number;
    setCurrentQuestionIndex: (index: number) => void;
    nextQuestion: () => void;
    prevQuestion: () => void;

    // Answers
    answers: AnswersRecord;
    setAnswer: (questionId: string, answer: string | string[]) => void;
    setAllAnswers: (answers: AnswersRecord) => void;

    // Timer
    timeRemaining: number; // in seconds
    setTimeRemaining: (time: number) => void;
    decrementTime: () => void;

    // Violations
    violations: number;
    incrementViolations: () => number;
    setViolations: (count: number) => void;

    // Sync status
    lastSync: Date | null;
    setLastSync: (date: Date) => void;
    isSyncing: boolean;
    setIsSyncing: (syncing: boolean) => void;

    // Exam status
    isSubmitted: boolean;
    setIsSubmitted: (submitted: boolean) => void;
    isExamStarted: boolean;
    setIsExamStarted: (started: boolean) => void;

    // Reset
    resetExam: () => void;
}

const initialState = {
    user: null,
    questions: [],
    currentQuestionIndex: 0,
    answers: {},
    timeRemaining: 0,
    violations: 0,
    lastSync: null,
    isSyncing: false,
    isSubmitted: false,
    isExamStarted: false,
};

export const useExamStore = create<ExamStore>()(
    persist(
        (set, get) => ({
            ...initialState,

            // User
            setUser: (user) => set({ user }),

            // Questions
            setQuestions: (questions) => set({ questions }),

            // Navigation
            setCurrentQuestionIndex: (index) => set({ currentQuestionIndex: index }),
            nextQuestion: () => {
                const { currentQuestionIndex, questions } = get();
                if (currentQuestionIndex < questions.length - 1) {
                    set({ currentQuestionIndex: currentQuestionIndex + 1 });
                }
            },
            prevQuestion: () => {
                const { currentQuestionIndex } = get();
                if (currentQuestionIndex > 0) {
                    set({ currentQuestionIndex: currentQuestionIndex - 1 });
                }
            },

            // Answers
            setAnswer: (questionId, answer) => {
                const { answers } = get();
                set({ answers: { ...answers, [questionId]: answer } });
            },
            setAllAnswers: (answers) => set({ answers }),

            // Timer
            setTimeRemaining: (time) => set({ timeRemaining: time }),
            decrementTime: () => {
                const { timeRemaining } = get();
                if (timeRemaining > 0) {
                    set({ timeRemaining: timeRemaining - 1 });
                }
            },

            // Violations
            incrementViolations: () => {
                const { violations } = get();
                const newCount = violations + 1;
                set({ violations: newCount });
                return newCount;
            },
            setViolations: (count) => set({ violations: count }),

            // Sync
            setLastSync: (date) => set({ lastSync: date }),
            setIsSyncing: (syncing) => set({ isSyncing: syncing }),

            // Exam status
            setIsSubmitted: (submitted) => set({ isSubmitted: submitted }),
            setIsExamStarted: (started) => set({ isExamStarted: started }),

            // Reset
            resetExam: () => set(initialState),
        }),
        {
            name: 'cbt-exam-storage',
            storage: createJSONStorage(() => sessionStorage),
            partialize: (state) => ({
                user: state.user,
                answers: state.answers,
                timeRemaining: state.timeRemaining,
                violations: state.violations,
                currentQuestionIndex: state.currentQuestionIndex,
                isExamStarted: state.isExamStarted,
            }),
        }
    )
);
