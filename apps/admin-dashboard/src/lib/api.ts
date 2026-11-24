export class ApiError extends Error {
  constructor(message: string, public status: number, public details?: string[]) { super(message); }
}

interface Opts { method?: "GET" | "POST" | "PATCH"; body?: unknown; key?: string }

/** All calls go through the same-origin proxy; tokens never touch page JavaScript. */
export async function api<T>(path: string, { method = "GET", body, key }: Opts = {}): Promise<T> {
  const res = await fetch(`/api/proxy/v1${path}`, {
    method, cache: "no-store",
    headers: { "x-requested-with": "lfg", ...(body ? { "content-type": "application/json" } : {}), ...(method === "POST" ? { "idempotency-key": key ?? crypto.randomUUID() } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  }).catch(() => { throw new ApiError("Can't reach the server. Check your connection.", 0); });
  if (res.status === 401) { window.location.href = "/login"; throw new ApiError("Session expired", 401); }
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new ApiError(data?.message ?? "Something went wrong", res.status, Array.isArray(data?.details) ? data.details : undefined);
  return data as T;
}
