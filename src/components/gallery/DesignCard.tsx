import { useEffect, useRef, useState } from "react";
import { GARMENT_LABELS, type Design } from "../../lib/design.ts";
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
  "rounded-sm border border-rule px-2 py-1 text-sm hover:bg-rule/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

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

  const scene = renderDesign(design, THUMBNAIL_SIZE);

  return (
    <li className="flex flex-col gap-3 rounded-sm border border-rule p-3">
      <div className="rounded-sm bg-paper">
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
          <label className="text-sm font-medium" htmlFor={`name-${design.id}`}>
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
            className="rounded-sm border border-rule bg-paper px-2 py-1 text-sm"
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
          <h2 className="text-sm font-medium">{design.name}</h2>
          <p className="text-xs text-muted">
            {GARMENT_LABELS[design.garment]} · {design.colour} · updated{" "}
            {formatUpdatedAt(design.updatedAt)}
          </p>
        </div>
      )}

      {mode === "confirming-delete" ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm">Delete “{design.name}”? This cannot be undone.</p>
          <div className="flex gap-2">
            <button
              type="button"
              className={`${BUTTON} border-accent text-accent`}
              onClick={() => onDelete(design)}
            >
              Confirm delete
            </button>
            <button type="button" className={BUTTON} onClick={() => setMode("idle")}>
              Cancel delete
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
              className={BUTTON}
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
