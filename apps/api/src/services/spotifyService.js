import { getDb } from '../db/database.js'
import { Vibrant } from 'node-vibrant/node'
import { listDevices, sendDeviceCommand } from './deviceService.js'
import { listGroups, sendGroupCommand } from './groupService.js'

let currentTrackId = null
let pollerTimeout = null
let backoffMs = 0
let accessToken = null
let tokenExpiresAt = 0
let lastExtractedColors = []
let currentTrackState = { is_playing: false }

const subscribers = new Set()

export function subscribeToSpotify(fn) {
  subscribers.add(fn)
  return () => subscribers.delete(fn)
}

function notifySpotify(state) {
  currentTrackState = { ...currentTrackState, ...state }
  for (const fn of subscribers) {
    try { fn(currentTrackState) } catch {}
  }
}

export function getCurrentSpotifyState() {
  return currentTrackState
}

function getSetting(key) {
  const db = getDb()
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key)
  return row ? row.value : null
}

function setSetting(key, value) {
  const db = getDb()
  db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?')
    .run(key, value, value)
}

function deleteSetting(key) {
  const db = getDb()
  db.prepare('DELETE FROM settings WHERE key = ?').run(key)
}

export function getSpotifyAuthUrl(origin) {
  const clientId = process.env.SPOTIFY_CLIENT_ID || getSetting('spotify_client_id')
  if (!clientId) return null

  const redirectUri = origin + '/api/spotify/callback'
  const scopes = 'user-read-currently-playing'
  
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: scopes
  })

  return `https://accounts.spotify.com/authorize?${params.toString()}`
}

export async function handleSpotifyCallback(code, origin) {
  const clientId = process.env.SPOTIFY_CLIENT_ID || getSetting('spotify_client_id')
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET || getSetting('spotify_client_secret')
  const redirectUri = origin + '/api/spotify/callback'

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64')
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirectUri
    })
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error('Failed to fetch Spotify token: ' + err)
  }

  const data = await res.json()
  setSetting('spotify_refresh_token', data.refresh_token)
  
  accessToken = data.access_token
  tokenExpiresAt = Date.now() + (data.expires_in * 1000)

  // Start poller immediately if it wasn't running
  startSpotifyPoller()
}

export function disconnectSpotify() {
  deleteSetting('spotify_refresh_token')
  accessToken = null
  tokenExpiresAt = 0
  if (pollerTimeout) {
    clearTimeout(pollerTimeout)
    pollerTimeout = null
  }
}

export function getSpotifyStatus() {
  return {
    connected: !!getSetting('spotify_refresh_token')
  }
}

async function refreshAccessToken() {
  const refreshToken = getSetting('spotify_refresh_token')
  if (!refreshToken) throw new Error('No refresh token')

  const clientId = process.env.SPOTIFY_CLIENT_ID || getSetting('spotify_client_id')
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET || getSetting('spotify_client_secret')

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64')
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    })
  })

  if (!res.ok) {
    throw new Error('Failed to refresh token')
  }

  const data = await res.json()
  accessToken = data.access_token
  tokenExpiresAt = Date.now() + (data.expires_in * 1000)
}

function getEnabledTargets() {
  const devices = listDevices().filter(d => d.spotify_sync_enabled === 1)
  const groups = listGroups().filter(g => g.spotify_sync_enabled === 1)
  return { devices, groups }
}

async function processAlbumArt(imageUrl) {
  try {
    const res = await fetch(imageUrl)
    const arrayBuffer = await res.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    const palette = await Vibrant.from(buffer).getPalette()
    
    // Extract vibrant, light vibrant, and dark vibrant colors
    const colors = []
    if (palette.Vibrant) colors.push(palette.Vibrant.rgb.map(Math.round))
    if (palette.LightVibrant) colors.push(palette.LightVibrant.rgb.map(Math.round))
    if (palette.DarkVibrant) colors.push(palette.DarkVibrant.rgb.map(Math.round))
    if (palette.Muted && colors.length < 3) colors.push(palette.Muted.rgb.map(Math.round))

    // Pad if less than 3 colors found
    while (colors.length < 3 && colors.length > 0) {
      colors.push(colors[0])
    }

    if (colors.length === 3) {
      lastExtractedColors = colors
      const payload = { seg: [{ col: colors }] }
      
      const { devices, groups } = getEnabledTargets()
      
      for (const device of devices) {
        sendDeviceCommand(device, payload)
      }
      
      for (const group of groups) {
        sendGroupCommand(group.id, payload)
      }
    }
  } catch (err) {
    console.error('[spotify] Failed to process album art:', err)
  }
}

export async function startSpotifyPoller() {
  if (pollerTimeout) clearTimeout(pollerTimeout)

  const { devices, groups } = getEnabledTargets()
  const refreshToken = getSetting('spotify_refresh_token')
  
  if (!refreshToken || (devices.length === 0 && groups.length === 0)) {
    if (currentTrackState.is_playing) notifySpotify({ is_playing: false })
    pollerTimeout = setTimeout(startSpotifyPoller, 10000)
    return
  }

  try {
    if (!accessToken || Date.now() >= tokenExpiresAt - 60000) {
      await refreshAccessToken()
    }

    const res = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: { 'Authorization': 'Bearer ' + accessToken }
    })

    if (res.status === 429) {
      const retryAfter = parseInt(res.headers.get('Retry-After') || '5', 10)
      console.warn(`[spotify] Rate limited. Backing off for ${retryAfter} seconds.`)
      pollerTimeout = setTimeout(startSpotifyPoller, retryAfter * 1000)
      return
    }

    if (res.status === 204 || res.status > 400) {
      if (currentTrackState.is_playing) notifySpotify({ is_playing: false })
      pollerTimeout = setTimeout(startSpotifyPoller, 10000)
      return
    }

    const data = await res.json()
    
    if (data && data.item) {
      const isNewTrack = data.item.id !== currentTrackId
      currentTrackId = data.item.id
      const images = data.item.album?.images || []
      const imageUrl = images.length > 1 ? images[1].url : (images[0]?.url || null)
      const highResImageUrl = images.length > 0 ? images[0].url : null

      if (isNewTrack && imageUrl) {
        await processAlbumArt(imageUrl)
      }

      notifySpotify({
        is_playing: data.is_playing,
        track_name: data.item.name,
        artist_name: data.item.artists?.[0]?.name,
        album_art: highResImageUrl || imageUrl,
        colors: lastExtractedColors
      })
    } else {
      notifySpotify({ is_playing: !!(data && data.is_playing) })
    }

    const nextPollMs = (data && data.is_playing) ? 5000 : 15000
    pollerTimeout = setTimeout(startSpotifyPoller, nextPollMs)
    
  } catch (err) {
    console.error('[spotify] Poller error:', err.message)
    pollerTimeout = setTimeout(startSpotifyPoller, 10000)
  }
}
