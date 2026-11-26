// Pilot-3 item 2: the real CNAM presentations (code_pct, data/reference/cnam-vei-2026-11-06.csv)
// that the simulated reports name, so the demo site shows « Présentations signalées ». Spread
// over two or three products per molecule, the first named most often. A code missing from the
// catalogue is skipped; with none, the reports name no product.
import { DEMO_SHORTAGE_MOLECULE, NATIONAL_MOLECULES } from './showcase';

export const DEMO_PRESENTATION_CODES: Readonly<Record<string, readonly string[]>> = {
  // EPITAM 100mg/ml Sol Buv Fl 240ml, EPIXX 500mg Comp Pell Bt 50, EPILEPTA 500mg Comp Pell Séc Bt 60
  [DEMO_SHORTAGE_MOLECULE]: ['106811', '105727', '303673'],
  // TAMIFEN DS 20mg Comp Bt 30, EBEFEN Comp 20 MG BT 30
  [NATIONAL_MOLECULES.probable]: ['105999', '104360'],
  // METFORAL Comp 850mg Bt 30, DIABITOS 850 MG Comp Pell Sec BT 30
  [NATIONAL_MOLECULES.watchLocal]: ['309830', '302616'],
  // CIPROCINE 500mg Comp Pell Séc Bt 14, CIPROFLEX 500 Comp Pell 500 MG BT 14
  [NATIONAL_MOLECULES.cleared]: ['303506', '302379'],
};

/** Which product the n-th simulated report of a molecule names: mostly the first, then the others. */
const PATTERN = [0, 1, 0, 2, 0, 1, 0] as const;

export function demoMedicineFor(medicineIds: readonly string[], n: number): string | null {
  if (medicineIds.length === 0) return null;
  return medicineIds[PATTERN[n % PATTERN.length] % medicineIds.length];
}
