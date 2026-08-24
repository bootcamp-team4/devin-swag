import { expect, test } from "@playwright/test";

test("the dev contact sheet renders every blank and its printable area", async ({ page }) => {
  await page.goto("/contact-sheet");
  await expect(page.getByText("Dev only", { exact: false })).toBeVisible();

  for (const caption of ["T-shirt", "Hoodie", "Cap"]) {
    await expect(page.getByText(`${caption} · black · printable area outlined`)).toBeVisible();
    await expect(page.getByText(`${caption} · white · printable area outlined`)).toBeVisible();
  }

  const mockups = page.getByRole("img");
  await expect(mockups).toHaveCount(10);
  await expect(mockups.first()).toHaveAttribute("aria-label", "Blank black t-shirt");

  // Artwork must be inlined: an external href silently exports a blank garment.
  const hrefs = await page.locator("svg image").evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute("href") ?? ""),
  );
  expect(hrefs.length).toBeGreaterThan(0);
  expect(hrefs.every((href) => href.startsWith("data:"))).toBe(true);
});
