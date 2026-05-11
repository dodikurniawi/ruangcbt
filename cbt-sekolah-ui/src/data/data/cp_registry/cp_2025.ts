// CP Registry - Kurikulum Nasional 2025 (SK 046/2025)
// Single Brain Source: All CP data loaded from JSON files
// JSON files = Source of Truth

import faseAData from "./cp_2025_faseA.json";
import faseBData from "./cp_2025_faseB.json";
import faseCData from "./cp_2025_faseC.json";
import faseDData from "./cp_2025_faseD.json";
import faseEData from "./cp_2025_faseE.json";
import faseFData from "./cp_2025_faseF.json";

export type CPFaseData = Record<string, any>;

// ============================================
// SINGLE BRAIN SOURCE
// JSON files have nested structure: { "fase_X": { jenjang, mapel } }
// We need to extract the inner object
// ============================================
export const CP_2025: Record<string, CPFaseData> = {
    fase_A: faseAData.fase_A,
    fase_B: faseBData.fase_B,
    fase_C: faseCData.fase_C,
    fase_D: faseDData.fase_D,
    fase_E: faseEData.fase_E,
    fase_F: faseFData.fase_F,
};

export default CP_2025;
