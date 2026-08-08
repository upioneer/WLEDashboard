import { getDb } from '../db/database.js'
import { listDevices, sendDeviceCommand } from './deviceService.js'
import { listGroups, sendGroupCommand } from './groupService.js'

let pollerTimeout = null
let lastWeather = null

// OpenWeatherMap condition mapping to WLED payload
function mapWeatherToWled(weatherId) {
  // https://openweathermap.org/weather-conditions
  if (weatherId >= 200 && weatherId < 300) {
    // Thunderstorm
    return { seg: [{ fx: 44, sx: 128, ix: 128, col: [[200, 200, 255], [0, 0, 0], [0, 0, 0]], lor: 0 }] }
  } else if (weatherId >= 300 && weatherId < 600) {
    // Drizzle / Rain
    return { seg: [{ fx: 43, sx: 64, ix: 128, col: [[0, 0, 255], [100, 100, 255], [0, 0, 0]], lor: 0 }] }
  } else if (weatherId >= 600 && weatherId < 700) {
    // Snow
    return { seg: [{ fx: 71, sx: 128, ix: 128, col: [[255, 255, 255], [200, 200, 255], [0, 0, 0]], lor: 0 }] }
  } else if (weatherId >= 700 && weatherId < 800) {
    // Atmosphere (Fog, Mist, etc.)
    return { seg: [{ fx: 12, sx: 64, ix: 64, col: [[150, 150, 150], [100, 100, 100], [0, 0, 0]], lor: 0 }] } // 12 is usually fade/breathe
  } else if (weatherId === 800) {
    // Clear
    return { seg: [{ fx: 0, col: [[255, 220, 100], [0, 0, 0], [0, 0, 0]], lor: 0 }] }
  } else if (weatherId > 800) {
    // Clouds
    return { seg: [{ fx: 0, col: [[180, 180, 200], [0, 0, 0], [0, 0, 0]], lor: 0 }] }
  }
  
  // Default fallback
  return { seg: [{ fx: 0, col: [[255, 255, 255], [0, 0, 0], [0, 0, 0]], lor: 0 }] }
}

async function applyWeatherToSyncTargets(wledPayload) {
  const devices = listDevices().filter(d => d.weather_sync_enabled === 1)
  const groups = listGroups().filter(g => g.weather_sync_enabled === 1)

  for (const device of devices) {
    if (device.is_online) {
      sendDeviceCommand(device, wledPayload).catch(() => {})
    }
  }

  for (const group of groups) {
    sendGroupCommand(group.id, wledPayload).catch(() => {})
  }
}

async function pollWeather() {
  const db = getDb()
  const apiKey = db.prepare('SELECT value FROM settings WHERE key = ?').get('openweathermap_api_key')?.value
  const lat = db.prepare('SELECT value FROM settings WHERE key = ?').get('latitude')?.value
  const lon = db.prepare('SELECT value FROM settings WHERE key = ?').get('longitude')?.value

  if (!apiKey || !lat || !lon) {
    console.log('[weather] Missing API key, latitude, or longitude. Skipping poll.')
    return scheduleNext(60000) // check again in 1 min if settings updated
  }

  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}`
    const res = await fetch(url)
    
    if (res.ok) {
      const data = await res.json()
      const weatherId = data.weather[0]?.id
      
      if (weatherId && weatherId !== lastWeather) {
        console.log(`[weather] Condition changed to ${data.weather[0]?.main} (${weatherId}). Syncing lights...`)
        lastWeather = weatherId
        const wledPayload = mapWeatherToWled(weatherId)
        await applyWeatherToSyncTargets(wledPayload)
      }
    } else {
      console.log(`[weather] API error: ${res.status} ${res.statusText}`)
    }
  } catch (err) {
    console.log(`[weather] Fetch error: ${err.message}`)
  }

  // Poll every 15 minutes to stay well within rate limits
  scheduleNext(15 * 60 * 1000)
}

function scheduleNext(ms) {
  if (pollerTimeout) clearTimeout(pollerTimeout)
  pollerTimeout = setTimeout(pollWeather, ms)
}

export function startWeatherPoller() {
  console.log('[weather] Starting weather poller')
  pollWeather()
}

export function stopWeatherPoller() {
  if (pollerTimeout) {
    clearTimeout(pollerTimeout)
    pollerTimeout = null
  }
}
