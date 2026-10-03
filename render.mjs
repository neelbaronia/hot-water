// Renders index.html frame by frame and encodes out/hot-water.mp4.
// Usage: node render.mjs            (full render)
//        node render.mjs 3 10 20    (stills at those seconds, no encode)
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const OUT_DIR = path.join(ROOT, 'out')
const WORKERS = Number(process.env.WORKERS || 6)
const STYLE = process.env.STYLE || '' // e.g. STYLE=comic
const SUFFIX = STYLE ? `-${STYLE}` : ''
import { chromium } from 'playwright-core'

const stills = process.argv.slice(2).map(Number)
await mkdir(OUT_DIR, { recursive: true })

const browser = await chromium.launch({ channel: 'chrome' })
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 })
const url = pathToFileURL(path.join(ROOT, 'index.html')).href + `?capture&style=${STYLE}`

async function openPage() {
  const page = await context.newPage()
  await page.goto(url)
  await page.evaluate(() => window.ready)
  return page
}

if (stills.length) {
  const page = await openPage()
  for (const t of stills) {
    await page.evaluate((time) => window.render(time), t)
    await page.screenshot({ path: path.join(OUT_DIR, `still${SUFFIX}-${String(t).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 85 })
  }
  await browser.close()
  process.exit(0)
}

const first = await openPage()
const { DURATION, FPS } = await first.evaluate(() => ({ DURATION: window.DURATION, FPS: window.FPS }))
const total = Math.round(DURATION * FPS)
const pages = [first, ...(await Promise.all(Array.from({ length: WORKERS - 1 }, openPage)))]

// frames are piped straight into ffmpeg, in order, so nothing is written to disk but the mp4
const output = path.join(OUT_DIR, `hot-water${SUFFIX}.mp4`)
const ffmpeg = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', String(FPS), '-i', '-',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', output],
  { stdio: ['pipe', 'inherit', 'inherit'] })
const pending = new Map()
let next = 0
async function flush() {
  while (pending.has(next)) {
    const buffer = pending.get(next)
    pending.delete(next++)
    if (!ffmpeg.stdin.write(buffer)) await once(ffmpeg.stdin, 'drain')
  }
}
let writing = Promise.resolve()

await Promise.all(pages.map(async (page, worker) => {
  for (let frame = worker; frame < total; frame += WORKERS) {
    await page.evaluate((time) => window.render(time), frame / FPS)
    pending.set(frame, await page.screenshot({ type: 'jpeg', quality: 94 }))
    writing = writing.then(flush)
    await writing
  }
}))
await browser.close()
ffmpeg.stdin.end()
const [code] = await once(ffmpeg, 'close')
if (code !== 0) throw new Error(`ffmpeg exited with ${code}`)
console.log(`${total} frames -> ${output}`)
