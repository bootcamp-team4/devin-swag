import { expect, test } from "@playwright/test";

test("the app shell loads", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("banner")).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();
  await expect(page.getByRole("main")).toBeVisible();
  await expect(page.getByRole("contentinfo")).toBeVisible();
  await expect(page).toHaveTitle(/^Editor — /);
});

test("keyboard-only navigation moves between the two routes", async ({ page }) => {
  await page.goto("/");

  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();

  const gallery = page.getByRole("link", { name: "Saved designs" });
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await expect(gallery).toBeFocused();
  await page.keyboard.press("Enter");

  await expect(page).toHaveURL(/\/designs$/);
  await expect(page).toHaveTitle(/^Saved designs — /);
  await expect(gallery).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("link", { name: "Editor" })).not.toHaveAttribute("aria-current", "page");
});

test("the layout holds at a 1024px window", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 720 });
  await page.goto("/");

  const overflows = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflows).toBe(false);
  await expect(page.getByRole("region", { name: "Design canvas" })).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Design controls" })).toBeVisible();
});

test("an unknown route links back to the editor", async ({ page }) => {
  await page.goto("/nope");
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  await page.getByRole("link", { name: "Back to the editor" }).click();
  await expect(page).toHaveURL(/\/$/);
});
