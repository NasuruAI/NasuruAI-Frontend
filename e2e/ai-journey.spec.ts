import { test, expect } from "@playwright/test";

/**
 * The public journey (web.md §3): a visitor lands, understands the promise,
 * and reaches a free tool without an account. The signed-in journey needs the
 * fixture API and lives in authenticated.spec.ts.
 */
test.describe("public AI journey", () => {
  test("a visitor reaches the eligibility tool from the landing page", async ({ page }) => {
    await page.goto("/ai");

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page
      .getByRole("link", { name: /check eligibility/i })
      .first()
      .click();

    await expect(page).toHaveURL(/\/ai\/tools\/eligibility/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/eligib/i);
    // The tool is usable without an account: the header still offers sign-in,
    // and the form is on the page rather than behind a gate.
    await expect(page.getByRole("link", { name: /sign in/i }).first()).toBeVisible();
    await expect(page.locator("form")).toBeVisible();
  });

  test("every free tool opens from the tools index with one h1", async ({ page }) => {
    await page.goto("/ai/tools");

    const links = page.locator('main a[href^="/ai/tools/"]');
    await expect(links.first()).toBeVisible();
    const hrefs = await links.evaluateAll((nodes) => [
      ...new Set(
        nodes
          .map((node) => (node as HTMLAnchorElement).getAttribute("href"))
          .filter((href): href is string => Boolean(href)),
      ),
    ]);
    expect(hrefs.length).toBeGreaterThan(3);

    for (const href of hrefs) {
      await page.goto(href);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    }
  });
});
