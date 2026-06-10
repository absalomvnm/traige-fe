export class ApiError extends Error {
  public readonly status: number;
  public readonly body: unknown;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

interface ConstraintViolation {
  field?: string;
  propertyPath?: string;
  message?: string;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function parseMaybeJson(value: unknown): unknown {
  if (typeof value !== "string") return value;

  const text = value.trim();
  if (!text) return value;

  if (!(text.startsWith("{") || text.startsWith("["))) return value;

  try {
    return JSON.parse(text);
  } catch {
    return value;
  }
}

function extractMessage(value: unknown): string | null {
  const parsed = parseMaybeJson(value);

  if (typeof parsed === "string") {
    const text = parsed.trim();
    return text || null;
  }

  const record = asRecord(parsed);
  if (!record) return null;

  const candidates = [record.message, record.error, record.detail, record.details, record.title];
  for (const candidate of candidates) {
    const nested = extractMessage(candidate);
    if (nested) return nested;
  }

  return null;
}

function stripFieldPrefix(message: string): string {
  const text = message.trim();
  const colonIndex = text.indexOf(":");
  if (colonIndex <= 0) return text;

  const prefix = text.slice(0, colonIndex).trim();
  const body = text.slice(colonIndex + 1).trim();
  if (!body) return text;

  const looksLikePath = prefix.includes(".") || prefix.includes("[") || /^arg\d+/i.test(prefix) || /\binput\b/i.test(prefix);
  if (!looksLikePath) return text;

  return body;
}

function extractViolationMessages(violations: unknown): string[] {
  if (!Array.isArray(violations)) return [];

  return violations
    .map((item) => {
      const violation = asRecord(parseMaybeJson(item)) as ConstraintViolation | null;
      if (!violation) return "";

      const field = (violation.field || violation.propertyPath || "").trim();
      const text = stripFieldPrefix(extractMessage(violation.message) ?? "");
      if (!text) return "";

      return field ? text : text;
    })
    .filter(Boolean);
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (!isApiError(error)) return fallback;

  const body = asRecord(parseMaybeJson(error.body));
  if (!body) return fallback;

  const message = stripFieldPrefix(extractMessage(body.message) ?? "");
  if (message) {
    return message;
  }

  const violations = extractViolationMessages(body.violations);

  if (violations.length > 0) {
    return violations.join("\n");
  }

  const title = stripFieldPrefix(extractMessage(body.title) ?? "");
  if (title) {
    return title;
  }

  return fallback;
}
