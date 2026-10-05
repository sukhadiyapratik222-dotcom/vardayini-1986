import { describe, it, expect } from "vitest";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import { eq } from "drizzle-orm";

describe("PGlite Worker Isolation - File B", () => {
  it("proves Worker B has a fresh PGlite instance and does not see Worker A's row", async () => {
    await ensureSeeded();

    const [found] = await db
      .select()
      .from(categories)
      .where(eq(categories.slug, "temp-category-worker-a"))
      .limit(1);

    // Row from worker A must NOT exist here because each file runs in an isolated worker process
    expect(found).toBeUndefined();
  });
});
