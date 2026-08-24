import { describe, expect, it } from "vitest";
import { COLOURWAYS, GARMENTS, createDesign, type Design, type Layer } from "./design.ts";
import { PALETTES, renderDesign, toReactSvg, toSvgString, type Scene } from "./render.ts";

function layer(overrides: Partial<Layer> = {}): Layer {
  return { id: "l1", markId: "devin", x: 0.5, y: 0.5, scale: 0.6, rotation: 0, ...overrides };
}

function design(overrides: Partial<Design> = {}): Design {
  return createDesign({ layers: [layer()], ...overrides });
}

/** Everything in the scene, expressed as a fraction of the render size. */
function normalise(scene: Scene) {
  const fraction = (value: number) => Number((value / scene.size).toFixed(9));
  return {
    unitScale: fraction(scene.unitScale),
    printable: {
      x: fraction(scene.printable.x),
      y: fraction(scene.printable.y),
      width: fraction(scene.printable.width),
      height: fraction(scene.printable.height),
    },
    marks: scene.marks.map((mark) => ({
      layerId: mark.layerId,
      x: fraction(mark.x),
      y: fraction(mark.y),
      width: fraction(mark.width),
      height: fraction(mark.height),
      cx: fraction(mark.cx),
      cy: fraction(mark.cy),
      rotation: mark.rotation,
      href: mark.href,
    })),
    parts: scene.parts,
  };
}

describe("renderDesign", () => {
  it("renders the same geometry at every size, up to a uniform scale", () => {
    const subject = design({
      garment: "hoodie",
      layers: [layer({ id: "a", markId: "otter", x: 0.3, y: 0.7, scale: 0.4, rotation: 15 })],
    });
    const [small, medium, large] = [320, 800, 2000].map((size) =>
      normalise(renderDesign(subject, size)),
    );
    expect(medium).toEqual(small);
    expect(large).toEqual(small);
  });

  it("keeps z-order as layer order, bottom first", () => {
    const subject = design({
      layers: [
        layer({ id: "bottom", markId: "cognition" }),
        layer({ id: "middle", markId: "otter" }),
        layer({ id: "top", markId: "devin" }),
      ],
    });
    const scene = renderDesign(subject, 800);
    expect(scene.marks.map((mark) => mark.layerId)).toEqual(["bottom", "middle", "top"]);
    const svg = toSvgString(scene);
    expect(svg.indexOf('data-layer-id="bottom"')).toBeLessThan(
      svg.indexOf('data-layer-id="top"'),
    );
  });

  it("places and rotates a layer inside the printable area", () => {
    const subject = design({
      garment: "tshirt",
      layers: [layer({ markId: "cognition", x: 0.25, y: 0.75, scale: 0.5, rotation: 30 })],
    });
    const size = 1000;
    const scene = renderDesign(subject, size);
    const [mark] = scene.marks;
    // tee printable area: x .30-.70, y .28-.62 of the square.
    expect(mark.cx).toBeCloseTo(300 + 0.25 * 400);
    expect(mark.cy).toBeCloseTo(280 + 0.75 * 340);
    expect(mark.width).toBeCloseTo(0.5 * 400);
    // The Cognition mark is square, so the box is too.
    expect(mark.height).toBeCloseTo(mark.width);
    expect(mark.x).toBeCloseTo(mark.cx - mark.width / 2);
    expect(mark.y).toBeCloseTo(mark.cy - mark.height / 2);
    expect(mark.rotation).toBe(30);
    expect(toSvgString(scene)).toContain(`rotate(30 ${mark.cx} ${mark.cy})`);
  });

  it("inks the monochrome marks with the garment's contrast colour", () => {
    function inkOf(colour: "black" | "white", markId: "cognition" | "devin") {
      const scene = renderDesign(design({ colour, layers: [layer({ markId })] }), 400);
      const svg = atob(scene.marks[0].href.replace("data:image/svg+xml;base64,", ""));
      return svg;
    }
    for (const markId of ["cognition", "devin"] as const) {
      expect(inkOf("black", markId)).toContain(PALETTES.black.ink);
      expect(inkOf("black", markId)).not.toContain(PALETTES.white.ink);
      expect(inkOf("white", markId)).toContain(PALETTES.white.ink);
      expect(inkOf("white", markId)).not.toContain("#ffffff");
      expect(inkOf("white", markId)).not.toContain("__INK__");
    }
  });

  it("uses the full-colour otter as-is on both colourways", () => {
    const hrefs = COLOURWAYS.map(
      (colour) =>
        renderDesign(design({ colour, layers: [layer({ markId: "otter" })] }), 400).marks[0].href,
    );
    expect(hrefs[0]).toBe(hrefs[1]);
    expect(hrefs[0].startsWith("data:image/png;base64,")).toBe(true);
  });

  it("never emits an external reference", () => {
    for (const garment of GARMENTS) {
      for (const colour of COLOURWAYS) {
        const svg = toSvgString(
          renderDesign(
            design({
              garment,
              colour,
              layers: [
                layer({ id: "a", markId: "otter" }),
                layer({ id: "b", markId: "devin", y: 0.2, scale: 0.5 }),
                layer({ id: "c", markId: "cognition", y: 0.8, scale: 0.3 }),
              ],
            }),
            2000,
          ),
        );
        for (const match of svg.matchAll(/(?:href|src|url)\s*=?\s*\(?"?([^"')\s]+)/g)) {
          const target = match[1];
          if (target.startsWith("http://www.w3.org/")) continue; // xmlns declarations
          expect(target.startsWith("data:")).toBe(true);
        }
        expect(svg).not.toContain('href="/');
        expect(svg).not.toContain("url(");
      }
    }
  });

  it("draws every blank with a visible outline and seam detail", () => {
    for (const garment of GARMENTS) {
      for (const colour of COLOURWAYS) {
        const scene = renderDesign(design({ garment, colour, layers: [] }), 600);
        expect(scene.parts.some((part) => part.fill === PALETTES[colour].body)).toBe(true);
        expect(scene.parts.every((part) => part.stroke !== part.fill)).toBe(true);
        expect(scene.parts.filter((part) => part.fill === "none").length).toBeGreaterThan(0);
      }
    }
  });

  it("describes the design for screen readers", () => {
    expect(renderDesign(design({ colour: "black", garment: "tshirt" }), 400).title).toBe(
      "Black t-shirt with the Devin logo on the front chest",
    );
    expect(
      renderDesign(design({ colour: "white", garment: "cap", layers: [] }), 400).title,
    ).toBe("Blank white cap");
    expect(
      renderDesign(
        design({
          colour: "black",
          garment: "hoodie",
          layers: [layer({ id: "a", markId: "otter" }), layer({ id: "b", markId: "cognition" })],
        }),
        400,
      ).title,
    ).toBe("Black hoodie with the Otter mascot and the Cognition logo on the front chest");
  });
});

describe("toReactSvg", () => {
  it("returns addressable per-layer nodes the editor can extend", () => {
    const scene = renderDesign(
      design({ layers: [layer({ id: "a" }), layer({ id: "b", markId: "otter" })] }),
      800,
    );
    const element = toReactSvg(scene, {
      showPrintableArea: true,
      markProps: (mark) => ({ tabIndex: 0, "data-testid": `mark-${mark.layerId}` }),
    });
    expect(element.type).toBe("svg");
    const props = element.props as { children: unknown[]; "aria-label": string };
    expect(props["aria-label"]).toBe(scene.title);
    const groups = props.children as { key: string | null; props: { children: unknown } }[];
    const markGroup = groups.find((child) => child.key === "marks");
    const markNodes = markGroup!.props.children as {
      key: string;
      props: Record<string, unknown>;
    }[];
    expect(markNodes.map((node) => node.key)).toEqual(["a", "b"]);
    expect(markNodes[0].props["data-testid"]).toBe("mark-a");
    expect(markNodes[0].props.tabIndex).toBe(0);
    expect(String(markNodes[0].props.href).startsWith("data:")).toBe(true);
    expect(groups.some((child) => child.key === "printable")).toBe(true);
  });
});
