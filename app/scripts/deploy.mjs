import { spawnSync } from 'node:child_process'

const env = { ...process.env, CLOUDFLARE_ENV: 'production' }
const commands = [
  [process.execPath, ['node_modules/vite/bin/vite.js', 'build']],
  [process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'deploy']],
]

for (const [command, args] of commands) {
  const result = spawnSync(command, args, { env, stdio: 'inherit' })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}
