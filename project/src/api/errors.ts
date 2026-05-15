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

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (!isApiError(error)) return fallback;

  const body = asRecord(error.body);
  if (!body) return fallback;

  const message = body.message;
  if (typeof message === "string" && message.trim()) {
    return message;
  }

  const title = body.title;
  const violations = body.violations;

  if (Array.isArray(violations) && violations.length > 0) {
    const violationMessages = violations
      .map((item) => {
        const violation = asRecord(item) as ConstraintViolation | null;
        if (!violation) return "";

        const field = (violation.field || violation.propertyPath || "").trim();
        const text = (violation.message || "").trim();
        if (!text) return "";

        return field ? `${field}: ${text}` : text;
      })
      .filter(Boolean);

    if (violationMessages.length > 0) {
      return violationMessages.join("\n");
    }
  }

  if (typeof title === "string" && title.trim()) {
    return title;
  }

  return fallback;
}
