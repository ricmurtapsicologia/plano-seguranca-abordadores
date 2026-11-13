const { test, expect } = require('@playwright/test');
const fs = require('fs');
const SITE = 'https://ricmurtapsicologia.github.io/plano-seguranca-abordadores/';
const STORAGE = 'gto-ats-plano-seguranca-abordador-v1';
const value = 'Teste automatizado de seguranca e autocuidado';
async function open(page) {
  await page.goto(SITE + '#conteudo', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#progressText')).toBeVisible();
}
test('01 pagina publica e navegacao interna', async ({ page }) => {
  await open(page);
  await expect(page).toHaveTitle(/Plano de Seguranca do Abordador|Plano de Segurança do Abordador/);
  await expect(page.locator('h1#pageTitle')).toHaveText('Plano de Segurança do Abordador');
  await expect(page.locator('main#conteudo')).toBeVisible();
  await page.locator('a.brand').click();
  await expect(page).toHaveURL(/#conteudo$/);
});
test('02 telefones de emergencia com discagem exata', async ({ page }) => {
  await open(page);
  const links = page.locator('.emergency__actions a');
  await expect(links).toHaveCount(3);
  await expect(page.getByRole('link', { name: /SAMU 192/ })).toHaveAttribute('href', 'tel:192');
  await expect(page.getByRole('link', { name: /Bombeiros 193/ })).toHaveAttribute('href', 'tel:193');
  await expect(page.getByRole('link', { name: /CVV 188/ })).toHaveAttribute('href', 'tel:188');
  const all = await links.evaluateAll(els => els.map(e => e.getAttribute('href')));
  expect(all).toEqual(['tel:192','tel:193','tel:188']);
});
test('03 todos os campos, progresso e persistencia automatica', async ({ page }) => {
  await open(page);
  await expect(page.locator('[data-plan]')).toHaveCount(8);
  await expect(page.locator('[type=checkbox][data-save]')).toHaveCount(6);
  await expect(page.locator('#progressText')).toHaveText('0%');
  await page.fill('#nome', 'Pessoa de teste');
  await page.fill('#unidade', 'Unidade teste');
  await page.fill('#revisao', '2026-12-21');
  for (const id of ['sinais','estrategias','distracoes','rede','servicos','seguranca','pos','razoes']) {
    await page.fill('#' + id, value + ' ' + id);
  }
  await page.locator('#c1').check();
  await page.locator('#c6').check();
  await expect(page.locator('#progressText')).toHaveText('100%');
  await expect.poll(() => page.evaluate(k => localStorage.getItem(k), STORAGE)).not.toBeNull();
  await expect.poll(async () => JSON.parse(await page.evaluate(k => localStorage.getItem(k), STORAGE)).razoes).toContain('razoes');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('#progressText')).toHaveText('100%');
  await expect(page.locator('#nome')).toHaveValue('Pessoa de teste');
  await expect(page.locator('#revisao')).toHaveValue('2026-12-21');
  await expect(page.locator('#c1')).toBeChecked();
  await expect(page.locator('#c6')).toBeChecked();
});
test('04 salvar manualmente e mostrar confirmacao', async ({ page }) => {
  await open(page);
  await page.fill('#sinais', value);
  await page.locator('#saveButton').click();
  await expect(page.locator('#toast')).toContainText('Plano salvo neste dispositivo.');
  const saved = await page.evaluate(k => JSON.parse(localStorage.getItem(k)), STORAGE);
  expect(saved.sinais).toBe(value);
});
test('05 apagar: cancelar preserva; confirmar remove sem ressurgir', async ({ page }) => {
  await open(page);
  await page.fill('#nome', 'Apagar dados pessoais');
  await page.fill('#sinais', value);
  await page.locator('#saveButton').click();
  page.once('dialog', d => d.dismiss());
  await page.locator('#clearButton').click();
  await expect(page.locator('#nome')).toHaveValue('Apagar dados pessoais');
  page.once('dialog', d => d.accept());
  await page.locator('#clearButton').click();
  await expect(page.locator('#nome')).toHaveValue('');
  await expect(page.locator('#sinais')).toHaveValue('');
  await expect(page.locator('#progressText')).toHaveText('0%');
  await page.waitForTimeout(850);
  expect(await page.evaluate(k => localStorage.getItem(k), STORAGE)).toBeNull();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('#sinais')).toHaveValue('');
  expect(await page.evaluate(k => localStorage.getItem(k), STORAGE)).toBeNull();
});
test('06 imprimir chama fluxo do navegador', async ({ page }) => {
  await page.addInitScript(() => { window.__printed = 0; window.print = () => { window.__printed += 1; }; });
  await open(page);
  await page.locator('#printButton').click();
  expect(await page.evaluate(() => window.__printed)).toBe(1);
});
test('07 compartilhar via API nativa', async ({ page }) => {
  await page.addInitScript(() => {
    window.__shared = null;
    Object.defineProperty(navigator, 'share', { configurable: true, value: async d => { window.__shared = d; } });
  });
  await open(page);
  await page.locator('#shareButton').click();
  const shared = await page.evaluate(() => window.__shared);
  expect(shared.title).toContain('Plano de Segurança');
  expect(shared.url).toContain('plano-seguranca-abordadores');
});
test('08 compartilhar fallback para area de transferencia', async ({ page }) => {
  await page.addInitScript(() => {
    window.__copied = '';
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async s => { window.__copied = s; } } });
  });
  await open(page);
  await page.locator('#shareButton').click();
  expect(await page.evaluate(() => window.__copied)).toContain('plano-seguranca-abordadores');
  await expect(page.locator('#toast')).toContainText('Link copiado.');
});
test('09 gerar e baixar PDF real', async ({ page }) => {
  await open(page);
  await page.fill('#nome', 'Pessoa de teste');
  await page.fill('#sinais', value);
  await page.locator('#c1').check();
  const [download] = await Promise.all([page.waitForEvent('download', {timeout:30000}), page.locator('#pdfButton').click()]);
  expect(download.suggestedFilename()).toBe('Plano-de-Seguranca-do-Abordador-GTO-ATS.pdf');
  const path = await download.path();
  const bytes = fs.readFileSync(path);
  expect(bytes.subarray(0,5).toString()).toBe('%PDF-');
  expect(bytes.length).toBeGreaterThan(2000);
  await expect(page.locator('#overlay')).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('#toast')).toContainText('PDF gerado.');
});
test('10 accordions, iframes de recursos e links', async ({ page }) => {
  await open(page);
  const frames = page.locator('iframe[src*="youtube-nocookie.com/embed/"]');
  await expect(frames).toHaveCount(5);
  const srcs = await frames.evaluateAll(els => els.map(e => e.src));
  expect(new Set(srcs).size).toBe(5);
  expect(srcs.every(x => x.startsWith('https://www.youtube-nocookie.com/embed/'))).toBeTruthy();
  const panels = page.locator('details.tool');
  await expect(panels).toHaveCount(2);
  for (let i = 0; i < 2; i++) {
    await panels.nth(i).locator('summary').click();
    await expect(panels.nth(i)).toHaveAttribute('open', '');
    await panels.nth(i).locator('summary').click();
    await expect(panels.nth(i)).not.toHaveAttribute('open', '');
  }
});
test('11 preenchimento permanece local e nao vaza em requisicoes', async ({ page }) => {
  const marker = 'CONTEUDO TESTE NAO SENSIVEL';
  const siteOrigin = new URL(SITE).origin;
  const ownPosts = [];
  const leaks = [];
  page.on('request', req => {
    if (req.method() === 'POST' && new URL(req.url()).origin === siteOrigin) ownPosts.push(req.url());
    if ((req.url() + ' ' + (req.postData() || '')).includes(marker)) leaks.push(req.url());
  });
  await open(page);
  await page.fill('#rede', marker);
  await page.locator('#saveButton').click();
  await page.waitForTimeout(650);
  const saved = await page.evaluate(k => JSON.parse(localStorage.getItem(k)).rede, STORAGE);
  expect(saved).toBe(marker);
  expect(ownPosts).toEqual([]);
  expect(leaks).toEqual([]);
});
for (const width of [360,390,768]) {
  test('12 responsividade sem overflow em ' + width + 'px', async ({ page }) => {
    await page.setViewportSize({width,height:780});
    await open(page);
    const sizes = await page.evaluate(() => ({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));
    expect(sizes.scroll).toBeLessThanOrEqual(sizes.client + 1);
    await expect(page.locator('#pdfButton')).toBeVisible();
    await expect(page.locator('#shareButton')).toBeVisible();
    await expect(page.locator('#printButton')).toBeVisible();
    await expect(page.getByRole('link', { name: /CVV 188/ })).toBeVisible();
  });
}

test('13 previsualizacao WhatsApp reutiliza imagem da Jornada Terapeutica', async ({ page, request }) => {
  const jornada = await request.get('https://ricmurtapsicologia.github.io/Inicio-de-Jornada-Terapeutica/');
  expect(jornada.ok()).toBeTruthy();
  const sourceHtml = await jornada.text();
  const match = sourceHtml.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i);
  expect(match).not.toBeNull();
  const expected = match[1];
  await open(page);
  for (const selector of ['meta[property="og:image"]', 'meta[property="og:image:secure_url"]', 'meta[name="twitter:image"]']) {
    await expect(page.locator(selector)).toHaveAttribute('content', expected);
  }
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', /Plano de Segurança do Abordador/);
});
