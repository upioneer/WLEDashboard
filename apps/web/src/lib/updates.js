/**
 * Update check helpers. The app ships git tags without published GitHub
 * Releases, so the check reads tags and compares semantic versions.
 */

export function parseVersion(value) {
  if (typeof value !== 'string') return [0, 0, 0]
  const parts = value.trim().replace(/^v/i, '').split('.')
  return [0, 1, 2].map((i) => {
    const n = Number.parseInt(parts[i], 10)
    return Number.isFinite(n) && n >= 0 ? n : 0
  })
}

function compareVersions(a, b) {
  const [a0, a1, a2] = parseVersion(a)
  const [b0, b1, b2] = parseVersion(b)
  if (a0 !== b0) return a0 - b0
  if (a1 !== b1) return a1 - b1
  return a2 - b2
}

export function isNewerVersion(current, latest) {
  if (!latest) return false
  return compareVersions(latest, current) > 0
}

/**
 * Pick the highest semantic version from a GitHub tags listing
 * ([{ name: 'v0.29.1' }, ...]). Returns the bare version ('0.29.1')
 * or null when nothing parses.
 */
export function pickLatestTag(tags) {
  if (!Array.isArray(tags)) return null
  let best = null
  for (const tag of tags) {
    const name = typeof tag === 'string' ? tag : tag?.name
    if (typeof name !== 'string') continue
    const bare = name.trim().replace(/^v/i, '')
    if (!/^\d+\.\d+\.\d+$/.test(bare)) continue
    if (best === null || compareVersions(bare, best) > 0) best = bare
  }
  return best
}
