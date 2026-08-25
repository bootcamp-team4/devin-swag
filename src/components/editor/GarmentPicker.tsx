// Controlled garment/colour picker. Two native radio groups — real inputs, not
// clickable divs, so keyboard, focus and screen readers come for free — each
// option previewing the blank it selects through the shared renderer.
import { useId } from "react";
import {
  COLOURWAYS,
  GARMENTS,
  GARMENT_LABELS,
  type Colourway,
  type Design,
  type Garment,
} from "../../lib/design.ts";
import { renderDesign, toReactSvg } from "../../lib/render.ts";

export type GarmentSelection = { garment: Garment; colour: Colourway };

export type GarmentPickerProps = {
  garment: Garment;
  colour: Colourway;
  onChange: (next: GarmentSelection) => void;
};

const COLOUR_LABELS: Record<Colourway, string> = { black: "Black", white: "White" };

const PREVIEW_SIZE = 96;

function blank(garment: Garment, colour: Colourway): Design {
  return {
    id: `preview-${garment}-${colour}`,
    name: `${COLOUR_LABELS[colour]} ${GARMENT_LABELS[garment]}`,
    garment,
    colour,
    layers: [],
    updatedAt: "",
  };
}

function Preview({ garment, colour }: GarmentSelection) {
  // aria-hidden: the radio's own label already names the option, and the
  // renderer's alt text would otherwise be read as part of that name.
  return (
    <span aria-hidden="true" className="block w-full">
      {toReactSvg(renderDesign(blank(garment, colour), PREVIEW_SIZE), {
        className: "block h-auto w-full",
      })}
    </span>
  );
}

function Option({
  name,
  label,
  checked,
  onSelect,
  children,
}: {
  name: string;
  label: string;
  checked: boolean;
  onSelect: () => void;
  children: React.ReactNode;
}) {
  return (
    <label
      className={[
        "flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border p-2.5 text-xs transition-all",
        "has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent",
        checked
          ? "border-accent bg-accent-subtle font-medium text-ink shadow-sm"
          : "border-rule bg-paper text-muted hover:border-muted hover:bg-canvas",
      ].join(" ")}
    >
      <input
        type="radio"
        name={name}
        value={label}
        checked={checked}
        onChange={onSelect}
        className="sr-only"
      />
      {children}
      <span>{label}</span>
    </label>
  );
}

export default function GarmentPicker({ garment, colour, onChange }: GarmentPickerProps) {
  const groupId = useId();

  return (
    <div className="flex flex-col gap-5">
      <fieldset className="m-0 border-0 p-0">
        <legend className="mb-2 p-0 text-xs font-semibold uppercase tracking-wide text-muted">
          Garment
        </legend>
        <div className="grid grid-cols-3 gap-2">
          {GARMENTS.map((option) => (
            <Option
              key={option}
              name={`${groupId}-garment`}
              label={GARMENT_LABELS[option]}
              checked={option === garment}
              onSelect={() => onChange({ garment: option, colour })}
            >
              <Preview garment={option} colour={colour} />
            </Option>
          ))}
        </div>
      </fieldset>

      <fieldset className="m-0 border-0 p-0">
        <legend className="mb-2 p-0 text-xs font-semibold uppercase tracking-wide text-muted">
          Colour
        </legend>
        <div className="grid grid-cols-3 gap-2">
          {COLOURWAYS.map((option) => (
            <Option
              key={option}
              name={`${groupId}-colour`}
              label={COLOUR_LABELS[option]}
              checked={option === colour}
              onSelect={() => onChange({ garment, colour: option })}
            >
              <Preview garment={garment} colour={option} />
            </Option>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
