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

  try {
    const url = 'https://apkcube.com/egg-bus-train-in-israel/com.egged.egg/download';
    console.log(`Navigating to: ${url}`);
    
    // שינינו ל-domcontentloaded והגדלנו את זמן הטעינה ל-60 שניות למקרה שהשרת איטי
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

    console.log("Waiting 5 seconds to let Cloudflare and Ads load...");
    await page.waitForTimeout(5000); // נותנים לדף 5 שניות "להירגע"

    console.log("Looking for the download button...");
    const downloadBtn = page.locator('button:has-text("Download APKS")').first();
    await downloadBtn.waitFor({ state: 'visible', timeout: 15000 });

    console.log("Clicking the button...");
    
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
    console.error("An error occurred. Taking a screenshot...");
    // עכשיו צילום המסך יעבוד גם אם הטעינה נכשלת!
    await page.screenshot({ path: 'error-screenshot.png', fullPage: true });
    console.error(error.message);
    process.exit(1); 
  } finally {
    await browser.close();
  }
})();
