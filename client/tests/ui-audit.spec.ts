import { expect, test, type Page, type TestInfo } from '@playwright/test';

const ROUTES = [
  { name: 'home', path: '/' },
  { name: 'my-tasks', path: '/my-tasks' },
  { name: 'tasks', path: '/tasks' },
  { name: 'projects', path: '/projects' },
  { name: 'team', path: '/team' },
  { name: 'meetings', path: '/meetings' },
  { name: 'gantt', path: '/gantt' },
  { name: 'settings', path: '/settings' },
  { name: 'attendance', path: '/attendance' },
  { name: 'attendance-check', path: '/attendance/check' },
  { name: 'attendance-cells', path: '/attendance/cells' },
  { name: 'attendance-reports', path: '/attendance/reports' },
  { name: 'admin', path: '/admin' },
];

async function login(page: Page) {
  await page.goto('/login');
  await page.getByLabel('이메일').fill('admin@example.com');
  await page.getByLabel('비밀번호').fill('password123');
  await page.getByRole('button', { name: /login|로그인/i }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText('INTRUTH').first()).toBeVisible();
}

function collectBrowserErrors(page: Page) {
  const errors: string[] = [];

  page.on('response', (response) => {
    const status = response.status();
    const url = response.url();
    if (status >= 400 && url.includes('/api/')) {
      errors.push(`response: ${status} ${url}`);
    }
  });

  page.on('requestfailed', (request) => {
    const failure = request.failure()?.errorText || 'unknown';
    if (failure === 'net::ERR_ABORTED') return;

    const url = request.url();
    if (url.includes('/api/') || ['fetch', 'xhr'].includes(request.resourceType())) {
      errors.push(`requestfailed: ${failure} ${url}`);
    }
  });

  page.on('pageerror', (error) => {
    errors.push(`pageerror: ${error.message}`);
  });

  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const text = message.text();
    if (text.includes('Download the React DevTools')) return;
    if (text.includes('Failed to load resource')) return;
    if (text.includes('[HttpClient] Network Error: TypeError: Failed to fetch')) return;
    if (text.includes('[HttpClient] API Error:')) return;
    if (text.includes('Failed to fetch monthly stats:')) return;
    errors.push(`console: ${text}`);
  });

  return errors;
}

async function waitForAppSettled(page: Page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(350);
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
  }));

  expect(
    Math.max(overflow.scrollWidth, overflow.bodyScrollWidth),
    `horizontal overflow: viewport=${overflow.innerWidth}, document=${overflow.scrollWidth}, body=${overflow.bodyScrollWidth}`
  ).toBeLessThanOrEqual(overflow.innerWidth + 2);
}

async function expectNoVisibleElementLeaks(page: Page) {
  const leaks = await page.evaluate(() => {
    const selectors = [
      'button',
      'a',
      'input',
      'select',
      'textarea',
      '[role="button"]',
      '[role="menu"]',
      '[role="dialog"]',
    ].join(',');

    function hasHorizontalScrollAncestor(element: HTMLElement) {
      let parent = element.parentElement;
      while (parent && parent !== document.body && parent !== document.documentElement) {
        const style = window.getComputedStyle(parent);
        const clipsHorizontally = ['auto', 'scroll', 'hidden', 'clip'].includes(style.overflowX);
        if (clipsHorizontally && parent.scrollWidth > parent.clientWidth + 2) {
          return true;
        }
        parent = parent.parentElement;
      }
      return false;
    }

    return Array.from(document.querySelectorAll<HTMLElement>(selectors))
      .map((element) => {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        const label =
          element.getAttribute('aria-label') ||
          element.textContent?.trim().replace(/\s+/g, ' ').slice(0, 40) ||
          element.tagName.toLowerCase();

        return {
          label,
          insideHorizontalScroll: hasHorizontalScrollAncestor(element),
          visible:
            rect.width > 0 &&
            rect.height > 0 &&
            style.visibility !== 'hidden' &&
            style.display !== 'none' &&
            Number(style.opacity) !== 0,
          left: rect.left,
          right: rect.right,
          width: rect.width,
        };
      })
      .filter((item) => item.visible)
      .filter((item) => !item.insideHorizontalScroll)
      .filter((item) => item.left < -2 || item.right > window.innerWidth + 2)
      .slice(0, 8);
  });

  expect(leaks, `visible interactive elements outside viewport: ${JSON.stringify(leaks)}`).toEqual([]);
}

async function auditCurrentPage(page: Page, testInfo: TestInfo, screenshotName: string) {
  await waitForAppSettled(page);
  await expect(page.locator('body')).toBeVisible();
  await expect(page.getByText('페이지를 찾을 수 없습니다')).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
  await expectNoVisibleElementLeaks(page);

  await page.screenshot({
    path: testInfo.outputPath(`ui-audit-${screenshotName}.png`),
    fullPage: true,
  });
}

test.describe('INTRUTH UI audit', () => {
  test('all authenticated pages render cleanly', async ({ page }, testInfo) => {
    const errors = collectBrowserErrors(page);
    await login(page);

    for (const route of ROUTES) {
      await page.goto(route.path);
      await auditCurrentPage(page, testInfo, route.name);
    }

    expect(errors).toEqual([]);
  });

  test('mobile menu opens as an isolated panel', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes('mobile'), 'mobile-only interaction');

    const errors = collectBrowserErrors(page);
    await login(page);
    await page.getByLabel('메뉴 열기').click();
    await expect(page.getByRole('button', { name: '메뉴 닫기' })).toBeVisible();
    await expect(page.getByText('INTRUTH').first()).toBeVisible();
    await expect(page.getByRole('link', { name: /회의자료/ })).toBeVisible();
    await auditCurrentPage(page, testInfo, 'mobile-menu');
    expect(errors).toEqual([]);
  });

  test('quick task modal controls fit on mobile', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes('mobile'), 'mobile-only interaction');

    const errors = collectBrowserErrors(page);
    await login(page);
    await page.getByLabel('빠른 추가').click();
    await page.getByRole('button', { name: '새 업무' }).click();
    await expect(page.getByRole('heading', { name: '새 업무' })).toBeVisible();
    await expect(page.getByRole('button', { name: '대기중' })).toBeVisible();
    await expect(page.getByRole('button', { name: '보통' })).toBeVisible();
    await auditCurrentPage(page, testInfo, 'quick-task-modal');
    expect(errors).toEqual([]);
  });

  test('settings integrations panel renders share readiness', async ({ page }, testInfo) => {
    const errors = collectBrowserErrors(page);
    await login(page);
    await page.goto('/settings');
    await page.getByRole('button', { name: '연동' }).click();
    await expect(page.getByText('카카오톡 공유')).toBeVisible();
    await expect(page.getByText('공유 기준 URL')).toBeVisible();
    await expect(page.getByText('PDF 파일 공유')).toBeVisible();
    await auditCurrentPage(page, testInfo, 'settings-integrations');
    expect(errors).toEqual([]);
  });
});
