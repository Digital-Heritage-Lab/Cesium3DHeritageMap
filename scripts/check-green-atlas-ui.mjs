import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const url = 'http://localhost:8080/Apps/3DHeritageMapApp.html';
const browser = await chromium.launch({ headless: true });
const overlap = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
const report = {};
await mkdir('output/playwright', { recursive: true });

async function open(width, height) {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1800);
  return page;
}

{
  const page = await open(1024, 768);
  await page.locator('[data-app-view="labs"]').click();
  await page.waitForTimeout(150);
  report.tablet = await page.evaluate(() => {
    const workspace = document.querySelector('#labsWorkspace').getBoundingClientRect();
    const catalog = document.querySelector('#labsCatalog').getBoundingClientRect();
    const detail = document.querySelector('#labsDetail').getBoundingClientRect();
    return { workspace, catalog, detail, overflowX: document.documentElement.scrollWidth - innerWidth };
  });
  await page.screenshot({ path: 'output/playwright/atlas-tablet-1024.png' });
  await page.close();
}

{
  const page = await open(390, 844);
  report.mobileMap = await page.evaluate((overlapSource) => {
    const overlapFn = Function(`return (${overlapSource})`)();
    const credit = document.querySelector('.cesium-viewer-bottom').getBoundingClientRect();
    const stats = document.querySelector('.map-statistics').getBoundingClientRect();
    return { credit, stats, overlap: overlapFn(credit, stats), overflowX: document.documentElement.scrollWidth - innerWidth };
  }, overlap.toString());
  await page.locator('#mobileSearch').click();
  report.mobileSearch = await page.evaluate(() => ({
    bodyOpen: document.body.classList.contains('mobile-search-open'),
    sidebarDisplay: getComputedStyle(document.querySelector('.sidebar')).display,
    active: document.querySelector('.mobile-nav .active')?.id,
    focus: document.activeElement?.id,
  }));
  await page.locator('#mobileLabs').click();
  await page.locator('[data-open-lab="digifried"]').click();
  report.mobileLabs = await page.evaluate(() => ({
    active: document.querySelector('.mobile-nav .active')?.id,
    currentCount: document.querySelectorAll('.mobile-nav [aria-current="page"]').length,
    focusClosesLabs: document.activeElement?.hasAttribute('data-close-labs'),
    detailVisible: getComputedStyle(document.querySelector('#labsDetail')).display,
    subprojectTitle: document.querySelector('.lab-subproject h4')?.textContent,
    subprojectImageLoaded: document.querySelector('.lab-subproject img')?.complete,
    subprojectUrl: document.querySelector('.lab-subproject a')?.href,
  }));
  await page.locator('.lab-subproject').scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'output/playwright/atlas-mobile-digifried-390.png' });
  await page.locator('[data-close-labs]').click();
  await page.locator('#mobileAI').click();
  report.mobileAI = await page.evaluate((overlapSource) => {
    const overlapFn = Function(`return (${overlapSource})`)();
    const credit = document.querySelector('.cesium-viewer-bottom').getBoundingClientRect();
    const panel = document.querySelector('#aiChatPanel').getBoundingClientRect();
    return {
      active: document.querySelector('.mobile-nav .active')?.id,
      statsVisibility: getComputedStyle(document.querySelector('.map-statistics')).visibility,
      creditPanelOverlap: overlapFn(credit, panel),
    };
  }, overlap.toString());
  await page.screenshot({ path: 'output/playwright/atlas-mobile-390.png' });
  await page.close();
}

{
  const page = await open(320, 568);
  report.small = await page.evaluate((overlapSource) => {
    const overlapFn = Function(`return (${overlapSource})`)();
    const tools = document.querySelector('.map-tools').getBoundingClientRect();
    const credit = document.querySelector('.cesium-viewer-bottom').getBoundingClientRect();
    const stats = document.querySelector('.map-statistics').getBoundingClientRect();
    return { tools, creditStatsOverlap: overlapFn(credit, stats), overflowX: document.documentElement.scrollWidth - innerWidth };
  }, overlap.toString());
  await page.screenshot({ path: 'output/playwright/atlas-mobile-320.png' });
  await page.close();
}

await browser.close();
console.log(JSON.stringify(report, null, 2));
