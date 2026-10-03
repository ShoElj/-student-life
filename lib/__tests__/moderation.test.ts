import { describe, expect, it } from "vitest";
import { maskRudeWords, validateDisplayName } from "../moderation";

describe("display names", () => {
  it("accepts any characters, including emoji and other scripts", () => {
    for (const name of ["Amaka", "Z", "Mr. Okafor", "Ọlá 🌟", "李雷", "<b>Tunde</b>", "😎😎😎", "Chi-chi #1"]) {
      expect(validateDisplayName(name)).toBeNull();
    }
  });

  it("only limits empty and very long names", () => {
    expect(validateDisplayName("   ")).toBe("Please enter your name.");
    expect(validateDisplayName("A".repeat(20))).toBeNull();
    expect(validateDisplayName("🌟".repeat(20))).toBeNull();
    expect(validateDisplayName("A".repeat(21))).toMatch(/20 characters/);
  });
});

describe("chat", () => {
  it("masks rude words but keeps the rest of the message", () => {
    expect(maskRudeWords("you are an idiot lol")).toBe("you are an ***** lol");
    expect(maskRudeWords("sh1t happens")).toBe("**** happens");
    expect(maskRudeWords("See you at break! 👋")).toBe("See you at break! 👋");
    expect(maskRudeWords("Dickson passed the class")).toBe("Dickson passed the class");
  });
});
