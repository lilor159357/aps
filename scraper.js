const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();

chromium.use(stealth);

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    // הוספנו קצת יותר הגדרות כדי להיראות כמו דפדפן אנושי ולנסות להערים על Cloudflare
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

    console.log("Clicking the download button...");
    
    // הפעם אנחנו קודם לוחצים, ואז מטפלים בקאפצ'ה
    await downloadBtn.click();

    // אנחנו מגדירים לסקריפט לחכות לאירוע הורדה ברקע
    const downloadPromise = page.waitForEvent('download', { timeout: 80000 });

    console.log("Checking for Cloudflare Turnstile challenge...");
    try {
      // אנחנו מחפשים את החלונית הקטנה של קלאודפלייר לפי הכתובת שלה
      const cfIframe = page.frameLocator('iframe[src*="challenges.cloudflare.com"]').first();
      
      // מחכים שהיא תופיע על המסך (נותנים לה 10 שניות)
      const checkbox = cfIframe.locator('body');
      await checkbox.waitFor({ state: 'visible', timeout: 10000 });

      console.log("Cloudflare challenge found! Attempting to click the checkbox...");
      
      // מחכים קצת כדי לדמות התנהגות אנושית
      await page.waitForTimeout(1500);
      
      // לוחצים עליה
      await checkbox.click({ delay: 100 });
      console.log("Clicked the CAPTCHA. Waiting for it to verify...");

    } catch (e) {
      console.log("No interactive CAPTCHA appeared, or it passed automatically.");
    }

    console.log("Waiting for the download to start...");
    
    // עכשיו מחכים שההורדה תתחיל בפועל (אחרי שקלאודפלייר אישר אותנו)
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
