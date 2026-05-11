// CP Registry Utilities
// Fungsi-fungsi untuk mengakses database Capaian Pembelajaran

import CP_2025 from './cp_2025';
import type { PhaseName, CPElement, PhaseData } from '@/types';

// ============================================
// Phase Mapping: Kelas → Fase
// ============================================

interface ClassMapping {
    jenjang: 'SD' | 'SMP' | 'SMA';
    kelas: number;
    fase: PhaseName;
}

const CLASS_TO_PHASE: ClassMapping[] = [
    // SD
    { jenjang: 'SD', kelas: 1, fase: 'fase_A' },
    { jenjang: 'SD', kelas: 2, fase: 'fase_A' },
    { jenjang: 'SD', kelas: 3, fase: 'fase_B' },
    { jenjang: 'SD', kelas: 4, fase: 'fase_B' },
    { jenjang: 'SD', kelas: 5, fase: 'fase_C' },
    { jenjang: 'SD', kelas: 6, fase: 'fase_C' },
    // SMP
    { jenjang: 'SMP', kelas: 7, fase: 'fase_D' },
    { jenjang: 'SMP', kelas: 8, fase: 'fase_D' },
    { jenjang: 'SMP', kelas: 9, fase: 'fase_D' },
    // SMA
    { jenjang: 'SMA', kelas: 10, fase: 'fase_E' },
    { jenjang: 'SMA', kelas: 11, fase: 'fase_F' },
    { jenjang: 'SMA', kelas: 12, fase: 'fase_F' },
];

/**
 * Get phase (Fase) based on jenjang and kelas
 * @param jenjang - SD, SMP, or SMA
 * @param kelas - Class number (1-12)
 * @returns Phase name (fase_A to fase_F) or null if not found
 */
export function getPhaseByClass(jenjang: 'SD' | 'SMP' | 'SMA', kelas: number): PhaseName | null {
    const mapping = CLASS_TO_PHASE.find(
        (m) => m.jenjang === jenjang && m.kelas === kelas
    );
    return mapping?.fase ?? null;
}

/**
 * Get human-readable phase label
 * @param fase - Phase name
 * @returns Human readable label like "Fase A (SD Kelas 1-2)"
 */
export function getPhaseLabel(fase: PhaseName): string {
    const phaseData = CP_2025[fase];
    if (!phaseData) return fase;

    const faseChar = fase.replace('fase_', '');
    return `Fase ${faseChar} (${phaseData.jenjang})`;
}

/**
 * Get jenjang description
 * @param fase - Phase name
 * @returns Jenjang description like "SD Kelas 1-2"
 */
export function getJenjangByPhase(fase: PhaseName): string {
    return CP_2025[fase]?.jenjang ?? '';
}

// ============================================
// Subject (Mapel) Functions
// ============================================

/**
 * Get all available subjects for a phase
 * @param fase - Phase name
 * @returns Array of subject names
 */
export function getSubjectsByPhase(fase: PhaseName): string[] {
    const phaseData = CP_2025[fase];
    if (!phaseData) return [];

    const subjects = Object.keys(phaseData.mapel);

    // Also include optional subjects if available
    if (phaseData.mata_pelajaran_pilihan) {
        subjects.push(...Object.keys(phaseData.mata_pelajaran_pilihan));
    }

    return subjects.sort();
}

/**
 * Get CP (Capaian Pembelajaran) for a specific phase and subject
 * @param fase - Phase name
 * @param mapel - Subject name
 * @returns CPElement with elemen details, or null if not found
 */
export function getCPByPhaseAndSubject(fase: PhaseName, mapel: string): CPElement | null {
    const phaseData = CP_2025[fase];
    if (!phaseData) return null;

    // Check regular subjects first
    if (phaseData.mapel[mapel]) {
        return phaseData.mapel[mapel];
    }

    // Check optional subjects
    if (phaseData.mata_pelajaran_pilihan?.[mapel]) {
        return phaseData.mata_pelajaran_pilihan[mapel];
    }

    return null;
}

/**
 * Get CP text formatted for AI prompt
 * @param fase - Phase name
 * @param mapel - Subject name
 * @returns Formatted string of all CP elements
 */
export function getCPTextForPrompt(fase: PhaseName, mapel: string): string {
    const cp = getCPByPhaseAndSubject(fase, mapel);
    if (!cp) return '';

    const lines: string[] = [];
    for (const [elemen, deskripsi] of Object.entries(cp.elemen)) {
        lines.push(`**${elemen}**: ${deskripsi}`);
    }

    return lines.join('\n\n');
}

// ============================================
// Dropdown Data Helpers
// ============================================

/**
 * Get available classes for a jenjang
 * @param jenjang - SD, SMP, or SMA
 * @returns Array of class numbers
 */
export function getClassesByJenjang(jenjang: 'SD' | 'SMP' | 'SMA'): number[] {
    switch (jenjang) {
        case 'SD':
            return [1, 2, 3, 4, 5, 6];
        case 'SMP':
            return [7, 8, 9];
        case 'SMA':
            return [10, 11, 12];
        default:
            return [];
    }
}

/**
 * Get all jenjang options
 * @returns Array of jenjang options with labels
 */
export function getJenjangOptions(): { value: 'SD' | 'SMP' | 'SMA'; label: string }[] {
    return [
        { value: 'SD', label: 'SD (Sekolah Dasar)' },
        { value: 'SMP', label: 'SMP (Sekolah Menengah Pertama)' },
        { value: 'SMA', label: 'SMA/SMK (Sekolah Menengah Atas)' },
    ];
}

// ============================================
// Validation
// ============================================

/**
 * Check if a subject exists in a phase
 * @param fase - Phase name
 * @param mapel - Subject name
 * @returns True if subject exists
 */
export function isValidSubjectForPhase(fase: PhaseName, mapel: string): boolean {
    return getCPByPhaseAndSubject(fase, mapel) !== null;
}

/**
 * Get all available phases
 * @returns Array of phase names
 */
export function getAllPhases(): PhaseName[] {
    return Object.keys(CP_2025) as PhaseName[];
}
