// Hand-drawn garment blanks. No product photography exists for this project,
// so every silhouette is an SVG path on the UNIT x UNIT square below; the
// renderer scales that square to whatever pixel size it is asked for.
import type { Garment } from "./design.ts";

/** Side of the square the paths below are drawn on. */
export const UNIT = 1000;

export type GarmentPart = {
  /** Stable id, so a part is addressable and React keys are not indices. */
  id: string;
  d: string;
  /** "body" takes the garment colour, "seam" takes the contrast colour. */
  role: "body" | "seam";
  opacity?: number;
};

const TSHIRT: GarmentPart[] = [
  {
    id: "body",
    role: "body",
    d:
      "M 382 116 L 296 146 L 148 262 L 238 428 L 302 388 L 302 878 " +
      "Q 500 906 698 878 L 698 388 L 762 428 L 852 262 L 704 146 L 618 116 " +
      "Q 500 214 382 116 Z",
  },
  { id: "collar", role: "seam", d: "M 368 122 Q 500 234 632 122" },
  { id: "sleeve-left", role: "seam", d: "M 302 388 L 238 428" },
  { id: "sleeve-right", role: "seam", d: "M 698 388 L 762 428" },
  { id: "hem", role: "seam", d: "M 306 842 Q 500 870 694 842", opacity: 0.45 },
];

const HOODIE: GarmentPart[] = [
  {
    id: "body",
    role: "body",
    d:
      "M 306 230 L 258 208 L 166 300 L 146 642 L 268 660 L 302 344 L 300 900 " +
      "Q 500 928 700 900 L 698 344 L 732 660 L 854 642 L 834 300 L 742 208 L 694 230 " +
      "C 716 100 616 58 500 58 C 384 58 284 100 306 230 Z",
  },
  {
    id: "hood-opening",
    role: "seam",
    d: "M 356 226 C 380 124 620 124 644 226 Q 500 284 356 226 Z",
    opacity: 0.55,
  },
  { id: "drawstring-left", role: "seam", d: "M 466 254 L 462 300" },
  { id: "drawstring-right", role: "seam", d: "M 534 254 L 538 300" },
  {
    id: "pocket",
    role: "seam",
    d: "M 344 636 L 344 782 Q 500 810 656 782 L 656 636",
  },
  { id: "cuff-left", role: "seam", d: "M 268 660 L 146 642", opacity: 0.6 },
  { id: "cuff-right", role: "seam", d: "M 732 660 L 854 642", opacity: 0.6 },
  { id: "hem", role: "seam", d: "M 302 862 Q 500 890 698 862", opacity: 0.45 },
];

const CAP: GarmentPart[] = [
  {
    id: "brim",
    role: "body",
    d: "M 262 586 C 262 646 342 692 500 692 C 658 692 738 646 738 586 Z",
  },
  {
    id: "crown",
    role: "body",
    d: "M 250 600 L 250 472 C 250 374 344 316 500 316 C 656 316 750 374 750 472 L 750 600 Z",
  },
  { id: "crown-seam", role: "seam", d: "M 500 322 L 500 594", opacity: 0.4 },
  { id: "panel-left", role: "seam", d: "M 378 336 C 340 420 330 508 336 594", opacity: 0.3 },
  { id: "panel-right", role: "seam", d: "M 622 336 C 660 420 670 508 664 594", opacity: 0.3 },
  { id: "sweatband", role: "seam", d: "M 244 594 Q 500 614 756 594" },
  { id: "button", role: "seam", d: "M 500 306 a 14 14 0 1 0 0.1 0" },
];

export const GARMENT_PARTS: Record<Garment, GarmentPart[]> = {
  tshirt: TSHIRT,
  hoodie: HOODIE,
  cap: CAP,
};
