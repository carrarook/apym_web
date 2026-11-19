import { formatCurrency, formatDate, formatNumber } from "../format";

describe("locale-aware formatting", () => {
  it("formats dates, numbers, and currency for the selected locale", () => {
    expect(formatNumber(1234.5, "pt-BR")).toBe("1.234,5");
    expect(formatNumber(1234.5, "en")).toBe("1,234.5");
    expect(formatCurrency(1234.5, "pt-BR")).toContain("₹");
    expect(formatCurrency(1234.5, "en")).toContain("₹");
    expect(formatDate("2026-01-02T12:00:00Z", "en")).toContain("Jan");
    expect(formatDate("2026-01-02T12:00:00Z", "pt-BR")).toContain("de");
  });
});
