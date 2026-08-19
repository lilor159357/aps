const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();

// הפעלת תוסף ההסוואה כדי ש-Cloudflare לא יזהה מיד שזה שרת של GitHub
chromium.use(stealth);

(async () => {
  // פתיחת הדפדפן (headless: true אומר שהוא רץ ברקע בלי מסך אמיתי)
  const browser = await chromium.launch({ headless: true });
  
  // פתיחת חלון חדש עם הגדרות שגורמות לו להיראות יותר כמו דפדפן רגיל
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();

  const url = 'https://apkcube.com/egg-bus-train-in-israel/com.egged.egg/download'; // אפשר לשנות לכל לינק אחר באתר
  console.log(`Navigating to: ${url}`);
  
  await page.goto(url, { waitUntil: 'domcontentloaded' });

  // מחכים שהכפתור יופיע על המסך
  console.log("Looking for the download button...");
  const downloadBtn = page.locator('button:has-text("Download")').first();
  await downloadBtn.waitFor({ state: 'visible' });

  console.log("Clicking the button...");
  
  // כאן הקסם: אנחנו לוחצים על הכפתור ומיד אומרים לסקריפט "תחכה עד שאירוע של הורדה יתחיל"
  // הגדרנו טיימאאוט של 70 שניות (70000 מילישניות) כי ראינו שיש טיימר של 26 שניות + קאפצ'ה
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 70000 }),
    downloadBtn.click()
  ]);

  console.log("Download event triggered by the browser!");

  // תופסים את הקובץ ושומרים אותו בתוך השרת של גיטהאב
  const fileName = download.suggestedFilename();
  console.log(`Saving file as: ${fileName}`);
  
  await download.saveAs(`./${fileName}`);
  
  console.log("Download completed successfully!");

  await browser.close();
})().catch(err => {
  console.error("An error occurred:", err);
  process.exit(1);
});
