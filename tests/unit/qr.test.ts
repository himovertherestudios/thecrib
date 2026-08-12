import { describe, expect, it } from "vitest";
import { generateQrDataUrl } from "@/lib/qr";

describe("generateQrDataUrl", () => {
  it("returns a PNG data URL", async () => {
    const dataUrl = await generateQrDataUrl("https://thecrib.example.com/check-in?show=abc");
    expect(dataUrl).toMatch(/^data:image\/png;base64,/);
  });

  it("encodes different input into different output", async () => {
    const a = await generateQrDataUrl("https://thecrib.example.com/check-in?show=aaa");
    const b = await generateQrDataUrl("https://thecrib.example.com/check-in?show=bbb");
    expect(a).not.toBe(b);
  });
});
