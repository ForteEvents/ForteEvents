import { chromium } from 'playwright'
import fs from 'node:fs/promises'

const baseUrl = (process.env.FORTE_BASE_URL || 'https://forteevents-web.onrender.com').replace(/\/$/, '')
const email = process.env.FORTE_TEST_EMAIL
const password = process.env.FORTE_TEST_PASSWORD
if (!email || !password) throw new Error('Missing FORTE_TEST_EMAIL or FORTE_TEST_PASSWORD GitHub Actions secrets')

await fs.mkdir('artifacts', { recursive: true })
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 1 })
const failures = []
const authResponses = []
page.on('pageerror', error => failures.push('PAGE ERROR: ' + error.message))
page.on('console', message => { if (message.type() === 'error') failures.push('CONSOLE: ' + message.text()) })
page.on('response', response => {
  const url = new URL(response.url())
  if (/supabase|auth/i.test(url.hostname + url.pathname)) authResponses.push({ url: url.origin + url.pathname, status: response.status() })
})

try {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.getByPlaceholder('Email', { exact: true }).fill(email)
  await page.getByPlaceholder('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Login', exact: true }).click()
  const ecardNav = page.getByRole('button', { name: 'E-card', exact: true })
  try {
    await ecardNav.waitFor({ state: 'visible', timeout: 60000 })
  } catch (error) {
    const state = await page.evaluate(() => ({
      url: location.href,
      title: document.title,
      headings: [...document.querySelectorAll('h1,h2,h3')].map(el => (el.innerText || '').trim()).filter(Boolean).slice(0, 20),
      visibleButtons: [...document.querySelectorAll('button')].filter(el => el.getClientRects().length).map(el => (el.innerText || el.getAttribute('aria-label') || '').trim()).filter(Boolean).slice(0, 40),
      alerts: [...document.querySelectorAll('[role="alert"],[role="status"]')].filter(el => el.getClientRects().length).map(el => (el.innerText || '').trim()).filter(Boolean).slice(0, 20),
      visibleMessages: [...document.querySelectorAll('.message')].filter(el => el.getClientRects().length).map(el => (el.innerText || '').trim()).filter(Boolean).slice(0, 20),
      loginFormVisible: [...document.querySelectorAll('input')].some(el => el.getClientRects().length && /password/i.test(el.type))
    }))
    state.authResponses = authResponses
    state.browserErrors = failures
    await fs.writeFile('artifacts/ecard-login-diagnostics.json', JSON.stringify(state, null, 2))
    throw new Error('E-card navigation did not appear after login. Safe page diagnostics saved to artifacts/ecard-login-diagnostics.json. Original: ' + error.message)
  }
  await page.getByRole('button', { name: 'E-card', exact: true }).click()
  await page.getByText('Chagua kadi unayoipenda').waitFor({ state: 'visible', timeout: 30000 })

  const template = page.getByRole('button', { name: 'Chagua sampuli Luxury Floral Gold', exact: true })
  await template.click()
  const form = page.locator('form').filter({ has: page.getByRole('button', { name: 'Hifadhi E-card' }) })
  const inputs = form.locator('input')
  await inputs.nth(0).fill('TEST - Harusi ya Amina na Baraka')
  await inputs.nth(1).fill('Familia ya Majaribio')
  await inputs.nth(2).fill('2027-08-21')
  await inputs.nth(3).fill('14:00')
  await inputs.nth(4).fill('Amina')
  await inputs.nth(5).fill('Baraka')
  await form.locator('textarea').first().fill('Tunayo furaha kukualika kushiriki nasi katika siku hii ya pekee. Tafadhali fika mapema na tusherehekee pamoja na familia zetu.')

  const preview = page.locator('.ecard-luxury-floral-card').last()
  await preview.waitFor({ state: 'visible', timeout: 30000 })
  await page.screenshot({ path: 'artifacts/ecard-customer-preview.png', fullPage: true })
  const geometry = await preview.evaluate(el => {
    const rect = el.getBoundingClientRect()
    const textNodes = [...el.querySelectorAll('h1,h2,h3,p,span,b,strong,small')]
    return {
      card: { x: rect.x, y: rect.y, width: rect.width, height: rect.height, scrollWidth: el.scrollWidth, scrollHeight: el.scrollHeight },
      overflow: el.scrollWidth > el.clientWidth + 2 || el.scrollHeight > el.clientHeight + 2,
      text: textNodes.map(node => {
        const r = node.getBoundingClientRect()
        const cs = getComputedStyle(node)
        return { text: (node.innerText || '').trim().slice(0, 100), x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height), fontSize: cs.fontSize }
      }).filter(x => x.text),
      overflowingChildren: [...el.querySelectorAll('*')].map(node => {
        const r = node.getBoundingClientRect()
        const cs = getComputedStyle(node)
        return { tag: node.tagName.toLowerCase(), className: typeof node.className === 'string' ? node.className : '', text: (node.innerText || node.getAttribute('alt') || '').trim().slice(0, 80), left: Math.round(r.left - rect.left), right: Math.round(r.right - rect.left), top: Math.round(r.top - rect.top), bottom: Math.round(r.bottom - rect.top), width: Math.round(r.width), height: Math.round(r.height), position: cs.position, overflow: cs.overflow }
      }).filter(item => item.left < -2 || item.right > rect.width + 2 || item.top < -2 || item.bottom > rect.height + 2).slice(0, 40)
    }
  })
  await fs.writeFile('artifacts/ecard-layout.json', JSON.stringify({ baseUrl, geometry, browserErrors: failures }, null, 2))
  if (geometry.overflow) throw new Error('E-card preview container overflows; see artifacts/ecard-layout.json')

  // Save one clearly labelled test card only. No guests are generated, so no TSh 500 guest credits are consumed.
  await form.getByRole('button', { name: 'Hifadhi E-card', exact: true }).click()
  await page.getByText(/E-card imehifadhiwa\./).waitFor({ state: 'visible', timeout: 45000 })
  await page.screenshot({ path: 'artifacts/ecard-after-save.png', fullPage: true })
  if (failures.length) throw new Error('Browser reported errors: ' + failures.join('\n'))
  console.log('PASS: test customer login, Luxury Floral Gold preview, layout measurement and E-card save.')
} finally {
  await browser.close()
}
