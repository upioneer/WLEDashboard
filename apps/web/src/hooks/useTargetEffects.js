import { useEffect, useState } from 'react'
import { devicesApi } from '../lib/api.js'
import { toLiveEntries } from '../lib/effects.js'

// Effect picker source for a Studio target. Device targets resolve the live
// effect list from the controller (indices differ per firmware); groups and
// unreachable devices fall back to the static catalog, with the backend
// resolving attached names per member at send time.
export function useTargetEffects(kind, targetId, staticEffects) {
  const [live, setLive] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (kind !== 'device' || !targetId) {
      setLive(null)
      return
    }
    let cancelled = false
    setLoading(true)
    devicesApi
      .effects(targetId)
      .then((r) => {
        if (!cancelled) setLive(toLiveEntries(r?.effects, staticEffects))
      })
      .catch(() => {
        if (!cancelled) setLive(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [kind, targetId, staticEffects])

  return { entries: live ?? staticEffects, live: live !== null, loading }
}
