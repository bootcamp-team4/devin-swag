import { useEffect, useRef, useState } from "react";
import { GARMENT_LABELS, type Design, type Side } from "../../lib/design.ts";
import { renderDesign, toReactSvg } from "../../lib/render.ts";

/** Thumbnails come from the same renderer as the editor and the export. */
const THUMBNAIL_SIZE = 320;

const DATE_FORMAT = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatUpdatedAt(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown date" : DATE_FORMAT.format(date);
}

const BUTTON =
  "rounded-lg border border-rule bg-paper px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-canvas hover:border-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

export type DesignCardProps = {
  design: Design;
  onOpen: (design: Design) => void;
  onRename: (design: Design, name: string) => void;
  onDuplicate: (design: Design) => void;
  onDelete: (design: Design) => void;
};

export default function DesignCard({
  design,
  onOpen,
  onRename,
  onDuplicate,
  onDelete,
}: DesignCardProps) {
  const [mode, setMode] = useState<"idle" | "renaming" | "confirming-delete">("idle");
  const [draftName, setDraftName] = useState(design.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mode === "renaming") inputRef.current?.focus();
  }, [mode]);

  const previewSide: Side = design.layers.some((layer) => layer.side === "front") ? "front" : "back";
  const scene = renderDesign(design, THUMBNAIL_SIZE, previewSide);

  return (
    <li className="flex flex-col gap-4 rounded-2xl border border-rule bg-paper p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="rounded-xl bg-canvas p-2">
        {toReactSvg(scene, { className: "w-full h-auto block" })}
      </div>

      {mode === "renaming" ? (
        <form
          className="flex flex-col gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            onRename(design, draftName);
            setMode("idle");
          }}
        >
          <label className="text-xs font-semibold uppercase tracking-wide text-muted" htmlFor={`name-${design.id}`}>
            Design name
          </label>
          <input
            id={`name-${design.id}`}
            ref={inputRef}
            value={draftName}
            onChange={(event) => setDraftName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setDraftName(design.name);
                setMode("idle");
              }
            }}
            className="rounded-lg border border-rule bg-canvas px-3 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          />
          <div className="flex gap-2">
            <button type="submit" className={BUTTON}>
              Save name
            </button>
            <button
              type="button"
              className={BUTTON}
              onClick={() => {
                setDraftName(design.name);
                setMode("idle");
              }}
            >
              Cancel rename
            </button>
          </div>
        </form>
      ) : (
        <div>
          <h2 className="text-base font-semibold">{design.name}</h2>
          <p className="mt-0.5 text-xs text-muted">
            {GARMENT_LABELS[design.garment]} · {design.colour} · updated{" "}
            {formatUpdatedAt(design.updatedAt)}
          </p>
        </div>
      )}

      {mode === "confirming-delete" ? (
        <div className="flex flex-col gap-2 rounded-xl bg-red-50 p-3">
          <p className="text-sm font-medium text-red-800">Delete “{design.name}”?</p>
          <p className="text-xs text-red-700">This cannot be undone.</p>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-lg border border-red-200 bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              onClick={() => onDelete(design)}
            >
              Confirm delete
            </button>
            <button type="button" className={BUTTON} onClick={() => setMode("idle")}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        mode === "idle" && (
          <div className="flex flex-wrap gap-2">
            <button type="button" className={BUTTON} onClick={() => onOpen(design)}>
              Open
              <span className="sr-only"> {design.name} in the editor</span>
            </button>
            <button type="button" className={BUTTON} onClick={() => setMode("renaming")}>
              Rename
              <span className="sr-only"> {design.name}</span>
            </button>
            <button type="button" className={BUTTON} onClick={() => onDuplicate(design)}>
              Duplicate
              <span className="sr-only"> {design.name}</span>
            </button>
            <button
              type="button"
              className="rounded-lg border border-rule bg-paper px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 hover:border-red-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              onClick={() => setMode("confirming-delete")}
            >
              Delete
              <span className="sr-only"> {design.name}</span>
            </button>
          </div>
        )
      )}
    </li>
  );
}
