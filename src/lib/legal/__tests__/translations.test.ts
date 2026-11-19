import { privacySections, termsSections } from "@/lib/legal/content";
import { localizeLegalSections } from "@/lib/legal/translations";

describe("legal page localization", () => {
  it("renders Brazilian Portuguese legal sections while preserving English copy", () => {
    const ptPrivacy = localizeLegalSections(privacySections, "pt-BR");
    const enPrivacy = localizeLegalSections(privacySections, "en");
    const ptTerms = localizeLegalSections(termsSections, "pt-BR");

    expect(ptPrivacy[0].title).toBe("Visão geral");
    expect(ptPrivacy[0].title).not.toBe(enPrivacy[0].title);
    expect(ptTerms.find((section) => section.id === "law")?.paragraphs[0]).toContain("leis da Índia");
    expect(enPrivacy[0].title).toBe("Overview");
  });
});
