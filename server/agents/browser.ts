import type { Page, Locator } from 'playwright';
export async function observe(page: Page): Promise<{ text: string; controls: Locator[] }> {
  const dialog = page.locator('dialog[open]');
  const root = (await dialog.count()) ? dialog : page.locator('.play-page');
  const all = root.locator('button,select,input');
  const controls: Locator[] = [];
  const labels: string[] = [];
  for (let i = 0; i < (await all.count()); i++) {
    const control = all.nth(i);
    if (
      !(await control.isVisible()) ||
      !(await control.isEnabled()) ||
      (await control.evaluate((el) => el.classList.contains('reset-button')))
    )
      continue;
    const label = await control.evaluate((el) => ({
      tag: el.tagName,
      name:
        el.getAttribute('aria-label') ||
        el.textContent?.trim() ||
        el.getAttribute('placeholder') ||
        '',
      value: (el as HTMLInputElement).value,
      checked: (el as HTMLInputElement).checked,
    }));
    labels.push(`${controls.length}: ${JSON.stringify(label)}`);
    controls.push(control);
  }
  const text = (await root.innerText()).slice(0, 12000);
  return { text: `VISIBLE PAGE:\n${text}\nCONTROLS:\n${labels.join('\n')}`, controls };
}
export async function execute(
  page: Page,
  controls: Locator[],
  action: { action: string; target: number; value: string },
) {
  if (action.action === 'scroll') {
    await page.mouse.wheel(0, action.value === 'up' ? -500 : 500);
    return;
  }
  if (action.action === 'finish') return;
  const control = controls[action.target];
  if (!control) throw new Error('That control index is not present in the latest observation.');
  const name = (await control.getAttribute('aria-label')) || (await control.innerText());
  const sendsRequest =
    (await control.getAttribute('data-workflow')) !== null ||
    /^(Inspect |Go to checkout|Place order|Try checkout again|All headphones|Close checkout)/.test(
      name,
    );
  const response = sendsRequest
    ? page.waitForResponse(
        (res) => res.url().includes('/api/runs/') && res.request().method() === 'POST',
        { timeout: 8000 },
      )
    : null;
  if (action.action === 'click') await control.click({ timeout: 5000 });
  else if (action.action === 'select') await control.selectOption(action.value, { timeout: 5000 });
  else throw new Error('Unsupported browser action.');
  if (response) await response;
  await page.waitForFunction(
    () =>
      !document.querySelector('.product-grid.is-busy') &&
      !document.body.innerText.includes('Verifying order…'),
    null,
    { timeout: 8000 },
  );
}
