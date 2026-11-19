import ptBR from "../messages/pt-BR.json";
import en from "../messages/en.json";
import ptBRStatic from "../messages/static-pt-BR.json";
import enStatic from "../messages/static-en.json";

function leaves(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object") return [prefix];
  return Object.entries(value).flatMap(([key, child]) => leaves(child, prefix ? `${prefix}.${key}` : key));
}

describe("translation catalogs", () => {
  it("contain the same message keys in Portuguese and English", () => {
    expect(leaves(ptBR).sort()).toEqual(leaves(en).sort());
    expect(Object.keys(ptBRStatic).sort()).toEqual(Object.keys(enStatic).sort());
  });

  it("contain finished Portuguese copy without machine service quota placeholders", () => {
    expect(Object.values(ptBRStatic).some((value) => value.includes("MYMEMORY WARNING"))).toBe(false);
  });
});
