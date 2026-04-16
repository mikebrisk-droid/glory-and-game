/**
 * regenerate-all-masks.mjs
 *
 * Calls the deployed API to regenerate HC masks for all approved athletes.
 * Runs entirely against the live Vercel deployment — no local env vars for
 * Clipdrop or Blob needed; the server has them.
 *
 * Usage:
 *   node scripts/regenerate-all-masks.mjs --url https://your-deployment.vercel.app
 *   node scripts/regenerate-all-masks.mjs --url https://your-deployment.vercel.app --concurrency 3
 */

async function loadEnv() {
  try {
    const { config } = await import('dotenv')
    config()
  } catch { /* dotenv optional */ }
}

function arg(name) {
  const idx = process.argv.indexOf(name)
  return idx !== -1 ? process.argv[idx + 1] : null
}

async function main() {
  await loadEnv()

  const baseUrl = (arg('--url') || process.env.SITE_URL || '').replace(/\/$/, '')
  const adminSecret = arg('--secret') || process.env.ADMIN_SECRET || ''
  const concurrency = parseInt(arg('--concurrency') || '2', 10)

  if (!baseUrl) {
    console.error('Error: --url is required (e.g. --url https://glory-and-game.vercel.app)')
    process.exit(1)
  }
  if (!adminSecret) {
    console.error('Error: --secret or ADMIN_SECRET env var is required')
    process.exit(1)
  }

  const headers = {
    'content-type': 'application/json',
    'x-admin-secret': adminSecret,
  }

  // Fetch all athletes
  console.log(`Fetching athletes from ${baseUrl}/api/admin/athletes...`)
  const listRes = await fetch(`${baseUrl}/api/admin/athletes`, { headers })
  if (!listRes.ok) {
    console.error(`Failed to fetch athletes: ${listRes.status} ${await listRes.text()}`)
    process.exit(1)
  }
  const { athletes } = await listRes.json()

  const eligible = athletes.filter(
    a => a.moderationStatus === 'approved' && a.image && a.image.startsWith('http')
  )
  console.log(`Found ${athletes.length} total, ${eligible.length} approved with image URLs\n`)

  let done = 0, failed = 0
  const total = eligible.length

  // Process in chunks for light parallelism
  for (let i = 0; i < eligible.length; i += concurrency) {
    const chunk = eligible.slice(i, i + concurrency)
    await Promise.all(chunk.map(async (athlete) => {
      const n = i + chunk.indexOf(athlete) + 1
      process.stdout.write(`  [${n}/${total}] ${athlete.slug}... `)
      try {
        const res = await fetch(`${baseUrl}/api/admin/generate-hc-mask`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ slug: athlete.slug, imageUrl: athlete.image }),
        })
        if (!res.ok) {
          const text = await res.text().catch(() => String(res.status))
          throw new Error(`${res.status}: ${text}`)
        }
        const { url } = await res.json()
        console.log(`done → ${url}`)
        done++
      } catch (err) {
        console.log(`FAILED: ${err.message}`)
        failed++
      }
    }))
  }

  console.log(`\nDone — ${done} generated, ${failed} failed`)
}

main().catch(err => { console.error(err); process.exit(1) })
