import { describe, expect, it } from "vitest";
import { slugify } from "@/lib/slug";

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("Laugh Track Presents")).toMatch(/^laugh-track-presents-[a-z0-9]{6}$/);
  });

  it("strips non-alphanumeric characters", () => {
    expect(slugify("Foo & Bar!!!")).toMatch(/^foo-bar-[a-z0-9]{6}$/);
  });

  it("trims leading/trailing hyphens from punctuation-only edges", () => {
    expect(slugify("  --Hello--  ")).toMatch(/^hello-[a-z0-9]{6}$/);
  });

  it("falls back to just the random suffix when input has no alphanumerics", () => {
    expect(slugify("!!!")).toMatch(/^[a-z0-9]{6}$/);
  });

  it("appends a different random suffix each call, so two identical names never collide", () => {
    const a = slugify("The Crib");
    const b = slugify("The Crib");
    expect(a).not.toBe(b);
  });
});
