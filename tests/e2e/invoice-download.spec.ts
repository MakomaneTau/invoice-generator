import { expect, test } from "@playwright/test";

test("redirects an unauthenticated visitor to sign in", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
});

test("completes an invoice and downloads a PDF", async ({ page, isMobile }) => {
  const invoiceNumber = isMobile ? "INV-0002200" : "INV-0002100";
  await page.goto("/login");
  await page.getByLabel("Email").fill("invoice-owner@example.test");
  await page.getByLabel("Password").fill("Invoice-Test-123!");
  await page.getByRole("button", { name: "Enter invoice studio" }).click();
  await expect(page).toHaveURL("/");

  await page.getByLabel("Invoice number").fill(invoiceNumber);
  await page.getByLabel("Contact / display name").fill("Hype Nation");
  await page.getByLabel("Registered company name").fill("HYPENATION PTY LTD");
  await page.getByLabel("Address").fill("51 Kina Crescent, Eldoglen\nCenturion\n0157");
  await page.getByLabel("Description").fill("Purple T-shirts Pro");
  await page.getByLabel("Quantity").fill("10");
  await page.getByLabel("Rate (ZAR)").fill("200");

  const downloadPromise = page.waitForEvent("download");
  const downloadButton = isMobile
    ? page.locator(".mobile-download").getByRole("button", { name: "Download PDF" })
    : page.locator(".app-header").getByRole("button", { name: "Download PDF" });
  await downloadButton.click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe(`${invoiceNumber}-HYPENATION-PTY-LTD.pdf`);
  const stream = await download.createReadStream();
  expect(stream).not.toBeNull();

  await page.goto("/history");
  await expect(page.getByText(invoiceNumber)).toBeVisible();
  await page.getByRole("link", { name: "View" }).first().click();
  await expect(page.getByRole("heading", { name: invoiceNumber })).toBeVisible();

  const historyDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download PDF" }).click();
  expect((await historyDownload).suggestedFilename()).toBe(`${invoiceNumber}-HYPENATION-PTY-LTD.pdf`);
});
