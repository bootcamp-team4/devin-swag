import { expect, test, type Page } from "@playwright/test";

// Mirrors PRINTABLE_AREAS.tshirt in src/lib/design.ts.
const TSHIRT_AREA = { x0: 0.3, y0: 0.28, x1: 0.7, y1: 0.62 };

async function markBox(page: Page) {
  const mark = page.locator("svg image[data-layer-id]").first();
  const box = await mark.boundingBox();
  expect(box).not.toBeNull();
  return box!;
}

async function printableBox(page: Page) {
  const canvas = page.getByRole("img", { name: /t-shirt/i }).first();
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  return {
    x: box!.x + TSHIRT_AREA.x0 * box!.width,
    y: box!.y + TSHIRT_AREA.y0 * box!.height,
    width: (TSHIRT_AREA.x1 - TSHIRT_AREA.x0) * box!.width,
    height: (TSHIRT_AREA.y1 - TSHIRT_AREA.y0) * box!.height,
    canvas: box!,
  };
}

function expectInside(
  mark: { x: number; y: number; width: number; height: number },
  area: { x: number; y: number; width: number; height: number },
) {
  const slack = 1;
  expect(mark.x).toBeGreaterThanOrEqual(area.x - slack);
  expect(mark.y).toBeGreaterThanOrEqual(area.y - slack);
  expect(mark.x + mark.width).toBeLessThanOrEqual(area.x + area.width + slack);
  expect(mark.y + mark.height).toBeLessThanOrEqual(area.y + area.height + slack);
}

test("dragging a mark onto the garment lands it inside the printable area", async ({ page }) => {
  await page.goto("/");
  const area = await printableBox(page);

  const tray = page.getByRole("button", { name: "Devin logo" });
  const trayBox = (await tray.boundingBox())!;
  await page.mouse.move(trayBox.x + trayBox.width / 2, trayBox.y + trayBox.height / 2);
  await page.mouse.down();
  // Aim well above the printable area: the drop must be clamped back inside.
  await page.mouse.move(area.x + area.width * 0.5, area.canvas.y + 4, { steps: 12 });
  await page.mouse.up();

  await expect(page.locator("svg image[data-layer-id]")).toHaveCount(1);
  // Re-measured: bounding boxes are viewport-relative, and focusing a control
  // can scroll the page between the two reads.
  expectInside(await markBox(page), await printableBox(page));
});

test("a mark can be placed, moved, nudged and deleted with the keyboard alone", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Otter mascot" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("svg image[data-layer-id]")).toHaveCount(1);

  const placed = await markBox(page);
  expectInside(placed, await printableBox(page));

  // Placing hands the keyboard the new layer, so nudging needs no extra Tab.
  const layer = page.getByRole("button", { name: "Otter mascot layer" });
  await expect(layer).toBeFocused();
  await expect(layer).toHaveAttribute("aria-pressed", "true");
  for (let i = 0; i < 30; i += 1) await page.keyboard.press("ArrowUp");
  const nudged = await markBox(page);
  expect(nudged.y).toBeLessThan(placed.y);
  expectInside(nudged, await printableBox(page));

  await page.keyboard.press("Escape");
  await expect(layer).toHaveAttribute("aria-pressed", "false");

  await layer.focus();
  await page.keyboard.press("Delete");
  await expect(page.locator("svg image[data-layer-id]")).toHaveCount(0);
});

test("dragging a placed mark moves it and keeps it inside the printable area", async ({ page }) => {
  await page.goto("/");
  const area = await printableBox(page);

  await page.getByRole("button", { name: "Cognition logo" }).click();
  const before = await markBox(page);

  await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2);
  await page.mouse.down();
  await page.mouse.move(area.canvas.x + area.canvas.width - 4, area.y + 10, { steps: 12 });
  await page.mouse.up();

  const after = await markBox(page);
  expect(after.x).toBeGreaterThan(before.x);
  expectInside(after, await printableBox(page));
});
