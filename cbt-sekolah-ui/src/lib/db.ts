import Dexie, { type EntityTable } from 'dexie';
import type { AnswersRecord } from '@/types';

// Define the exam state interface for IndexedDB
interface ExamStateDB {
    id: string; // id_siswa
    answers: AnswersRecord;
    lastSync: Date;
    timeRemaining: number;
    violations: number;
    currentQuestion: number;
}

// Create Dexie database
const db = new Dexie('CBTExamDB') as Dexie & {
    examState: EntityTable<ExamStateDB, 'id'>;
};

// Define schema
db.version(1).stores({
    examState: 'id, lastSync'
});

export { db };

// ===== HELPER FUNCTIONS =====

/**
 * Save exam state to IndexedDB
 */
export async function saveExamState(state: ExamStateDB): Promise<void> {
    await db.examState.put(state);
}

/**
 * Get exam state from IndexedDB
 */
export async function getExamState(id_siswa: string): Promise<ExamStateDB | undefined> {
    return db.examState.get(id_siswa);
}

/**
 * Update answers in IndexedDB
 */
export async function updateAnswers(id_siswa: string, answers: AnswersRecord): Promise<void> {
    await db.examState.update(id_siswa, {
        answers,
        lastSync: new Date()
    });
}

/**
 * Update time remaining in IndexedDB
 */
export async function updateTimeRemaining(id_siswa: string, timeRemaining: number): Promise<void> {
    await db.examState.update(id_siswa, { timeRemaining });
}

/**
 * Update current question in IndexedDB
 */
export async function updateCurrentQuestion(id_siswa: string, currentQuestion: number): Promise<void> {
    await db.examState.update(id_siswa, { currentQuestion });
}

/**
 * Increment violations in IndexedDB
 */
export async function incrementViolations(id_siswa: string): Promise<number> {
    const state = await db.examState.get(id_siswa);
    const newViolations = (state?.violations || 0) + 1;
    await db.examState.update(id_siswa, { violations: newViolations });
    return newViolations;
}

/**
 * Clear exam state from IndexedDB
 */
export async function clearExamState(id_siswa: string): Promise<void> {
    await db.examState.delete(id_siswa);
}

/**
 * Clear all exam states
 */
export async function clearAllExamStates(): Promise<void> {
    await db.examState.clear();
}
