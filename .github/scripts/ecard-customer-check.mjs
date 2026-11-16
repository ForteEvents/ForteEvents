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

  const ecardNav = page.getByRole('button', { name: 'E-card', exact: true })
  await ecardNav.waitFor({ state: 'visible', timeout: 60000 })
  await ecardNav.click()

  await page.getByRole('heading', { name: 'Omba huduma ya E-card' }).waitFor({ state: 'visible', timeout: 30000 })
  await page.getByText(/Hutachagua template wala kutengeneza kadi mwenyewe/).waitFor({ state: 'visible' })
  await page.getByText('Orodha ya wageni', { exact: true }).waitFor({ state: 'visible' })

  const guestList = page.locator('textarea').last()
  await guestList.fill('Asha,0712345678,single\nJuma,255712345678,double')
  await page.getByText('Wageni walioingizwa: 2', { exact: true }).waitFor({ state: 'visible' })

  const forbiddenCustomerControls = await page.getByText(/Chagua kadi unayoipenda|Hifadhi E-card|Chagua template/i).count()
  if (forbiddenCustomerControls > 0) throw new Error('Customer E-card template picker/editor is visible; customers must submit requests only.')

  await page.screenshot({ path: 'artifacts/ecard-customer-request.png', fullPage: true })
  if (failures.length) throw new Error('Browser reported errors: ' + failures.join('\n'))
  console.log('PASS: customer can prepare an E-card request with guest WhatsApp numbers; no template picker/editor is exposed. No request submitted and no credits consumed.')
} finally {
  await browser.close()
}
