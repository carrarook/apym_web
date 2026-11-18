import { NextResponse } from "next/server";

/** Return user-specific API data without a browser cache across identity or gym changes. */
export function cachedJson<T>(data: T, init?: ResponseInit): NextResponse {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", "private, no-store, max-age=0");
  return NextResponse.json(data, { ...init, headers });
}

/** No-cache JSON for frequently mutating dashboard payloads. */
export function noStoreJson<T>(data: T, init?: ResponseInit): NextResponse {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", "no-store, max-age=0");
  return NextResponse.json(data, { ...init, headers });
}
