import { beforeEach, vi } from "vitest";
import { mockCookieStore } from "../helpers/cookies";
import path from "path";

// 1. Fail immediately if DATABASE_URL is set to guarantee tests only run against in-memory PGlite
if (process.env.DATABASE_URL) {
  throw new Error(
    "SAFETY VIOLATION: DATABASE_URL is set in environment! Tests must NEVER touch real store database. Only in-memory PGlite is allowed."
  );
}

// 2. Set test SESSION_SECRET
process.env.SESSION_SECRET = process.env.SESSION_SECRET || "test-vitest-session-secret-9876543210-secure";
Object.assign(process.env, { NODE_ENV: "test", VARDAYINI_TEST_MODE: "true" });

// 3. Register global mock for next/headers cookies()
vi.mock("next/headers", () => {
  return {
    cookies: async () => mockCookieStore,
    headers: async () => new Headers(),
  };
});

// 4. Hard safety guard: Protect ui-config.json against any write in tests
vi.mock("fs/promises", async (importOriginal) => {
  const actual = await importOriginal<any>();
  const mockedWriteFile = async (filePath: any, data: any, options: any) => {
    const resolved = path.resolve(String(filePath));
    if (resolved.toLowerCase().includes("ui-config.json")) {
      throw new Error(
        "SAFETY VIOLATION: Tests must never modify the real ui-config.json file! Calling PUT with valid auth is strictly prohibited in tests."
      );
    }
    return actual.writeFile(filePath, data, options);
  };

  return {
    ...actual,
    ...(actual.default ? { default: { ...actual.default, writeFile: mockedWriteFile } } : {}),
    writeFile: mockedWriteFile,
  };
});

// 5. Reset mock cookie store before each test
beforeEach(() => {
  mockCookieStore.clear();
});
