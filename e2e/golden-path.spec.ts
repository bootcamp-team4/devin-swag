import { expect, test } from "@playwright/test";

// The demonstration, end to end: pick a garment and colour, place a mark, name
// and save the design, find it in My designs, and download the PNG mockup.
test("the golden path: design, save, find in the gallery, download", async ({ page }) => {
  await page.goto("/");

  // The inputs are visually hidden behind their preview, so click the label —
  // which is what a user hits — rather than the 1px input box.
  await page.getByText("Hoodie", { exact: true }).click();
  await page.getByText("White", { exact: true }).click();
  await expect(page.getByRole("radio", { name: "Hoodie" })).toBeChecked();
  await expect(page.getByRole("radio", { name: "White" })).toBeChecked();

  await page.getByRole("button", { name: "Devin logo" }).click();
  await expect(page.locator("svg image[data-layer-id]")).toHaveCount(1);

  const name = page.getByLabel("Design name");
  await name.fill("Demo hoodie");
  await page.getByRole("button", { name: "Save design" }).click();
  await expect(page.getByText(/Saved .*Demo hoodie/)).toBeVisible();

  await page.getByRole("link", { name: "My designs" }).click();
  const card = page.getByRole("listitem").filter({ hasText: "Demo hoodie" });
  await expect(card).toHaveCount(1);
  await expect(card).toContainText(/hoodie/i);

  await card.getByRole("button", { name: /^Open/ }).click();
  await expect(page.getByLabel("Design name")).toHaveValue("Demo hoodie");
  await expect(page.locator("svg image[data-layer-id]")).toHaveCount(1);

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download PNG" }).click();
  expect((await download).suggestedFilename()).toBe("demo-hoodie.png");
});

test("a design survives a full page reload before it is saved", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Otter mascot" }).click();
  await expect(page.locator("svg image[data-layer-id]")).toHaveCount(1);

  // The draft is written after a short quiet period, not on every keystroke.
  await page.waitForTimeout(600);
  await page.reload();
  await expect(page.locator("svg image[data-layer-id]")).toHaveCount(1);
});
