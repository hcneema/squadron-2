const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const iconHtml = (size) => `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html, body {
    width: ${size}px; height: ${size}px;
    background: #0a1628;
    display: flex; align-items: center; justify-content: center;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    overflow: hidden;
  }
  .wrap {
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    gap: ${size * 0.04}px;
  }
  .plane {
    font-size: ${size * 0.42}px;
    line-height: 1;
    color: #f0a500;
    text-shadow: 0 0 ${size*0.06}px rgba(240,165,0,0.6);
    transform: rotate(-10deg);
    font-style: normal;
  }
  .text {
    font-size: ${size * 0.16}px;
    font-weight: 800;
    letter-spacing: ${size * 0.012}px;
    color: rgba(255,255,255,0.95);
    text-transform: uppercase;
  }
  .sub {
    font-size: ${size * 0.07}px;
    font-weight: 500;
    letter-spacing: ${size * 0.008}px;
    color: rgba(255,200,80,0.8);
    text-transform: uppercase;
  }
</style>
</head>
<body>
  <div class="wrap">
    <div class="plane">&#9992;</div>
    <div class="text">SQ2</div>
    <div class="sub">Flying Club</div>
  </div>
</body>
</html>`;

(async () => {
  const outDir = path.join(__dirname, 'pwa', 'icons');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch({ channel: 'msedge' });

  for (const size of [192, 512]) {
    const page = await browser.newPage();
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(iconHtml(size), { waitUntil: 'networkidle' });
    const file = path.join(outDir, `icon-${size}.png`);
    await page.screenshot({ path: file, clip: { x: 0, y: 0, width: size, height: size } });
    await page.close();
    console.log(`Generated ${file}`);
  }

  await browser.close();
  console.log('Icons ready.');
})();
