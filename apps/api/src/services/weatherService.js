import { getDb } from '../db/database.js'
import { listDevices, sendDeviceCommand } from './deviceService.js'
import { listGroups, sendGroupCommand } from './groupService.js'
import { checkWeatherSchedules } from './automationService.js'

let pollerTimeout = null
let currentWeatherState = null
const subscribers = new Set()

export const DEFAULT_WEATHER_MAPPINGS = {
  thunderstorm: {
    name: 'Thunderstorm',
    description: 'Lightning strobe flashes with cool blue ambience',
    fx: 44, // Lightning
    sx: 160,
    ix: 200,
    col: [[220, 220, 255], [0, 0, 0], [255, 255, 255]],
  },
  drizzle: {
    name: 'Drizzle',
    description: 'Gentle water droplets with cyan glow',
    fx: 43, // Rain
    sx: 64,
    ix: 96,
    col: [[0, 160, 255], [60, 210, 255], [0, 0, 0]],
  },
  rain: {
    name: 'Rain',
    description: 'Dynamic rainfall with deep azure ripples',
    fx: 43, // Rain
    sx: 112,
    ix: 160,
    col: [[0, 90, 255], [0, 190, 255], [0, 0, 0]],
  },
  snow: {
    name: 'Snow',
    description: 'Sparkling winter white & glacial highlights',
    fx: 71, // Glint
    sx: 96,
    ix: 140,
    col: [[255, 255, 255], [190, 225, 255], [0, 0, 0]],
  },
  atmosphere: {
    name: 'Atmosphere (Mist / Fog)',
    description: 'Muted slow breathing haze',
    fx: 12, // Breathe
    sx: 48,
    ix: 64,
    col: [[170, 175, 190], [120, 125, 140], [0, 0, 0]],
  },
  clear_day: {
    name: 'Clear Day',
    description: 'Warm golden sunlight glow',
    fx: 0, // Solid
    sx: 128,
    ix: 128,
    col: [[255, 210, 110], [0, 0, 0], [0, 0, 0]],
  },
  clear_night: {
    name: 'Clear Night',
    description: 'Starlit deep indigo & moonlight',
    fx: 0, // Solid
    sx: 128,
    ix: 128,
    col: [[70, 90, 190], [0, 0, 0], [0, 0, 0]],
  },
  clouds: {
    name: 'Cloudy / Overcast',
    description: 'Soft silver-slate diffuse light',
    fx: 0, // Solid
    sx: 128,
    ix: 128,
    col: [[180, 190, 210], [0, 0, 0], [0, 0, 0]],
  },
  extreme: {
    name: 'Extreme Weather Alert',
    description: 'High energy pulsing alert glow',
    fx: 1, // Blink
    sx: 180,
    ix: 180,
    col: [[255, 60, 40], [0, 0, 0], [0, 0, 0]],
  },
}

export function getWeatherMappings() {
  const db = getDb()
  const raw = db.prepare('SELECT value FROM settings WHERE key = ?').get('weather_mappings')?.value
  if (!raw) return DEFAULT_WEATHER_MAPPINGS
  try {
    const custom = JSON.parse(raw)
    return { ...DEFAULT_WEATHER_MAPPINGS, ...custom }
  } catch {
    return DEFAULT_WEATHER_MAPPINGS
  }
}

export function saveWeatherMappings(mappings) {
  const db = getDb()
  const val = JSON.stringify(mappings)
  db.prepare(`
    INSERT INTO settings (key, value) VALUES ('weather_mappings', ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(val)
  return getWeatherMappings()
}

export function getConditionKey(weatherId, isDay = true) {
  if (weatherId >= 200 && weatherId < 300) return 'thunderstorm'
  if (weatherId >= 300 && weatherId < 500) return 'drizzle'
  if (weatherId >= 500 && weatherId < 600) return 'rain'
  if (weatherId >= 600 && weatherId < 700) return 'snow'
  if (weatherId >= 700 && weatherId < 800) return 'atmosphere'
  if (weatherId === 800) return isDay ? 'clear_day' : 'clear_night'
  if (weatherId > 800 && weatherId < 900) return 'clouds'
  if (weatherId >= 900) return 'extreme'
  return isDay ? 'clear_day' : 'clear_night'
}

export function buildWledPayloadFromCondition(conditionKey) {
  const mappings = getWeatherMappings()
  const config = mappings[conditionKey] || DEFAULT_WEATHER_MAPPINGS[conditionKey] || DEFAULT_WEATHER_MAPPINGS.clear_day

  return {
    on: true,
    seg: [
      {
        fx: config.fx ?? 0,
        sx: config.sx ?? 128,
        ix: config.ix ?? 128,
        col: config.col || [[255, 255, 255], [0, 0, 0], [0, 0, 0]],
        lor: 0,
      },
    ],
  }
}

export function subscribeToWeather(callback) {
  subscribers.add(callback)
  return () => subscribers.delete(callback)
}

function notifySubscribers(state) {
  for (const cb of subscribers) {
    try {
      cb(state)
    } catch {}
  }
}

export function getCurrentWeatherState() {
  const db = getDb()
  const apiKey = db.prepare('SELECT value FROM settings WHERE key = ?').get('openweathermap_api_key')?.value
  const lat = db.prepare('SELECT value FROM settings WHERE key = ?').get('latitude')?.value
  const lon = db.prepare('SELECT value FROM settings WHERE key = ?').get('longitude')?.value

  const devices = listDevices().filter(d => d.weather_sync_enabled === 1)
  const groups = listGroups().filter(g => g.weather_sync_enabled === 1)

  return {
    ...currentWeatherState,
    isConfigured: Boolean(apiKey && lat && lon),
    targetCounts: {
      devices: devices.length,
      groups: groups.length,
    },
  }
}

export async function applyWeatherToSyncTargets(wledPayload) {
  const devices = listDevices().filter(d => d.weather_sync_enabled === 1)
  const groups = listGroups().filter(g => g.weather_sync_enabled === 1)

  const promises = []

  for (const device of devices) {
    if (device.is_online) {
      promises.push(sendDeviceCommand(device, wledPayload).catch(() => {}))
    }
  }

  for (const group of groups) {
    promises.push(sendGroupCommand(group.id, wledPayload).catch(() => {}))
  }

  await Promise.all(promises)
}

export async function pollWeather(forceSync = false) {
  const db = getDb()
  const apiKey = db.prepare('SELECT value FROM settings WHERE key = ?').get('openweathermap_api_key')?.value
  const lat = db.prepare('SELECT value FROM settings WHERE key = ?').get('latitude')?.value
  const lon = db.prepare('SELECT value FROM settings WHERE key = ?').get('longitude')?.value

  if (!apiKey || !lat || !lon) {
    currentWeatherState = {
      status: 'unconfigured',
      error: 'Missing OpenWeatherMap API key, latitude, or longitude.',
      updated_at: new Date().toISOString(),
    }
    notifySubscribers(getCurrentWeatherState())
    return scheduleNext(60000)
  }

  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}`
    const res = await fetch(url)

    if (res.ok) {
      const data = await res.json()
      const weatherId = data.weather[0]?.id
      const nowSec = Math.floor(Date.now() / 1000)
      const isDay = data.sys?.sunrise && data.sys?.sunset
        ? (nowSec >= data.sys.sunrise && nowSec < data.sys.sunset)
        : true

      const conditionKey = getConditionKey(weatherId, isDay)
      const prevCondition = currentWeatherState?.condition_key

      currentWeatherState = {
        status: 'active',
        weather_id: weatherId,
        condition_key: conditionKey,
        condition_name: data.weather[0]?.main || 'Clear',
        description: data.weather[0]?.description || '',
        icon: data.weather[0]?.icon || '01d',
        temp_k: data.main?.temp,
        temp_c: Math.round(data.main?.temp - 273.15),
        temp_f: Math.round((data.main?.temp - 273.15) * 9 / 5 + 32),
        humidity: data.main?.humidity,
        wind_speed: data.wind?.speed,
        city: data.name,
        country: data.sys?.country,
        is_day: isDay,
        last_sync_at: new Date().toISOString(),
        error: null,
      }

      notifySubscribers(getCurrentWeatherState())

      // If condition changed or manually forced, sync lights & check automations
      if (forceSync || conditionKey !== prevCondition) {
        console.log(`[weather] Applying condition ${conditionKey} (${weatherId}) to WLED targets`)
        const wledPayload = buildWledPayloadFromCondition(conditionKey)
        await applyWeatherToSyncTargets(wledPayload)
        
        // Trigger matching schedules/routines
        checkWeatherSchedules(conditionKey).catch(() => {})
      }
    } else {
      const errText = `${res.status} ${res.statusText}`
      console.log(`[weather] API error: ${errText}`)
      currentWeatherState = {
        ...(currentWeatherState || {}),
        status: 'error',
        error: `OpenWeatherMap Error: ${errText}`,
        updated_at: new Date().toISOString(),
      }
      notifySubscribers(getCurrentWeatherState())
    }
  } catch (err) {
    console.log(`[weather] Fetch error: ${err.message}`)
    currentWeatherState = {
      ...(currentWeatherState || {}),
      status: 'error',
      error: err.message,
      updated_at: new Date().toISOString(),
    }
    notifySubscribers(getCurrentWeatherState())
  }

  // Poll every 15 minutes
  scheduleNext(15 * 60 * 1000)
}

export async function testWeatherCondition(conditionKey) {
  const wledPayload = buildWledPayloadFromCondition(conditionKey)
  await applyWeatherToSyncTargets(wledPayload)
  return { success: true, condition: conditionKey, payload: wledPayload }
}

function scheduleNext(ms) {
  if (pollerTimeout) clearTimeout(pollerTimeout)
  pollerTimeout = setTimeout(() => pollWeather(), ms)
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
