import { describe, it, expect } from "vitest";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import { eq } from "drizzle-orm";

describe("PGlite Worker Isolation - File A", () => {
  it("inserts an isolated row in this worker's PGlite instance", async () => {
    await ensureSeeded();

    await db.insert(categories).values({
      name: "Temporary Isolated Sweet Category A",
      slug: "temp-category-worker-a",
      description: "Should only exist in worker A",
      imageUrl: "/images/test.jpg",
      sortOrder: 999,
    });

    const [found] = await db
      .select()
      .from(categories)
      .where(eq(categories.slug, "temp-category-worker-a"))
      .limit(1);

    expect(found).toBeDefined();
    expect(found.slug).toBe("temp-category-worker-a");
  });
});
