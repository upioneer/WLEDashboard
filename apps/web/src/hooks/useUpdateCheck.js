import { useState, useEffect } from 'react'

export function useUpdateCheck(currentVersion) {
  const [updateAvailable, setUpdateAvailable] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkUpdate() {
      try {
        const res = await fetch('https://api.github.com/repos/upioneer/WLEDashboard/releases/latest')
        if (!res.ok) throw new Error('Failed to fetch release')
        const data = await res.json()
        const latestVersion = data.tag_name?.replace(/^v/, '') // remove 'v' if present
        
        // Simple semver compare (assuming format x.y.z)
        const currentParts = currentVersion.split('.').map(Number)
        const latestParts = latestVersion.split('.').map(Number)

        let hasUpdate = false
        for (let i = 0; i < 3; i++) {
          const cur = currentParts[i] || 0
          const lat = latestParts[i] || 0
          if (lat > cur) {
            hasUpdate = true
            break
          } else if (lat < cur) {
            break
          }
        }

        if (hasUpdate) {
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
