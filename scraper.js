const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();

chromium.use(stealth);

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7',
    timezoneId: 'Asia/Jerusalem',
  });
  const page = await context.newPage();

  try {
    const url = 'https://apkcube.com/egg-bus-train-in-israel/com.egged.egg/download';
    console.log(`Navigating to: ${url}`);
    
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

    console.log("Waiting for page to settle...");
    await page.waitForTimeout(5000); 

    console.log("Looking for the download button...");
    const downloadBtn = page.locator('button:has-text("Download APKS")').first();
    await downloadBtn.waitFor({ state: 'visible', timeout: 15000 });

    // מכינים את ההאזנה להורדה
    const downloadPromise = page.waitForEvent('download', { timeout: 80000 });

    console.log("Clicking the download button...");
    await downloadBtn.click();

    // --- שלב הטיפול החדש בקאפצ'ה לפי ה-HTML שמצאת ---
    try {
      console.log("Looking for the cf-turnstile container...");
      
      // 1. מחכים שהקופסה של הקאפצ'ה (שמצאת בקוד) תופיע
      const turnstileContainer = page.locator('#cf-turnstile');
      await turnstileContainer.waitFor({ state: 'visible', timeout: 10000 });
      
      console.log("Turnstile container found! Targeting the iframe inside it...");
      
      // 2. תופסים את המסגרת של Cloudflare שנוצרת *בתוך* הקופסה הזו
      const cfIframe = page.frameLocator('#cf-turnstile iframe').first();
      const widgetBody = cfIframe.locator('body');
      
      // 3. מוודאים שהיא נטענה
      await widgetBody.waitFor({ state: 'visible', timeout: 10000 });
      
      // 4. השהייה אנושית לפני לחיצה
      await page.waitForTimeout(2000);
      
      console.log("Clicking inside the Turnstile widget...");
      // לוחצים במרכז המסגרת (איפה שהריבוע של ה-V נמצא)
      await widgetBody.click({ delay: 150, force: true });
      console.log("Clicked! Waiting for Cloudflare to verify...");

    } catch (e) {
      console.log("CAPTCHA didn't load properly, or wasn't needed. Error info:", e.message);
    }
    // ------------------------------------------------

    console.log("Waiting for the download to start (up to 80 seconds)...");
    
    // ממתינים שההורדה תתחיל בפועל
    const download = await downloadPromise;

    console.log("Download event triggered!");
    const fileName = download.suggestedFilename();
    console.log(`Saving file as: ${fileName}`);
    await download.saveAs(`./${fileName}`);
    console.log("Download completed successfully!");

  } catch (error) {
    console.error("An error occurred. Taking a screenshot...");
    await page.screenshot({ path: 'error-screenshot.png', fullPage: true });
    console.error(error.message);
    process.exit(1); 
  } finally {
    await browser.close();
  }
})();
