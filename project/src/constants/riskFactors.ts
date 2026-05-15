import type { RiskFactor } from "../types";

export const RISK_FACTORS: RiskFactor[] = [
  { k: "previous_caesarean",    l: "Previous Caesarean Section" },
  { k: "chronic_hypertension",  l: "Chronic Hypertension" },
  { k: "diabetes_mellitus",     l: "Diabetes Mellitus (pre-existing)" },
  { k: "grand_multiparity",     l: "Grand Multiparity (≥5 deliveries)" },
  { k: "advanced_maternal_age", l: "Advanced Maternal Age (≥35 years)" },
  { k: "multiple_pregnancy",    l: "Multiple Pregnancy (twins/triplets)" },
  { k: "rhesus_incompatibility",l: "Rhesus Incompatibility" },
  { k: "hiv_positive",          l: "HIV Positive" },
  { k: "severe_anaemia",        l: "Severe Anaemia (Hb <7 g/dL)" },
  { k: "previous_pph",          l: "Previous Post-Partum Haemorrhage" },
];
