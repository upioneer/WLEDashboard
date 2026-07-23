import Bonjour from 'bonjour-service'
import { getDb } from '../db/database.js'
import { createDevice, listDevices, startPolling } from './deviceService.js'

let bonjourInstance = null

export function startDiscovery() {
  const db = getDb()
  const intervalMs = parseInt(
    db.prepare('SELECT value FROM settings WHERE key = ?').get('mdns_scan_interval_ms')?.value ?? '30000',
    10
  )

  bonjourInstance = new Bonjour()

  const browser = bonjourInstance.find({ type: 'wled' })

  browser.on('up', (service) => {
    const ip = service.addresses?.find(a => /^\d+\.\d+\.\d+\.\d+$/.test(a)) ?? service.host
    if (!ip) return

    const existing = listDevices().find(d => d.ip_address === ip)
    if (existing) {
      console.log(`[mdns] Already registered: ${service.name} @ ${ip}`)
      return
    }

    console.log(`[mdns] Discovered new WLED device: ${service.name} @ ${ip}`)
    createDevice({
      name: service.name ?? `WLED @ ${ip}`,
      ip_address: ip,
      mac_address: service.txt?.mac ?? null,
      firmware_ver: service.txt?.ver ?? null,
      led_count: service.txt?.leds ? parseInt(service.txt.leds, 10) : null,
    })
  })

  browser.on('down', (service) => {
    const ip = service.addresses?.find(a => /^\d+\.\d+\.\d+\.\d+$/.test(a)) ?? service.host
    console.log(`[mdns] Device went down: ${service.name} @ ${ip}`)
  })

  console.log(`[mdns] Discovery started (scan interval: ${intervalMs}ms)`)
  return browser
}

export function stopDiscovery() {
  if (bonjourInstance) {
    bonjourInstance.destroy()
    bonjourInstance = null
  }
}
