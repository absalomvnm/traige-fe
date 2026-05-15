import type { AppState, AppAction } from "../types";

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "SET_SCREEN":
      return { ...state, screen: action.screen };
    case "SET_RESULT":
      return { ...state, result: action.result };
    case "SET_SELECTED_PATIENT":
      return { ...state, selectedPatient: action.patient };
    case "SET_PATIENTS":
      return { ...state, patients: action.patients };
    case "UPDATE_PATIENT":
      return {
        ...state,
        patients: state.patients.map((p) =>
          p.id === action.patient.id ? action.patient : p
        ),
        selectedPatient:
          state.selectedPatient?.id === action.patient.id
            ? action.patient
            : state.selectedPatient,
      };
    case "ADD_PATIENT":
      return { ...state, patients: [action.patient, ...state.patients] };
    case "SET_TRIAGE_DRAFT":
      return { ...state, triageDraft: action.draft };
    case "INCREMENT_TRIAGE_VERSION":
      return { ...state, triageVersion: state.triageVersion + 1 };
    case "SET_SEARCH_OPEN":
      return { ...state, searchOpen: action.open };
    default:
      return state;
  }
}
