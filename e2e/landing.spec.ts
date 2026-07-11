import { expect, test } from "@playwright/test";

test("landing exposes the product and one primary start action", async ({ page }, testInfo) => {
  await page.goto("/");

  const hero = page.getByTestId("giggle-hero");
  await expect(hero).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: /your squad.*their squad.*live/i })).toBeVisible();
  await expect(hero.getByRole("link", { name: /get started/i })).toHaveAttribute("href", "/signin");

  await page.screenshot({
    path: `artifacts/visual-audit/2026-07-12/landing/${testInfo.project.name}-baseline.png`,
  });
});

test("landing stays within the viewport without browser failures", async ({ page }) => {
  const consoleErrors: string[] = [];
  const failedRequests: string[] = [];
  page.on("console", message => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("requestfailed", request => {
    failedRequests.push(`${request.method()} ${request.url()} ${request.failure()?.errorText || "failed"}`);
  });

  await page.goto("/");
  await page.getByTestId("giggle-hero").waitFor();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  expect(consoleErrors).toEqual([]);
  expect(failedRequests).toEqual([]);
});
