import { cachedJson } from "@/lib/api-cache";

describe("cachedJson", () => {
  it("does not cache identity- or gym-scoped API data in the browser", async () => {
    const response = cachedJson({ gymId: "gym-a" });
    expect(response.headers.get("Cache-Control")).toBe("private, no-store, max-age=0");
    await expect(response.json()).resolves.toEqual({ gymId: "gym-a" });
  });
});
