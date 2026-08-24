// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import GarmentPicker, { type GarmentSelection } from "./GarmentPicker.tsx";

afterEach(cleanup);

function setup(selection: GarmentSelection = { garment: "tshirt", colour: "black" }) {
  const onChange = vi.fn();
  render(<GarmentPicker {...selection} onChange={onChange} />);
  return { onChange };
}

describe("GarmentPicker", () => {
  it("renders both groups as radio groups with accessible names", () => {
    setup();
    const garments = screen.getByRole("group", { name: "Garment" });
    const colours = screen.getByRole("group", { name: "Colour" });
    expect(within(garments).getAllByRole("radio").map((input) => input.getAttribute("value")))
      .toEqual(["T-shirt", "Hoodie", "Cap"]);
    expect(within(colours).getAllByRole("radio").map((input) => input.getAttribute("value")))
      .toEqual(["Black", "White"]);
  });

  it("marks the current garment and colour as checked", () => {
    setup({ garment: "cap", colour: "white" });
    expect((screen.getByRole("radio", { name: "Cap" }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole("radio", { name: "White" }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole("radio", { name: "Hoodie" }) as HTMLInputElement).checked).toBe(false);
  });

  it("reports the new garment while keeping the colour", () => {
    const { onChange } = setup({ garment: "tshirt", colour: "white" });
    fireEvent.click(screen.getByRole("radio", { name: "Hoodie" }));
    expect(onChange).toHaveBeenCalledWith({ garment: "hoodie", colour: "white" });
  });

  it("reports the new colour while keeping the garment", () => {
    const { onChange } = setup({ garment: "cap", colour: "black" });
    fireEvent.click(screen.getByRole("radio", { name: "White" }));
    expect(onChange).toHaveBeenCalledWith({ garment: "cap", colour: "white" });
  });

  it("is controlled — it does not change selection on its own", () => {
    setup({ garment: "tshirt", colour: "black" });
    fireEvent.click(screen.getByRole("radio", { name: "Cap" }));
    expect((screen.getByRole("radio", { name: "Cap" }) as HTMLInputElement).checked).toBe(false);
    expect((screen.getByRole("radio", { name: "T-shirt" }) as HTMLInputElement).checked).toBe(true);
  });

  it("is keyboard focusable", () => {
    setup();
    const tshirt = screen.getByRole("radio", { name: "T-shirt" });
    tshirt.focus();
    expect(document.activeElement).toBe(tshirt);
  });

  it("previews each option with the renderer, hidden from the accessible name", () => {
    setup({ garment: "hoodie", colour: "white" });
    const svgs = document.querySelectorAll("svg");
    expect(svgs).toHaveLength(5);
    for (const svg of svgs) {
      expect(svg.parentElement?.getAttribute("aria-hidden")).toBe("true");
    }
    // Colour options preview the currently selected garment.
    const colours = screen.getByRole("group", { name: "Colour" });
    for (const svg of colours.querySelectorAll("svg")) {
      expect(svg.getAttribute("aria-label")).toContain("hoodie");
    }
  });
});
