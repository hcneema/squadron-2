const { chromium } = require('playwright');
const fs = require('fs');

const BASE_URL = 'https://scheduler.squadron2.com';
const captured = [];

function captureRequest(request) {
  const url = request.url();
  const method = request.method();
  const postData = request.postData();
  if (/\.(css|js|png|jpg|gif|ico|woff|svg)(\?|$)/.test(url)) return;
  captured.push({
    type: 'REQUEST',
    method,
    url,
    headers: sanitizeHeaders(request.headers()),
    body: postData || null,
  });
}

function captureResponse(response) {
  const url = response.url();
  if (/\.(css|js|png|jpg|gif|ico|woff|svg)(\?|$)/.test(url)) return;
  response.text().then(body => {
    captured.push({
      type: 'RESPONSE',
      status: response.status(),
      url,
      contentType: response.headers()['content-type'] || '',
      body: body.length > 2000 && !url.includes('json') ? body.slice(0, 2000) + '...[truncated]' : body,
    });
  }).catch(() => {});
}

function sanitizeHeaders(headers) {
  const safe = { ...headers };
  if (safe.cookie) safe.cookie = '[REDACTED]';
  if (safe.authorization) safe.authorization = '[REDACTED]';
  return safe;
}

async function pause(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function waitForLoggedIn(page, timeoutMs = 120000) {
  console.log(`\nWaiting up to ${timeoutMs / 1000}s for you to log in manually in the browser...`);
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const url = page.url();
    // consider logged in once URL changes away from login page
    if (!url.includes('login') && url !== BASE_URL + '/' && url !== BASE_URL) {
      return true;
    }
    // also check for a common post-login element
    const loggedInEl = await page.$('a[href*="logout"], a[href*="signout"], [class*="logout"], [id*="logout"]');
    if (loggedInEl) return true;
    await pause(1000);
  }
  return false;
}

(async () => {
  const username = process.env.SQUADRON2_USERNAME;
  const password = process.env.SQUADRON2_PASSWORD;

  if (!username || !password) {
    console.error('Set SQUADRON2_USERNAME and SQUADRON2_PASSWORD environment variables first.');
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: false, channel: 'msedge' });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('request', captureRequest);
  page.on('response', captureResponse);

  console.log('--- Step 1: Loading login page ---');
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await pause(3000);

  console.log('--- Step 2: Attempting auto-login ---');
  try {
    // wait for password field to be editable (not just present)
    await page.waitForSelector('input[type="password"]', { state: 'visible', timeout: 10000 });
    const passField = await page.$('input[type="password"]');
    const userField = await page.$('input[type="text"]:not([readonly]), input[name*="user"]:not([readonly]), input[id*="user"]:not([readonly])');

    if (userField && passField) {
      await userField.click();
      await page.keyboard.type(username, { delay: 50 });
      await passField.click();
      await page.keyboard.type(password, { delay: 50 });
      await page.keyboard.press('Enter');
      console.log('Auto-login submitted.');
    } else {
      throw new Error('Fields not found or not editable');
    }
  } catch (e) {
    console.log(`Auto-login failed (${e.message})`);
    console.log('\n>>> Please log in manually in the browser window. <<<');
    const loggedIn = await waitForLoggedIn(page);
    if (!loggedIn) {
      console.error('Timed out waiting for manual login. Exiting.');
      await browser.close();
      process.exit(1);
    }
    console.log('Manual login detected, continuing...');
  }

  await pause(3000);

  console.log('--- Step 3: Exploring schedule page ---');
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 60000 });
  await pause(3000);

  const scheduleLink = await page.$('a[href*="schedule"], a[href*="calendar"], a[href*="book"]');
  if (scheduleLink) {
    console.log('Found schedule link, clicking...');
    await scheduleLink.click();
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    await pause(3000);
  }

  console.log('--- Step 4: Looking for aircraft/booking ---');
  const bookingLink = await page.$('a[href*="reserv"], a[href*="book"], a[href*="aircraft"]');
  if (bookingLink) {
    console.log('Found booking link, clicking...');
    await bookingLink.click();
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    await pause(3000);
  }

  console.log('--- Step 5: Saving results ---');
  await browser.close();

  fs.writeFileSync('requests.json', JSON.stringify(captured, null, 2));
  console.log(`\nDone! Captured ${captured.length} requests/responses → requests.json`);
  console.log('Share requests.json here to analyze the API structure.');
})();
