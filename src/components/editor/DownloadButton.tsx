import { useState } from "react";
import type { Design, Side } from "../../lib/design.ts";
import { downloadDesignPng } from "../../lib/export.ts";

type DownloadButtonProps = {
  design: Design;
  side: Side;
  className?: string;
};

/** Downloads a 2000x2000 PNG mockup of the current side. Busy while rasterising. */
export default function DownloadButton({ design, side, className }: DownloadButtonProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setBusy(true);
    setError(null);
    try {
      await downloadDesignPng(design, side);
    } catch {
      setError("Could not create the mockup. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        className="rounded-sm border border-rule px-3 py-2 text-sm font-medium text-ink hover:border-ink disabled:cursor-progress disabled:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        {busy ? "Preparing PNG…" : "Download PNG"}
      </button>
      <p className="mt-1 text-xs text-muted">2000 × 2000 mockup image</p>
      <p role="status" aria-live="polite" className="mt-1 text-xs text-ink">
        {error}
      </p>
    </div>
  );
}
