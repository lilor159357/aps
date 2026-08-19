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

    const downloadPromise = page.waitForEvent('download', { timeout: 80000 });

    console.log("Clicking the download button...");
    await downloadBtn.click();

    // --- שלב הטיפול בקאפצ'ה ---
    try {
      console.log("Looking for the cf-turnstile container...");
      const turnstileContainer = page.locator('#cf-turnstile');
      await turnstileContainer.waitFor({ state: 'visible', timeout: 15000 });
      
      // מחכים 3 שניות כדי לתת לקלאודפלייר זמן להזריק את הקוד שלו פנימה
      await page.waitForTimeout(3000);

      // הרעיון שלך: מדפיסים את ה-HTML של הקאפצ'ה
      console.log("Turnstile container found! Printing its HTML for debugging:");
      const containerHtml = await turnstileContainer.innerHTML();
      console.log("================ HTML START ================");
      console.log(containerHtml);
      console.log("================ HTML END ================");

      // לחיצה מבוססת קואורדינטות במקום לחפש אלמנטים
      console.log("Calculating coordinates to perform a physical mouse click...");
      const box = await turnstileContainer.boundingBox();
      
      if (box) {
        // box.x זה הקצה השמאלי של הקופסה. נוסיף 30 פיקסלים ימינה (שם נמצאת קוביית הסימון)
        // box.y זה הקצה העליון. נוסיף חצי מהגובה כדי ללחוץ בדיוק באמצע
        const clickX = box.x + 30;
        const clickY = box.y + (box.height / 2);
        
        console.log(`Clicking exactly at X:${clickX}, Y:${clickY}`);
        
        // מזיזים את העכבר ולוחצים
        await page.mouse.move(clickX, clickY, { steps: 5 }); // תנועה אנושית
        await page.mouse.click(clickX, clickY, { delay: 150 });
        
        console.log("Mouse click executed! Waiting for Cloudflare to verify...");
      } else {
        console.log("Could not find the coordinates of the container.");
      }

    } catch (e) {
      console.log("CAPTCHA error:", e.message);
    }
    // ------------------------------------------------

    console.log("Waiting for the download to start (up to 80 seconds)...");
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
