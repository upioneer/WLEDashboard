import mqtt from 'mqtt'
import { getDb } from '../db/database.js'
import { listDevices, getDevice, sendDeviceCommand, subscribe as subscribeDeviceState } from './deviceService.js'

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

    client.on('error', () => {
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

  for (const dev of devices) {
    const topic = `${DISCOVERY_PREFIX}/light/wledashboard_${dev.id}/config`
    const payload = {
      name: `WLED ${dev.name}`,
      unique_id: `wledashboard_${dev.id}`,
      command_topic: `${DISCOVERY_PREFIX}/light/wledashboard_${dev.id}/set`,
      state_topic: `${DISCOVERY_PREFIX}/light/wledashboard_${dev.id}/state`,
      schema: 'json',
      brightness: true,
      rgb: true,
      effect: true,
      device: {
        identifiers: [`wledashboard_${dev.id}`],
        name: dev.name,
        model: 'WLED Controller',
        manufacturer: 'WLED',
        sw_version: dev.firmware_ver || '0.14.0',
      },
    }
    client.publish(topic, JSON.stringify(payload), { retain: true })
  }
  console.log(`[mqtt] Published HA discovery for ${devices.length} devices`)
}

function subscribeCommandTopics() {
  if (!client || !isConnected) return
  client.subscribe(`${DISCOVERY_PREFIX}/light/wledashboard_+/set`)
}

function handleIncomingMqttMessage(topic, messageStr) {
  const match = topic.match(/wledashboard_([^/]+)\/set$/)
  if (!match) return
  const deviceId = match[1]
  const dev = getDevice(deviceId)
  if (!dev) return

  try {
    const payload = JSON.parse(messageStr)
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

    sendDeviceCommand(dev, cmd)
  } catch (err) {
    console.error(`[mqtt] Invalid payload received for ${deviceId}:`, err.message)
  }
}

export function publishDeviceState(deviceId, state) {
  if (!client || !isConnected) return
  const topic = `${DISCOVERY_PREFIX}/light/wledashboard_${deviceId}/state`
  const haState = {
    state: state.on ? 'ON' : 'OFF',
    brightness: state.bri ?? 128,
  }
  client.publish(topic, JSON.stringify(haState))
}
