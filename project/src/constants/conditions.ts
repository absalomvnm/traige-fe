import type { ConditionOption } from "../types";


export const CONDITIONS: ConditionOption[] = [
  { v: "", lb: "Select presenting sign or symptom…" },
  { v: "proteinuria_2plus", lb: "Proteinuria 2+" },
  { v: "fitting_seizures", lb: "Fitting/seizures" },
  { v: "generalized_oedema", lb: "Generalized oedema" },
  { v: "visual_disturbances", lb: "Visual disturbances" },
  { v: "epigastric_pain", lb: "Epigastric pain" },
  { v: "active_vaginal_bleeding", lb: "Active vaginal bleeding" },
  { v: "prolapse_cord", lb: "Prolapse cord" },
  { v: "ruptured_membranes", lb: "Ruptured membranes" },
  { v: "stridor", lb: "Stridor" },
  { v: "cervical_shortening", lb: "Cervical shortening" },
  { v: "altered_mental_status", lb: "Altered mental status" },
  { v: "diffuse_crackles", lb: "Diffuse crackles" },
  { v: "glycosuria", lb: "Glycosuria" },
  { v: "mild_regular_contractions", lb: "Mild regular contractions" },
  { v: "moderate_regular_contractions", lb: "Moderate regular contractions" },
  { v: "severe_regular_contractions", lb: "Severe regular contractions" },
  { v: "irregular_contractions", lb: "Irregular contractions" },
  { v: "severe_headache", lb: "Severe headache" },
  { v: "frontal_headache", lb: "Frontal headache" },
  { v: "chills", lb: "Chills" },
  { v: "chest_pain", lb: "Chest pain" },
  { v: "fever", lb: "Fever" },
  { v: "swelling_of_face", lb: "Swelling of Face" },
  { v: "peripheral_oedema", lb: "Peripheral oedema" },
  { v: "dizziness", lb: "Dizziness" },
];

export const CONDITION_LABELS = CONDITIONS.reduce(
  (acc: Record<string, string>, item) => {
    if (item.v) acc[item.v] = item.lb;
    return acc;
  },
  {}
);