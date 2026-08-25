// Dev-only reference page. It is the approval gate for the printable-area
// rectangles: they are approved by eye from here, not in code review.
import {
  COLOURWAYS,
  GARMENTS,
  GARMENT_LABELS,
  createDesign,
  type Design,
} from "../lib/design.ts";
import { renderDesign, toReactSvg } from "../lib/render.ts";

const TILE = 260;

function Tile({ design, outline, caption }: { design: Design; outline: boolean; caption: string }) {
  const scene = renderDesign(design, TILE);
  return (
    <figure className="m-0">
      <div className="rounded border border-rule bg-paper p-2">
        {toReactSvg(scene, { showPrintableArea: outline, className: "w-full h-auto block" })}
      </div>
      <figcaption className="mt-1 text-xs text-muted">{caption}</figcaption>
    </figure>
  );
}

const blanks = GARMENTS.flatMap((garment) =>
  COLOURWAYS.map((colour) => ({
    key: `${garment}-${colour}`,
    design: createDesign({ garment, colour, layers: [] }),
    caption: `${GARMENT_LABELS[garment]} · ${colour} · printable area outlined`,
  })),
);

const examples = [
  {
    key: "tee-devin",
    design: createDesign({
      garment: "tshirt",
      colour: "black",
      layers: [{ id: "e1", markId: "devin", x: 0.5, y: 0.3, scale: 0.9, rotation: 0 }],
    }),
    caption: "T-shirt · black · Devin logo, chest",
  },
  {
    key: "hoodie-otter",
    design: createDesign({
      garment: "hoodie",
      colour: "white",
      layers: [{ id: "e2", markId: "otter", x: 0.5, y: 0.45, scale: 0.7, rotation: 0 }],
    }),
    caption: "Hoodie · white · otter mascot",
  },
  {
    key: "cap-cognition",
    design: createDesign({
      garment: "cap",
      colour: "black",
      layers: [{ id: "e3", markId: "cognition", x: 0.5, y: 0.5, scale: 0.55, rotation: 0 }],
    }),
    caption: "Cap · black · Cognition logo",
  },
  {
    key: "tee-layered",
    design: createDesign({
      garment: "tshirt",
      colour: "white",
      layers: [
        { id: "e4", markId: "otter", x: 0.5, y: 0.4, scale: 0.6, rotation: 0 },
        { id: "e5", markId: "devin", x: 0.5, y: 0.8, scale: 0.8, rotation: 8 },
      ],
    }),
    caption: "T-shirt · white · two layers, second rotated 8°",
  },
];

export default function ContactSheetRoute() {
  return (
    <section>
      <p className="mb-4 inline-block rounded border border-accent px-2 py-1 text-xs font-semibold uppercase tracking-wide text-accent">
        Dev only — renderer contact sheet, not part of the product UI
      </p>
      <h2 className="text-base font-medium">Blanks, with the printable area outlined</h2>
      <p className="mb-4 max-w-2xl text-sm text-muted">
        Gina approves these rectangles by eye. Layer coordinates are fractions of them, so moving a
        rectangle later moves the artwork of every saved design.
      </p>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4">
        {blanks.map((blank) => (
          <Tile key={blank.key} design={blank.design} caption={blank.caption} outline />
        ))}
      </div>
      <h2 className="mt-8 text-base font-medium">Layered examples</h2>
      <div className="mt-2 grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4">
        {examples.map((example) => (
          <Tile
            key={example.key}
            design={example.design}
            caption={example.caption}
            outline={false}
          />
        ))}
      </div>
    </section>
  );
}
