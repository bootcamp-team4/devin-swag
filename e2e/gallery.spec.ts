import { expect, test, type Page } from "@playwright/test";

const DESIGNS_KEY = "cognition-merch-designer:designs";

const OLDER = {
  id: "design-older",
  name: "Older tee",
  garment: "tshirt",
  colour: "black",
  layers: [{ id: "l1", markId: "devin", side: "front", x: 0.5, y: 0.4, scale: 0.5, rotation: 0 }],
  updatedAt: "2026-01-01T10:00:00.000Z",
};

const NEWER = {
  id: "design-newer",
  name: "Newer hoodie",
  garment: "hoodie",
  colour: "white",
  layers: [{ id: "l2", markId: "otter", side: "front", x: 0.5, y: 0.5, scale: 0.6, rotation: 12 }],
  updatedAt: "2026-06-01T10:00:00.000Z",
};

/** A record that `parseDesign` rejects — it must not blank the gallery. */
const CORRUPT = { id: "design-corrupt", garment: "sock", colour: "puce", layers: "nope" };

async function seed(page: Page, designs: unknown[]) {
  await page.goto("/designs");
  await page.evaluate(
    ([key, payload]) => window.localStorage.setItem(key as string, payload as string),
    [DESIGNS_KEY, JSON.stringify({ version: 1, designs })] as const,
  );
  await page.reload();
}

test("the empty state points a first-time user at the editor", async ({ page }) => {
  await seed(page, []);

  await expect(page.getByRole("heading", { name: "No designs yet" })).toBeVisible();
  await page.getByRole("link", { name: "Start your first design" }).click();
  await expect(page).toHaveURL(/\/$/);
});

test("saved designs list newest first, survive a corrupt record, and open in the editor", async ({
  page,
}) => {
  await seed(page, [OLDER, CORRUPT, NEWER]);

  const names = page.getByRole("listitem").getByRole("heading");
  await expect(names).toHaveText(["Newer hoodie", "Older tee"]);
  await expect(page.getByRole("img", { name: /White hoodie with the Otter mascot/i })).toBeVisible();

  await page.getByRole("button", { name: "Open Newer hoodie in the editor" }).click();
  await expect(page).toHaveURL(/\/$/);

  const draft = await page.evaluate(() =>
    window.localStorage.getItem("cognition-merch-designer:draft"),
  );
  expect(draft).toContain("design-newer");
});

test("rename, duplicate, and delete a design from the gallery", async ({ page }) => {
  await seed(page, [NEWER]);

  await page.getByRole("button", { name: "Rename Newer hoodie" }).click();
  await page.getByLabel("Design name").fill("Renamed hoodie");
  await page.getByRole("button", { name: "Save name" }).click();
  await expect(page.getByRole("heading", { name: "Renamed hoodie" })).toBeVisible();

  await page.getByRole("button", { name: "Duplicate Renamed hoodie" }).click();
  await expect(page.getByRole("heading", { name: "Renamed hoodie (copy)" })).toBeVisible();

  await page.getByRole("button", { name: "Delete Renamed hoodie (copy)" }).click();
  await page.getByRole("button", { name: "Confirm delete" }).click();
  await expect(page.getByRole("heading", { name: "Renamed hoodie (copy)" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Renamed hoodie" })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { name: "Renamed hoodie" })).toBeVisible();
});
