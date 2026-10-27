import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const output = path.join(root, 'deploy/generated')
const files = new Map([
  ['Caddyfile', 'Caddyfile'],
  ['nginx.conf', 'nginx.conf'],
  ['cloudflared-config.example.yml', 'cloudflared-config.yml'],
])

const domainPattern = /^(?=.{1,253}$)[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/
for (const key of ['FQUIZ_WEB_DOMAIN', 'FQUIZ_WWW_DOMAIN', 'FQUIZ_ADMIN_DOMAIN']) {
  if (!domainPattern.test(process.env[key] || '')) throw new Error(`Invalid required domain: ${key}`)
}
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(process.env.FQUIZ_ACME_EMAIL || '')) throw new Error('Invalid required email: FQUIZ_ACME_EMAIL')
if (!/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(process.env.CLOUDFLARE_TUNNEL_ID || '')) throw new Error('Invalid required UUID: CLOUDFLARE_TUNNEL_ID')

await mkdir(output, { recursive: true })
for (const [source, destination] of files) {
  const template = await readFile(path.join(root, 'deploy', source), 'utf8')
  const rendered = template.replace(/\$\{([A-Z0-9_]+)\}/g, (_, key) => {
    if (!process.env[key]) throw new Error(`Missing required environment variable: ${key}`)
    return process.env[key]
  })
  await writeFile(path.join(output, destination), rendered, { mode: 0o600 })
}
