import { describe, expect, it } from "vitest";
import { parseNaturalDateInput } from "./dateParsing";

describe("parseNaturalDateInput", () => {
  it("parses Craft internal daily note dates", () => {
    const parsed = parseNaturalDateInput("2026.06.11");

    expect(parsed?.getFullYear()).toBe(2026);
    expect(parsed?.getMonth()).toBe(5);
    expect(parsed?.getDate()).toBe(11);
  });

  it("returns undefined for arbitrary free text", () => {
    expect(parseNaturalDateInput("project planning notes")).toBeUndefined();
  });

  it("rejects invalid calendar dates", () => {
    expect(parseNaturalDateInput("2026.02.31")).toBeUndefined();
  });

  it("parses supported German date words when configured", () => {
    const parsed = parseNaturalDateInput("11. Juni 2026", { supportedLanguages: ["de"] });

    expect(parsed?.getFullYear()).toBe(2026);
    expect(parsed?.getMonth()).toBe(5);
    expect(parsed?.getDate()).toBe(11);
  });
});
