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
page.on('pageerror', error => failures.push('PAGE ERROR: ' + error.message))
page.on('console', message => { if (message.type() === 'error') failures.push('CONSOLE: ' + message.text()) })

try {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.getByPlaceholder('Email', { exact: true }).fill(email)
  await page.getByPlaceholder('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Login', exact: true }).click()
  await page.getByRole('button', { name: 'E-card', exact: true }).waitFor({ state: 'visible', timeout: 60000 })
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
      }).filter(x => x.text)
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
