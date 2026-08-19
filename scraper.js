const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();

chromium.use(stealth);

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();

  const url = 'https://apkcube.com/egg-bus-train-in-israel/com.egged.egg/download';
  console.log(`Navigating to: ${url}`);
  
  await page.goto(url, { waitUntil: 'networkidle' });

  console.log("Looking for the download button...");
  // חיפוש מדויק יותר של הכפתור לפי הטקסט המלא
  const downloadBtn = page.locator('button:has-text("Download APKS")').first();
  await downloadBtn.waitFor({ state: 'visible' });

  console.log("Clicking the button...");
  
  try {
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 70000 }),
      downloadBtn.click()
    ]);

    console.log("Download event triggered by the browser!");
    const fileName = download.suggestedFilename();
    console.log(`Saving file as: ${fileName}`);
    await download.saveAs(`./${fileName}`);
    console.log("Download completed successfully!");

  } catch (error) {
    console.error("Failed to download. Taking a screenshot to see what went wrong...");
    // כאן אנחנו מצלמים את המסך
    await page.screenshot({ path: 'error-screenshot.png', fullPage: true });
    console.error(error.message);
    process.exit(1); // יציאה עם שגיאה כדי שגיטהאב יידע שזה נכשל
  }

  await browser.close();
})();
