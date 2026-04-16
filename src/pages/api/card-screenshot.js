/**
 * GET /api/card-screenshot?slug=...&design=...
 *
 * Launches a headless Chromium browser, navigates to the /card-preview/[slug]
 * page, waits for the card to finish rendering (window._cardReady), then
 * screenshots the 1080×1080 viewport and returns the PNG.
 *
 * Environment variables:
 *   PUPPETEER_EXECUTABLE_PATH  — path to a local Chrome/Chromium binary
 *                                (useful in CI or custom environments)
 *   CHROMIUM_PACK_URL          — URL to the @sparticuz/chromium-min pack tar
 *                                (defaults to the v147 GitHub release)
 */

export const prerender = false

async function resolveExecutablePath() {
  // 1. Explicit override wins (CI / custom environments)
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH
  }

  // 2. Try @sparticuz/chromium-min (Vercel / serverless Lambda)
  try {
    const chromium = await import('@sparticuz/chromium-min')
    const packUrl =
      process.env.CHROMIUM_PACK_URL ||
      'https://github.com/Sparticuz/chromium/releases/download/v147.0.0/chromium-v147.0.0-pack.tar'
    return await chromium.default.executablePath(packUrl)
  } catch {
    // Not a Lambda environment — fall through to local Chrome
  }

  // 3. Common local Chrome/Chromium paths (macOS, Linux)
  const { existsSync } = await import('node:fs')
  const candidates = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
  ]
  for (const p of candidates) {
    if (existsSync(p)) return p
  }

  return null
}

export async function GET({ url }) {
  const slug = url.searchParams.get('slug')?.trim()
  const design = url.searchParams.get('design')?.trim() || 'holo-refractor'

  if (!slug) {
    return new Response(JSON.stringify({ error: 'slug parameter is required' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    })
  }

  const previewUrl = `${url.origin}/card-preview/${encodeURIComponent(slug)}?design=${encodeURIComponent(design)}`

  let browser
  try {
    const executablePath = await resolveExecutablePath()

    if (!executablePath) {
      return new Response(
        JSON.stringify({
          error:
            'No Chrome/Chromium binary found. Set PUPPETEER_EXECUTABLE_PATH or CHROMIUM_PACK_URL.',
        }),
        { status: 500, headers: { 'content-type': 'application/json' } }
      )
    }

    const puppeteer = await import('puppeteer-core')

    browser = await puppeteer.default.launch({
      executablePath,
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--font-render-hinting=none',
      ],
    })

    const page = await browser.newPage()

    // 1080×1080 = 1:1 square — perfect for social sharing
    await page.setViewport({ width: 1080, height: 1080, deviceScaleFactor: 1 })

    await page.goto(previewUrl, {
      waitUntil: 'networkidle2',
      timeout: 25000,
    })

    // Wait for the card JS to signal that images and CSS have settled
    await page.waitForFunction(() => window._cardReady === true, {
      timeout: 12000,
      polling: 200,
    })

    const screenshot = await page.screenshot({ type: 'png' })

    return new Response(screenshot, {
      headers: {
        'content-type': 'image/png',
        'content-disposition': `attachment; filename="${slug}-${design}.png"`,
        'cache-control': 'no-store',
      },
    })
  } catch (err) {
    console.error('[card-screenshot]', err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { 'content-type': 'application/json' } }
    )
  } finally {
    await browser?.close()
  }
}
