import { describe, expect, it } from "vitest";
import { MARK_IDS, createDesign, createLayer, type Design } from "./design.ts";
import { renderDesign, toSvgString } from "./render.ts";
import { EXPORT_SIZE, hasOnlyInlinedMarks, pngFileName } from "./export.ts";

function everyMark(): Design {
  return createDesign({
    name: "Everything",
    garment: "hoodie",
    layers: MARK_IDS.map((markId) => createLayer(markId, "hoodie")),
  });
}

describe("inlined artwork", () => {
  // The single most likely way the export breaks: an SVG rasterised through an
  // Image never fetches external hrefs, so it would export a blank garment.
  it("inlines every mark of every design as a data URI", () => {
    for (const colour of ["black", "white"] as const) {
      const svg = toSvgString(renderDesign(createDesign({ ...everyMark(), colour }), EXPORT_SIZE));
      const hrefs = [...svg.matchAll(/href="([^"]*)"/g)].map((match) => match[1]);
      expect(hrefs).toHaveLength(MARK_IDS.length);
      for (const href of hrefs) expect(href.startsWith("data:")).toBe(true);
      expect(hasOnlyInlinedMarks(svg)).toBe(true);
    }
  });

  it("rejects a document that references artwork by URL", () => {
    expect(hasOnlyInlinedMarks('<image href="/brand/mark-otter.png"/>')).toBe(false);
    expect(hasOnlyInlinedMarks('<image xlink:href="/brand/mark-otter.png"/>')).toBe(false);
    expect(hasOnlyInlinedMarks("<svg><path d=\"M0 0\"/></svg>")).toBe(true);
  });

  it("exports at 2000px and renders two different designs differently", () => {
    const svg = toSvgString(renderDesign(everyMark(), EXPORT_SIZE));
    expect(EXPORT_SIZE).toBe(2000);
    expect(svg).toContain('width="2000"');
    const other = toSvgString(
      renderDesign(createDesign({ ...everyMark(), garment: "cap", colour: "white" }), EXPORT_SIZE),
    );
    expect(svg).not.toEqual(other);
  });
});

describe("pngFileName", () => {
  it("derives a sanitised name from the design name", () => {
    expect(pngFileName("Otter hoodie")).toBe("otter-hoodie.png");
    expect(pngFileName("  Devin/Logo: tee!  ")).toBe("devin-logo-tee.png");
    expect(pngFileName("Café ☕")).toBe("cafe.png");
  });

  it("never produces an empty or path-like name", () => {
    expect(pngFileName("")).toBe("design.png");
    expect(pngFileName("../../etc/passwd")).toBe("etc-passwd.png");
    expect(pngFileName("x".repeat(200))).toBe(`${"x".repeat(60)}.png`);
  });
});
