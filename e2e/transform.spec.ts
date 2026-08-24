import { expect, test, type Page } from "@playwright/test";

async function place(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Devin logo" }).click();
  await expect(page.locator("svg image[data-layer-id]")).toHaveCount(1);
}

function readout(page: Page) {
  // "45% · 0°" under the selected layer's name.
  return page.locator("section[aria-label='Selected artwork'] p").nth(1);
}

test("the corner handle scales the selected artwork", async ({ page }) => {
  await place(page);
  const before = await page.locator("svg image[data-layer-id]").boundingBox();

  const handle = page.locator("circle[style*='nwse-resize']");
  const box = (await handle.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + 60, box.y + 60, { steps: 8 });
  await page.mouse.up();

  const after = await page.locator("svg image[data-layer-id]").boundingBox();
  expect(after!.width).toBeGreaterThan(before!.width + 10);
});

test("scale and rotation are reachable from the keyboard and the buttons", async ({ page }) => {
  await place(page);
  await expect(readout(page)).toHaveText("45% · 0°");

  await page.keyboard.press("+");
  await expect(readout(page)).toHaveText("50% · 0°");
  await page.keyboard.press("-");
  await page.keyboard.press("-");
  await expect(readout(page)).toHaveText("40% · 0°");

  await page.keyboard.press("]");
  await expect(readout(page)).toHaveText("40% · 15°");
  await page.keyboard.press("[");
  await page.keyboard.press("[");
  await expect(readout(page)).toHaveText("40% · 345°");

  await page.getByRole("button", { name: "Bigger" }).click();
  await page.getByRole("button", { name: "Rotate right" }).click();
  await expect(readout(page)).toHaveText("45% · 0°");
});

test("duplicating and deleting a layer works from the controls", async ({ page }) => {
  await place(page);
  await page.getByRole("button", { name: "Duplicate" }).click();
  await expect(page.locator("svg image[data-layer-id]")).toHaveCount(2);

  await page.getByRole("button", { name: "Delete" }).click();
  await expect(page.locator("svg image[data-layer-id]")).toHaveCount(1);
  await expect(page.getByText("Select artwork on the garment")).toBeVisible();
});
