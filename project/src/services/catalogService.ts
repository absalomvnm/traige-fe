/**
 * catalogService — module-level singleton for read-only catalog data.
 *
 * Fetches four endpoints once after auth:
 *   GET /catalog/priorities
 *   GET /catalog/symptoms
 *   GET /catalog/presenting-conditions
 *   GET /catalog/obstetric-conditions
 *
 * Exposes:
 *   catalogService.load()    — call after /auth/me succeeds
 *   useCatalogs()            — React hook (useSyncExternalStore)
 *   priorityById(id)         — CatalogPriority | undefined
 *   priorityColor(id)        — hex string (catalog or fallback)
 *   priorityLabel(id)        — label string (catalog or fallback)
 *   obstetricConditionById(id)
 *   obstetricConditionByCode(code)
 */

import { useSyncExternalStore } from "react";
import type {
  CatalogPriority,
  CatalogSymptom,
  CatalogPresentingCondition,
  CatalogObstetricCondition,
} from "./Patientservice";

import { PATIENT_API_BASE_URL } from "../config/env";

const BASE_URL = PATIENT_API_BASE_URL;

// ─── State ────────────────────────────────────────────────────────────────────

export interface CatalogState {
  priorities: CatalogPriority[];
  symptoms: CatalogSymptom[];
  presentingConditions: CatalogPresentingCondition[];
  obstetricConditions: CatalogObstetricCondition[];
  loaded: boolean;
  error: string | null;
}

const DEFAULT_STATE: CatalogState = {
  priorities: [],
  symptoms: [],
  presentingConditions: [],
  obstetricConditions: [],
  loaded: false,
  error: null,
};

let state: CatalogState = { ...DEFAULT_STATE };
const listeners = new Set<() => void>();
let loadPromise: Promise<void> | null = null;

function notify() {
  listeners.forEach((fn) => fn());
}

function getSnapshot(): CatalogState {
  return state;
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// ─── Fetch ────────────────────────────────────────────────────────────────────

async function fetchJson<T>(path: string, token?: string | null): Promise<T> {
  const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await fetch(`${BASE_URL}${path}`, { headers });
  if (!res.ok) throw new Error(`[CATALOG] ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

async function loadOnce(): Promise<void> {
  const token = localStorage.getItem("obsa.auth.token");
  try {
    const [priorities, symptoms, presentingConditions, obstetricConditions] = await Promise.all([
      fetchJson<CatalogPriority[]>("/catalog/priorities", token),
      fetchJson<CatalogSymptom[]>("/catalog/symptoms", token),
      fetchJson<CatalogPresentingCondition[]>("/catalog/presenting-conditions", token),
      fetchJson<CatalogObstetricCondition[]>("/catalog/obstetric-conditions", token),
    ]);

    state = {
      priorities: Array.isArray(priorities) ? priorities : [],
      symptoms: Array.isArray(symptoms) ? symptoms : [],
      presentingConditions: Array.isArray(presentingConditions) ? presentingConditions : [],
      obstetricConditions: Array.isArray(obstetricConditions) ? obstetricConditions : [],
      loaded: true,
      error: null,
    };
    console.log("[CATALOG] Loaded:", {
      priorities: state.priorities.length,
      symptoms: state.symptoms.length,
      presentingConditions: state.presentingConditions.length,
      obstetricConditions: state.obstetricConditions.length,
    });
  } catch (err) {
    console.warn("[CATALOG] Load failed — app will use fallback colors/labels:", err);
    state = { ...state, loaded: true, error: String(err) };
  }
  notify();
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const catalogService = {
  /** Call once after authentication succeeds. Idempotent — safe to call multiple times. */
  load(): Promise<void> {
    if (!loadPromise) {
      loadPromise = loadOnce();
    }
    return loadPromise;
  },

  /** Reset (for logout / re-login). */
  reset() {
    loadPromise = null;
    state = { ...DEFAULT_STATE };
    notify();
  },
};

// ─── React hook ───────────────────────────────────────────────────────────────

export function useCatalogs(): CatalogState {
  return useSyncExternalStore(subscribe, getSnapshot);
}

// ─── Fallback colours (when catalog not yet loaded) ───────────────────────────

const FALLBACK_COLORS: Record<number, string> = {
  1: "#DC2626",
  2: "#D8D365",
  3: "#C8C480",
  4: "#16A34A",
};

const FALLBACK_LABELS: Record<number, string> = {
  1: "Emergency",
  2: "Very Urgent",
  3: "Urgent",
  4: "Non-Urgent",
};

// ─── Lookup helpers (synchronous, use module-level state) ─────────────────────

export function priorityById(id: number): CatalogPriority | undefined {
  return state.priorities.find((p) => p.id === id);
}

/**
 * Returns the hex color for a priority id.
 * Prefers our design palette (FALLBACK_COLORS) over API colorCode to keep
 * the UI consistent with the brand. Falls back to API value, then grey.
 */
export function priorityColor(id: number): string {
  return FALLBACK_COLORS[id] ?? state.priorities.find((p) => p.id === id)?.colorCode ?? "#6B7280";
}

/**
 * Returns the label for a priority id.
 * Falls back to hardcoded labels if catalog is not yet loaded.
 */
export function priorityLabel(id: number): string {
  return state.priorities.find((p) => p.id === id)?.label ?? FALLBACK_LABELS[id] ?? `P${id}`;
}

export function priorityTargetTime(id: number): string {
  return state.priorities.find((p) => p.id === id)?.targetTime ?? "";
}

export function obstetricConditionById(id: number): CatalogObstetricCondition | undefined {
  return state.obstetricConditions.find((c) => c.id === id);
}

export function obstetricConditionByCode(code: string): CatalogObstetricCondition | undefined {
  return state.obstetricConditions.find((c) => c.code === code);
}

/**
 * Convert an obstetric-condition code like "GESTATIONAL_HYPERTENSION"
 * into a human-readable name. Prefers the catalog when available
 * (so codes match canonical names), otherwise title-cases the code.
 */
export function formatConditionCode(code: string): string {
  if (!code) return "";
  const upper = String(code).toUpperCase();
  const lower = String(code).toLowerCase();
  return (
    obstetricConditionByCode(upper)?.name
    ?? obstetricConditionByCode(lower)?.name
    ?? obstetricConditionByCode(code)?.name
    ?? upper
      .split(/[_\s-]+/)
      .filter(Boolean)
      .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
      .join(" ")
  );
}

/**
 * Best-effort parser for the assessment.aiConditionsJson field.
 * The backend stores this as a stringified JSON object containing
 * { condition, conditionConfidence, topConditions: [{ condition, probability }] }.
 * Returns null on any failure.
 */
export function parseAiConditions(raw: any): { condition?: string; conditionConfidence?: number; topConditions?: Array<{ condition: string; probability: number }> } | null {
  if (!raw) return null;
  try {
    const obj = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!obj || typeof obj !== "object") return null;
    return obj;
  } catch {
    return null;
  }
}

/**
 * Resolve the human-readable obstetric condition name for a patient or alert.
 * Resolution order (only true obstetric conditions — never sign/symptom keys):
 *  1. latestAssessment.obstetricConditions[0] → catalog lookup by id
 *  2. latestAssessment.triggeredRules[].obstetric_condition_code → catalog lookup by code
 *  3. latestAssessment.aiConditionsJson → top AI condition code
 *  4. Returns "" if no real obstetric condition can be resolved.
 *
 * NOTE: We deliberately do NOT fall back to `cond` / `condition` strings because
 * those typically hold sign/symptom keys (e.g. "stridor"), not real conditions.
 */
export function resolveConditionName(obj: any): string {
  const la = obj?.latestAssessment ?? obj;
  const oc = Array.isArray(la?.obstetricConditions) ? la.obstetricConditions : [];
  // Prefer MANUAL/RULE source over AI when multiple are present
  const sorted = [...oc].sort((a, b) => {
    const rank = (s: string) => (s === "MANUAL" ? 0 : s === "RULE" ? 1 : 2);
    return rank(a?.source) - rank(b?.source);
  });
  for (const item of sorted) {
    if (item?.name) return item.name;
    const found = obstetricConditionById(item?.obstetricConditionId);
    if (found?.name) return found.name;
    if (item?.code) {
      const byCode = obstetricConditionByCode(item.code);
      if (byCode?.name) return byCode.name;
      return formatConditionCode(item.code);
    }
  }
  const tr = Array.isArray(la?.triggeredRules) ? la.triggeredRules : [];
  for (const r of tr) {
    const code = r?.obstetric_condition_code ?? r?.obstetricConditionCode;
    if (code) {
      return formatConditionCode(code);
    }
  }
  const ai = parseAiConditions(la?.aiConditionsJson ?? obj?.aiConditionsJson);
  if (ai?.condition) return formatConditionCode(ai.condition);
  const top = ai?.topConditions?.[0]?.condition;
  if (top) return formatConditionCode(top);
  return "";
}

/**
 * Returns the resolved obstetric condition source ("MANUAL" | "RULE" | "AI" | "")
 * so callers can show a small "via Rule" / "via AI" badge alongside the name.
 */
export function resolveConditionSource(obj: any): "MANUAL" | "RULE" | "AI" | "" {
  const la = obj?.latestAssessment ?? obj;
  const oc = Array.isArray(la?.obstetricConditions) ? la.obstetricConditions : [];
  const sorted = [...oc].sort((a, b) => {
    const rank = (s: string) => (s === "MANUAL" ? 0 : s === "RULE" ? 1 : 2);
    return rank(a?.source) - rank(b?.source);
  });
  if (sorted[0]?.source === "MANUAL" || sorted[0]?.source === "RULE" || sorted[0]?.source === "AI") return sorted[0].source;
  const tr = Array.isArray(la?.triggeredRules) ? la.triggeredRules : [];
  if (tr.some((r: any) => r?.obstetric_condition_code || r?.obstetricConditionCode)) return "RULE";
  const ai = parseAiConditions(la?.aiConditionsJson ?? obj?.aiConditionsJson);
  if (ai?.condition || ai?.topConditions?.[0]?.condition) return "AI";
  return "";
}
