import mqtt from 'mqtt'
import { getDb } from '../db/database.js'
import { listDevices, getDevice, sendDeviceCommand, subscribe as subscribeDeviceState } from './deviceService.js'
import { listGroups, getGroup, sendGroupCommand } from './groupService.js'
import { listRooms, sendRoomCommand } from './spatialService.js'
import { listRoutines, executeRoutineNow } from './automationService.js'

let client = null
let isConnected = false
const DISCOVERY_PREFIX = 'homeassistant'

export function getMqttStatus() {
  const db = getDb()
  const brokerUrl = db.prepare("SELECT value FROM settings WHERE key = 'mqtt_broker_url'").get()?.value || 'mqtt://localhost:1883'
  const enabled = db.prepare("SELECT value FROM settings WHERE key = 'mqtt_enabled'").get()?.value === '1'
  return {
    enabled,
    connected: isConnected,
    broker_url: brokerUrl,
  }
}

export function initMqttService() {
  const db = getDb()
  const enabled = db.prepare("SELECT value FROM settings WHERE key = 'mqtt_enabled'").get()?.value === '1'
  const brokerUrl = db.prepare("SELECT value FROM settings WHERE key = 'mqtt_broker_url'").get()?.value || 'mqtt://localhost:1883'

  if (!enabled) {
    if (client) {
      try { client.end() } catch {}
      client = null
    }
    isConnected = false
    return
  }

  try {
    client = mqtt.connect(brokerUrl, {
      reconnectPeriod: 5000,
      connectTimeout: 5000,
    })

    client.on('connect', () => {
      isConnected = true
      console.log(`[mqtt] Connected to MQTT broker at ${brokerUrl}`)
      publishHaDiscovery()
      subscribeCommandTopics()
    })

    client.on('error', (err) => {
      console.error('[mqtt] Error:', err.message)
      isConnected = false
    })

    client.on('offline', () => {
      isConnected = false
    })

    client.on('message', (topic, message) => {
      handleIncomingMqttMessage(topic, message.toString())
    })
  } catch (err) {
    console.error('[mqtt] Failed to initialize MQTT client:', err.message)
  }

  // Subscribe to internal device state changes to push MQTT state to HA
  subscribeDeviceState((deviceId, state) => {
    if (client && isConnected) {
      publishDeviceState(deviceId, state)
    }
  })
}

export function publishHaDiscovery() {
  if (!client || !isConnected) return

  const devices = listDevices()
  const groups = listGroups()
  const rooms = listRooms()
  const routines = listRoutines()

  // 1. Devices (Lights)
  for (const dev of devices) {
    const topic = `${DISCOVERY_PREFIX}/light/wledashboard_dev_${dev.id}/config`
    const payload = {
      name: `${dev.name}`,
      unique_id: `wledashboard_dev_${dev.id}`,
      command_topic: `${DISCOVERY_PREFIX}/light/wledashboard_dev_${dev.id}/set`,
      state_topic: `${DISCOVERY_PREFIX}/light/wledashboard_dev_${dev.id}/state`,
      schema: 'json',
      brightness: true,
      rgb: true,
      effect: true,
      device: {
        identifiers: [`wledashboard_dev_${dev.id}`],
        name: dev.name,
        model: 'WLED Controller',
        manufacturer: 'WLED',
        sw_version: dev.firmware_ver || '0.14.0',
        suggested_area: 'WLED Dashboard',
      },
    }
    client.publish(topic, JSON.stringify(payload), { retain: true })
  }

  // 2. Lighting Groups (Lights)
  for (const grp of groups) {
    const topic = `${DISCOVERY_PREFIX}/light/wledashboard_grp_${grp.id}/config`
    const payload = {
      name: `Group: ${grp.name}`,
      unique_id: `wledashboard_grp_${grp.id}`,
      command_topic: `${DISCOVERY_PREFIX}/light/wledashboard_grp_${grp.id}/set`,
      state_topic: `${DISCOVERY_PREFIX}/light/wledashboard_grp_${grp.id}/state`,
      schema: 'json',
      brightness: true,
      rgb: true,
      effect: true,
      device: {
        identifiers: [`wledashboard_grp_${grp.id}`],
        name: `Group: ${grp.name}`,
        model: `Lighting Group (${grp.type})`,
        manufacturer: 'WLEDashboard',
        suggested_area: grp.name,
      },
    }
    client.publish(topic, JSON.stringify(payload), { retain: true })
  }

  // 3. 3D Spatial Rooms (Lights)
  for (const room of rooms) {
    const topic = `${DISCOVERY_PREFIX}/light/wledashboard_room_${room.id}/config`
    const payload = {
      name: `Room: ${room.name}`,
      unique_id: `wledashboard_room_${room.id}`,
      command_topic: `${DISCOVERY_PREFIX}/light/wledashboard_room_${room.id}/set`,
      state_topic: `${DISCOVERY_PREFIX}/light/wledashboard_room_${room.id}/state`,
      schema: 'json',
      brightness: true,
      rgb: true,
      effect: true,
      device: {
        identifiers: [`wledashboard_room_${room.id}`],
        name: `3D Room: ${room.name}`,
        model: 'Spatial 3D Room Anchor Coordinator',
        manufacturer: 'WLEDashboard',
        suggested_area: room.name,
      },
    }
    client.publish(topic, JSON.stringify(payload), { retain: true })
  }

  // 4. Automation Routines (Buttons)
  for (const rt of routines) {
    const topic = `${DISCOVERY_PREFIX}/button/wledashboard_routine_${rt.id}/config`
    const payload = {
      name: `Routine: ${rt.name}`,
      unique_id: `wledashboard_routine_${rt.id}`,
      command_topic: `${DISCOVERY_PREFIX}/button/wledashboard_routine_${rt.id}/press`,
      device: {
        identifiers: [`wledashboard_routines`],
        name: 'WLEDashboard Routines',
        model: 'Animation Timeline Engine',
        manufacturer: 'WLEDashboard',
      },
    }
    client.publish(topic, JSON.stringify(payload), { retain: true })
  }

  // 5. Weather Sync Trigger Button
  const weatherSyncTopic = `${DISCOVERY_PREFIX}/button/wledashboard_weather_sync_now/config`
  const weatherSyncPayload = {
    name: 'Sync Weather Lighting Now',
    unique_id: 'wledashboard_weather_sync_now',
    command_topic: `${DISCOVERY_PREFIX}/button/wledashboard_weather_sync_now/press`,
    device: {
      identifiers: ['wledashboard_weather'],
      name: 'WLEDashboard Weather Engine',
      model: 'Dynamic Weather Sync',
      manufacturer: 'WLEDashboard',
    },
  }
  client.publish(weatherSyncTopic, JSON.stringify(weatherSyncPayload), { retain: true })

  console.log(`[mqtt] Published HA discovery for ${devices.length} devices, ${groups.length} groups, ${rooms.length} rooms, and ${routines.length} routines`)
}

function subscribeCommandTopics() {
  if (!client || !isConnected) return
  client.subscribe(`${DISCOVERY_PREFIX}/light/wledashboard_+/set`)
  client.subscribe(`${DISCOVERY_PREFIX}/button/wledashboard_+/press`)
}

function parseWledCommand(payload) {
  const cmd = {}
  if (typeof payload.state === 'string') {
    cmd.on = payload.state.toUpperCase() === 'ON'
  }
  if (typeof payload.brightness === 'number') {
    cmd.bri = Math.round(payload.brightness)
  }
  if (payload.color && typeof payload.color.r === 'number') {
    cmd.seg = [{ col: [[payload.color.r, payload.color.g, payload.color.b]] }]
  }
  if (typeof payload.effect === 'number' || typeof payload.effect === 'string') {
    const fx = typeof payload.effect === 'number' ? payload.effect : parseInt(payload.effect, 10)
    if (!isNaN(fx)) {
      cmd.seg = cmd.seg || [{}]
      cmd.seg[0].fx = fx
    }
  }
  return cmd
}

async function handleIncomingMqttMessage(topic, messageStr) {
  try {
    // 1. Device command: homeassistant/light/wledashboard_dev_<id>/set
    const devMatch = topic.match(/light\/wledashboard_dev_([^/]+)\/set$/)
    if (devMatch) {
      const dev = getDevice(devMatch[1])
      if (dev) {
        const cmd = parseWledCommand(JSON.parse(messageStr))
        await sendDeviceCommand(dev, cmd)
      }
      return
    }

    // Legacy fallback: homeassistant/light/wledashboard_<id>/set
    const legacyDevMatch = topic.match(/light\/wledashboard_([^/]+)\/set$/)
    if (legacyDevMatch && !legacyDevMatch[1].startsWith('grp_') && !legacyDevMatch[1].startsWith('room_')) {
      const dev = getDevice(legacyDevMatch[1])
      if (dev) {
        const cmd = parseWledCommand(JSON.parse(messageStr))
        await sendDeviceCommand(dev, cmd)
      }
      return
    }

    // 2. Group command: homeassistant/light/wledashboard_grp_<id>/set
    const grpMatch = topic.match(/light\/wledashboard_grp_([^/]+)\/set$/)
    if (grpMatch) {
      const grp = getGroup(grpMatch[1])
      if (grp) {
        const cmd = parseWledCommand(JSON.parse(messageStr))
        await sendGroupCommand(grp.id, cmd)
        // Publish optimistic group state back to HA
        publishGroupState(grp.id, cmd)
      }
      return
    }

    // 3. Room command: homeassistant/light/wledashboard_room_<id>/set
    const roomMatch = topic.match(/light\/wledashboard_room_([^/]+)\/set$/)
    if (roomMatch) {
      const roomId = roomMatch[1]
      const cmd = parseWledCommand(JSON.parse(messageStr))
      await sendRoomCommand(roomId, cmd)
      publishRoomState(roomId, cmd)
      return
    }

    // 4. Routine Trigger: homeassistant/button/wledashboard_routine_<id>/press
    const routineMatch = topic.match(/button\/wledashboard_routine_([^/]+)\/press$/)
    if (routineMatch) {
      const routineId = routineMatch[1]
      console.log(`[mqtt] Home Assistant triggered routine: ${routineId}`)
      await executeRoutineNow(routineId)
      return
    }

    // 5. Weather Sync Now: homeassistant/button/wledashboard_weather_sync_now/press
    if (topic.includes('button/wledashboard_weather_sync_now/press')) {
      const { pollWeather } = await import('./weatherService.js')
      await pollWeather(true)
      console.log('[mqtt] Home Assistant triggered instant Weather Sync')
      return
    }
  } catch (err) {
    console.error(`[mqtt] Failed to handle incoming message on ${topic}:`, err.message)
  }
}

export function publishDeviceState(deviceId, state) {
  if (!client || !isConnected) return
  const topic = `${DISCOVERY_PREFIX}/light/wledashboard_dev_${deviceId}/state`
  const haState = {
    state: state.on ? 'ON' : 'OFF',
    brightness: state.bri ?? 128,
  }
  client.publish(topic, JSON.stringify(haState))

  // Also publish to legacy topic for backward compatibility
  client.publish(`${DISCOVERY_PREFIX}/light/wledashboard_${deviceId}/state`, JSON.stringify(haState))
}

export function publishGroupState(groupId, cmd) {
  if (!client || !isConnected) return
  const topic = `${DISCOVERY_PREFIX}/light/wledashboard_grp_${groupId}/state`
  const haState = {
    state: cmd.on !== undefined ? (cmd.on ? 'ON' : 'OFF') : 'ON',
    brightness: cmd.bri ?? 255,
  }
  client.publish(topic, JSON.stringify(haState))
}

export function publishRoomState(roomId, cmd) {
  if (!client || !isConnected) return
  const topic = `${DISCOVERY_PREFIX}/light/wledashboard_room_${roomId}/state`
  const haState = {
    state: cmd.on !== undefined ? (cmd.on ? 'ON' : 'OFF') : 'ON',
    brightness: cmd.bri ?? 255,
  }
  client.publish(topic, JSON.stringify(haState))
}
