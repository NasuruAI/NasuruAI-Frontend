import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { test, expect } from "@playwright/test";

/**
 * Visual smoke for the public `/ai` surfaces (web.md §15): every route is
 * captured at both projects (desktop and Pixel 7, i.e. `xl` and `sm`) and is
 * checked for the one layout defect a screenshot alone would not fail on:
 * horizontal overflow.
 *
 * The images land in `shots/ai/<project>/`, alongside the manual shots the
 * team already keeps. They are captures, not pixel baselines: a committed
 * baseline from a Windows font stack would fail on a Linux runner for reasons
 * that have nothing to do with the product.
 */
const ROUTES = [
  { path: "/ai", name: "landing" },
  { path: "/ai/pricing", name: "pricing" },
  { path: "/ai/tools", name: "tools" },
  { path: "/ai/programs", name: "programs" },
  { path: "/ai/login", name: "sign-in" },
];

test.describe("AI visual smoke", () => {
  test.use({ colorScheme: "light", reducedMotion: "reduce" });

  for (const route of ROUTES) {
    test(`${route.name} fits the viewport and is captured`, async ({ page }, testInfo) => {
      const errors: string[] = [];
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
      });

      await page.goto(route.path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, "horizontal overflow").toBeLessThanOrEqual(1);

      const directory = join("shots", "ai", testInfo.project.name);
      mkdirSync(directory, { recursive: true });
      await page.screenshot({
        path: join(directory, `${route.name}.png`),
        fullPage: true,
        animations: "disabled",
      });

      // A failed API request is expected in this suite (there is no backend,
      // and the catalogue's public endpoint rejects the localhost origin);
      // an exception thrown by the page is not.
      const appErrors = errors.filter(
        (text) =>
          !/Failed to load resource|ERR_CONNECTION_REFUSED|net::ERR|CORS policy|Access to fetch/.test(
            text,
          ),
      );
      expect(appErrors, appErrors.join("\n")).toEqual([]);
    });
  }
});
