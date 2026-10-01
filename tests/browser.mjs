// Optional QA dependency: npm install --no-save --package-lock=false playwright@1.56.1
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { build } from '../scripts/build.mjs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
await mkdir('artifacts/screenshots', { recursive: true });
await build({ outDir: 'artifacts/browser-site', formId: 'testonly', siteUrl: '' });
const server = spawn(process.execPath, ['scripts/serve.mjs', 'artifacts/browser-site'], { env: { ...process.env, PORT: '4174' }, stdio: ['ignore', 'pipe', 'inherit'] });
await new Promise((resolve, reject) => { server.stdout.once('data', resolve); server.once('error', reject); });
let browser;
const report = [];
try {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  // Never send a real inquiry. Every external request is intercepted.
  let responses = [];
  let requests = 0;
  let receivedBody = '';
  await context.route('https://formspree.io/**', async route => {
    requests++;
    receivedBody = route.request().postData() || '';
    const next = responses.shift();
    assert.ok(next, 'No unplanned form submission');
    if (next === 'network') return route.abort('failed');
    await route.fulfill({ status: next.status, contentType: 'application/json', body: JSON.stringify(next.body) });
  });
  const sizes = [[320,640],[390,844],[430,932],[768,1024],[1280,800],[1440,1000],[1920,1080],[2560,1440]];
  for (const [width,height] of sizes) {
    await page.setViewportSize({ width, height });
    await page.goto('http://localhost:4174');
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.title(), 'The Prest Company');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Overflow at ${width}`);
    const clipping = await page.locator('h1').evaluate(element => {
      const range = document.createRange(); range.selectNodeContents(element.querySelector('.wordmark'));
      const rect = range.getBoundingClientRect();
      return rect.left >= -1 && rect.right <= innerWidth + 1;
    });
    assert.ok(clipping, `Wordmark clipping at ${width}`);
    for (const id of ['name','email','organization','subject','message']) assert.ok(await page.locator(`label[for="${id}"]`).count());
    await page.screenshot({ path: `artifacts/screenshots/${width}.png`, fullPage: true });
    if (process.env.CI_VISUAL_REVIEW === '1' && [390, 768, 1440].includes(width)) {
      const review = await page.screenshot({ type: 'jpeg', quality: 45, fullPage: true });
      console.log(`VISUAL_REVIEW_${width}=${review.toString('base64')}`);
    }
    report.push(`${width}×${height}: no overflow; wordmark fits; screenshot captured`);
  }
  assert.deepEqual(errors, [], 'No initial browser console errors');
  const links = await page.locator('a[href^="#"]').evaluateAll(items => items.map(item => item.hash));
  for (const hash of links) assert.equal(await page.locator(hash).count(), 1);
  const assets = await page.locator('[href^="./"], [src^="./"]').evaluateAll(items => items.map(item => item.href || item.src));
  for (const url of assets) assert.ok((await context.request.get(url)).ok(), url);
  await page.goto('http://localhost:4174');
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement.className), 'skip-link');
  assert.notEqual(await page.locator('.skip-link').evaluate(el => getComputedStyle(el).outlineStyle), 'none');
  await page.keyboard.press('Enter');
  await page.locator('.contact-link').click();
  await page.waitForFunction(() => location.hash === '#contact');
  await page.locator('#name').focus();
  for (const id of ['email','organization','subject','message']) { await page.keyboard.press('Tab'); assert.equal(await page.evaluate(() => document.activeElement.id), id); }
  await page.getByRole('button', { name: 'SEND MESSAGE' }).click();
  assert.equal(requests, 0, 'Native required validation blocks submission');
  const fill = async () => {
    await page.locator('#name').fill('QA Test'); await page.locator('#email').fill('qa@example.invalid');
    await page.locator('#subject').fill('Automated intercepted test'); await page.locator('#message').fill('This never leaves the test browser.');
  };
  await fill();
  await page.locator('#email').fill('invalid');
  await page.getByRole('button', { name: 'SEND MESSAGE' }).click();
  assert.equal(requests, 0, 'Invalid email blocked');
  await fill();
  responses.push({ status: 200, body: { ok: true } });
  await page.getByRole('button', { name: 'SEND MESSAGE' }).click();
  await page.waitForFunction(() => document.querySelector('#form-status').dataset.state === 'success');
  assert.equal(await page.locator('#message').inputValue(), '');
  assert.ok(receivedBody.includes('_gotcha'), 'Honeypot reaches provider');
  for (const response of [{ status: 422, body: { errors: [{ message: 'Rejected' }] } }, { status: 200, body: {} }, 'network']) {
    await fill(); responses.push(response);
    await page.getByRole('button', { name: 'SEND MESSAGE' }).click();
    await page.waitForFunction(() => document.querySelector('#form-status').textContent.includes('could not be confirmed'));
    assert.ok(await page.locator('#message').inputValue(), 'Failed submission preserves input');
    assert.equal(await page.getByRole('button', { name: 'SEND MESSAGE' }).isEnabled(), true);
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior), 'auto');
  const staticContext = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const staticPage = await staticContext.newPage(); await staticPage.goto('http://localhost:4174');
  assert.ok(await staticPage.locator('#hero-title').isVisible());
  assert.ok(await staticPage.getByRole('button', { name: 'SEND MESSAGE' }).isEnabled());
  assert.equal(await staticPage.locator('form').getAttribute('method'), 'post');
  await staticContext.close();
  // Test unconfigured review output independently.
  await build({ outDir: 'artifacts/browser-site', formId: '', siteUrl: '' });
  await page.reload(); await fill(); const before = requests;
  await page.getByRole('button', { name: 'SEND MESSAGE' }).click();
  assert.match(await page.locator('#form-status').textContent(), /has not been sent/);
  assert.equal(requests, before);
  report.push('PASS: asset links, anchor links, keyboard order, focus, required/email validation, mocked success, provider error, malformed response, network failure, unconfigured guard, no-JS content, reduced motion.');
  await writeFile('artifacts/browser-report.txt', report.join('\n'));
  console.log(report.join('\n'));
} finally { await browser?.close(); server.kill(); }
