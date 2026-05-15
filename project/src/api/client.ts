import { API_BASE_URL } from "./config";
import { ApiError } from "./errors";

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface RequestOptions {
  method?: Method;
  body?: unknown;
  token?: string;
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();
  return text.length > 0 ? text : undefined;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, token } = options;
  const url = `${API_BASE_URL}${path}`;

  console.log(`[API] ${method} ${path}`, { hasAuth: !!token, body: body || "(no body)" });

  try {
    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    const parsedBody = await parseResponseBody(response);

    if (!response.ok) {
      console.error(`[API] ${method} ${path} failed with status ${response.status}`, parsedBody);
      const message = `Request failed with status ${response.status}`;
      throw new ApiError(message, response.status, parsedBody);
    }

    console.log(`[API] ${method} ${path} succeeded (${response.status})`);
    return parsedBody as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error; // Already logged above
    }
    console.error(`[API] ${method} ${path} network error:`, error);
    throw error;
  }
}
