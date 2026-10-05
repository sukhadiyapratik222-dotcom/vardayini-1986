export interface RequestBuilderOptions {
  method?: string;
  url?: string;
  body?: any;
  rawBody?: string | Buffer | Uint8Array;
  headers?: Record<string, string>;
  searchParams?: Record<string, string | number | boolean>;
  cookies?: Record<string, string>;
}

export function buildRequest(options: RequestBuilderOptions = {}): Request {
  const method = (
    options.method ||
    (options.body !== undefined || options.rawBody !== undefined ? "POST" : "GET")
  ).toUpperCase();

  const pathOrUrl = options.url || "http://localhost:9449/api";
  const urlObj = new URL(
    pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")
      ? pathOrUrl
      : `http://localhost:9449${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`
  );

  if (options.searchParams) {
    for (const [key, value] of Object.entries(options.searchParams)) {
      urlObj.searchParams.set(key, String(value));
    }
  }

  const headers = new Headers(options.headers || {});

  let body: BodyInit | null = null;
  if (options.rawBody !== undefined) {
    body = options.rawBody as BodyInit;
  } else if (options.body !== undefined) {
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    body = typeof options.body === "string" ? options.body : JSON.stringify(options.body);
  }

  if (options.cookies) {
    const cookieHeader = Object.entries(options.cookies)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join("; ");
    headers.set("cookie", cookieHeader);
  }

  return new Request(urlObj.toString(), {
    method,
    headers,
    body: method === "GET" || method === "HEAD" ? null : body,
  });
}
