import { useState, useEffect } from 'react'
import { isNewerVersion, pickLatestTag } from '../lib/updates.js'

const REPO = 'upioneer/WLEDashboard'

export function useUpdateCheck(currentVersion) {
  const [updateAvailable, setUpdateAvailable] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkUpdate() {
      try {
        // Published Releases first; fall back to git tags since the
        // project ships version tags without Release entries.
        let latestVersion = null
        const rel = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`)
        if (rel.ok) {
          const data = await rel.json()
          latestVersion = data.tag_name?.replace(/^v/i, '') ?? null
        } else {
          const tagsRes = await fetch(`https://api.github.com/repos/${REPO}/tags?per_page=20`)
          if (!tagsRes.ok) throw new Error('Failed to fetch tags')
          latestVersion = pickLatestTag(await tagsRes.json())
        }

        if (isNewerVersion(currentVersion, latestVersion)) {
          setUpdateAvailable(latestVersion)
        }
      } catch (err) {
        console.warn('Could not check for updates:', err)
      } finally {
        setLoading(false)
      }
    }

    // Check on mount
    checkUpdate()

    // Then check every 12 hours
    const interval = setInterval(checkUpdate, 12 * 60 * 60 * 1000)
    return () => clearInterval(interval)
  }, [currentVersion])

  return { updateAvailable, loading }
}
