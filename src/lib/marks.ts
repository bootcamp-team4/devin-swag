import cognitionBlack from "../assets/brand/mark-cognition-black.svg?inline";
import cognitionWhite from "../assets/brand/mark-cognition-white.svg?inline";
import devinBlack from "../assets/brand/mark-devin-black.png?inline";
import devinWhite from "../assets/brand/mark-devin-white.png?inline";
import otter from "../assets/brand/mark-otter.png?inline";

function asBase64DataUri(source: string) {
  const [header, payload] = source.split(",", 2);

  if (header.includes(";base64")) {
    return source;
  }

  return `${header};base64,${btoa(decodeURIComponent(payload))}`;
}

export const MARKS = {
  cognition: {
    black: asBase64DataUri(cognitionBlack),
    white: asBase64DataUri(cognitionWhite),
  },
  devin: {
    black: devinBlack,
    white: devinWhite,
  },
  otter,
} as const;
