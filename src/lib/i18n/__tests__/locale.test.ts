import { createLocaleCookie, parseLocale, SUPPORTED_LOCALES } from "../index";

describe("locale preference", () => {
  it("uses Brazilian Portuguese when no supported locale is stored", () => {
    expect(parseLocale(null)).toBe("pt-BR");
    expect(parseLocale("fr")).toBe("pt-BR");
  });

  it("accepts only Portuguese (Brazil) and English", () => {
    expect(parseLocale("en")).toBe("en");
    expect(parseLocale("pt-BR")).toBe("pt-BR");
    expect(SUPPORTED_LOCALES.map(({ code }) => code)).toEqual(["pt-BR", "en"]);
  });

  it("persists the selected locale for one year with SameSite=Lax", () => {
    expect(createLocaleCookie("en", true)).toBe("NEXT_LOCALE=en; Path=/; Max-Age=31536000; SameSite=Lax; Secure");
    expect(createLocaleCookie("pt-BR", false)).toBe("NEXT_LOCALE=pt-BR; Path=/; Max-Age=31536000; SameSite=Lax");
  });
});
