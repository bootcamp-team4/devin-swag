import { describe, expect, it } from "vitest";

import { MARKS } from "./marks";

const markSources = [
  ["cognition black", MARKS.cognition.black],
  ["cognition white", MARKS.cognition.white],
  ["devin black", MARKS.devin.black],
  ["devin white", MARKS.devin.white],
  ["otter", MARKS.otter],
] as const;

describe("brand marks", () => {
  it.each(markSources)(
    "%s is an inlined image with plausible file contents",
    (_name, source) => {
      expect(source).toMatch(/^data:image\/[^;]+;base64,/);

      const [, payload] = source.split(",", 2);
      const bytes = Buffer.from(payload, "base64");
      const decoded = bytes.toString("utf8");
      const isPng =
        bytes[0] === 0x89 &&
        bytes[1] === 0x50 &&
        bytes[2] === 0x4e &&
        bytes[3] === 0x47;

      expect(isPng || decoded.trimStart().startsWith("<svg")).toBe(true);
    },
  );
});
