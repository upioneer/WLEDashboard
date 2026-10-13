import { z } from 'zod'
import {
  listDevices,
  getDevice,
  createDevice,
  updateDevice,
  deleteDevice,
  reorderDevices,
  sendDeviceCommand,
  refreshDeviceState,
  getCachedState,
  getAllCachedStates,
} from '../services/deviceService.js'
import { logEvent } from '../services/loggerService.js'
import { isDemoMode, simulateDemoFirmwareUpdate } from '../services/demoData.js'

// ─── Validation Schemas ───────────────────────────────────────────────────────

const CreateDeviceSchema = z.object({
  name: z.string().min(1).max(64).trim(),
  ip_address: z.string().ip({ version: 'v4' }),
  mac_address: z.string().optional(),
  firmware_ver: z.string().optional(),
  led_count: z.number().int().positive().optional(),
  spotify_sync_enabled: z.union([z.number().int().min(0).max(1), z.boolean().transform(v => v ? 1 : 0)]).optional().default(0),
  weather_sync_enabled: z.union([z.number().int().min(0).max(1), z.boolean().transform(v => v ? 1 : 0)]).optional().default(0),
})

const UpdateDeviceSchema = z.object({
  name: z.string().min(1).max(64).trim().optional(),
  ip_address: z.string().ip({ version: 'v4' }).optional(),
  sort_order: z.number().int().min(0).optional(),
  led_density: z.number().positive().optional(),
  led_count: z.number().int().positive().optional(),
  firmware_ver: z.string().optional(),
  spotify_sync_enabled: z.union([z.number().int().min(0).max(1), z.boolean().transform(v => v ? 1 : 0)]).optional(),
  weather_sync_enabled: z.union([z.number().int().min(0).max(1), z.boolean().transform(v => v ? 1 : 0)]).optional(),
})

const ReorderSchema = z.object({
  ids: z.array(z.string()),
})

const CommandSchema = z.record(z.unknown())

// ─── Route Registration ───────────────────────────────────────────────────────

export async function deviceRoutes(fastify) {
  // GET /api/devices - list all devices with cached state
  fastify.get('/devices', async (req, reply) => {
    const devices = listDevices()
    const states = getAllCachedStates()
    return devices.map(d => ({ ...d, liveState: states[d.id] ?? null }))
  })

  // GET /api/devices/:id - single device with cached state
  fastify.get('/devices/:id', async (req, reply) => {
    const device = getDevice(req.params.id)
    if (!device) return reply.code(404).send({ error: 'Device not found' })
    return { ...device, liveState: getCachedState(req.params.id) }
  })

  // POST /api/devices - register a device manually
  fastify.post('/devices', async (req, reply) => {
    const parsed = CreateDeviceSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() })
    const device = createDevice(parsed.data)
    logEvent('info', 'device', `Device registered: "${device.name}" (${device.ip_address})`)
    return reply.code(201).send(device)
  })

  // PATCH /api/devices/:id - update device metadata
  fastify.patch('/devices/:id', async (req, reply) => {
    const device = getDevice(req.params.id)
    if (!device) return reply.code(404).send({ error: 'Device not found' })
    const parsed = UpdateDeviceSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() })
    return updateDevice(req.params.id, parsed.data)
  })

  // DELETE /api/devices/:id - remove device from dashboard (does not affect the WLED device)
  fastify.delete('/devices/:id', async (req, reply) => {
    const device = getDevice(req.params.id)
    if (!device) return reply.code(404).send({ error: 'Device not found' })
    deleteDevice(req.params.id)
    logEvent('warn', 'device', `Device removed: "${device.name}" (${device.ip_address})`)
    return reply.code(204).send()
  })

  // POST /api/devices/reorder - update sort_order for all devices
  fastify.post('/devices/reorder', async (req, reply) => {
    const parsed = ReorderSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() })
    reorderDevices(parsed.data.ids)
    return { ok: true }
  })

  // POST /api/devices/:id/command - proxy command to WLED device
  fastify.post('/devices/:id/command', async (req, reply) => {
    const device = getDevice(req.params.id)
    if (!device) return reply.code(404).send({ error: 'Device not found' })
    const parsed = CommandSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() })

    const result = await sendDeviceCommand(device, parsed.data)
    if (!result.ok) return reply.code(502).send({ error: result.error ?? 'WLED device error' })
    return result.data
  })

  // POST /api/devices/:id/refresh - force a live state read, bypassing cache
  fastify.post('/devices/:id/refresh', async (req, reply) => {
    const device = getDevice(req.params.id)
    if (!device) return reply.code(404).send({ error: 'Device not found' })
    const result = await refreshDeviceState(device)
    if (!result.ok) return reply.code(502).send({ error: result.error ?? 'WLED device error' })
    return result.data
  })

  // GET /api/devices/:id/state - raw cached WLED state
  fastify.get('/devices/:id/state', async (req, reply) => {
    const device = getDevice(req.params.id)
    if (!device) return reply.code(404).send({ error: 'Device not found' })
    const state = getCachedState(req.params.id)
    if (!state) return reply.code(503).send({ error: 'No state available yet' })
    return state
  })

  // POST /api/devices/:id/firmware - proxy OTA firmware update to WLED
  fastify.post('/devices/:id/firmware', async (req, reply) => {
    const device = getDevice(req.params.id)
    if (!device) return reply.code(404).send({ error: 'Device not found' })

    if (isDemoMode() || req.params.id.startsWith('demo-')) {
      if (device.is_online === 0) {
        return reply.code(503).send({ error: `Cannot update firmware: "${device.name}" is offline.` })
      }
      const targetVersion = req.query?.version || '0.15.0'
      simulateDemoFirmwareUpdate(device.id, targetVersion)
      logEvent('info', 'firmware', `[Demo Mode] Simulated firmware update to "${device.name}" (v${targetVersion})`)
      return { ok: true, message: `[Demo Mode] Firmware update simulated successfully. ${device.name} upgraded to v${targetVersion}.` }
    }

    const data = await req.file()
    if (!data) return reply.code(400).send({ error: 'No file uploaded' })

    if (data.file?.truncated) {
      return reply.code(413).send({ error: 'Firmware binary exceeds upload size limit' })
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 120000)

    try {
      const buffer = await data.toBuffer()
      const blob = new Blob([buffer])

      const formData = new FormData()
      // WLED strictly requires the multipart file field name to be 'update'.
      // We also append 'file' for compatibility with any custom third-party forks.
      formData.append('update', blob, data.filename || 'update.bin')
      formData.append('file', blob, data.filename || 'update.bin')

      const skipValidation = req.query?.skipValidation === '1' || req.query?.skipValidation === 'true'
      const targetUrl = skipValidation
        ? `http://${device.ip_address}/update?skipValidation=1`
        : `http://${device.ip_address}/update`

      const response = await fetch(targetUrl, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      })

      const respText = await response.text().catch(() => '')
      const cleanMessage = respText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()

      if (!response.ok) {
        let errorDetail = cleanMessage || response.statusText || 'Update rejected by device'
        if (response.status === 401) {
          if (errorDetail.toLowerCase().includes('subnet')) {
            errorDetail = 'Client is not on local subnet. Device security blocked OTA from server IP.'
          } else if (errorDetail.toLowerCase().includes('unlock') || errorDetail.toLowerCase().includes('lock')) {
            errorDetail = 'OTA is locked on this device. Please unlock OTA in WLED Security Settings.'
          } else {
            errorDetail = `Access denied by device (HTTP 401): ${errorDetail}`
          }
        } else if (response.status === 500) {
          if (errorDetail.toLowerCase().includes('compatibility') || errorDetail.toLowerCase().includes('validation')) {
            errorDetail = 'Release compatibility check failed. Binary does not match board architecture or requires skipValidation.'
          } else {
            errorDetail = `Device update failed (HTTP 500): ${errorDetail}`
          }
        }
        logEvent('error', 'firmware', `Firmware upload to "${device.name}" rejected: ${errorDetail}`)
        return reply.code(response.status >= 400 && response.status < 500 ? response.status : 502).send({
          error: errorDetail,
          wledStatus: response.status,
          raw: cleanMessage,
        })
      }

      if (cleanMessage.toLowerCase().includes('failed') || cleanMessage.toLowerCase().includes('error')) {
        logEvent('error', 'firmware', `Firmware upload to "${device.name}" failed: ${cleanMessage}`)
        return reply.code(502).send({
          error: `Device reported update failure: ${cleanMessage}`,
          raw: cleanMessage,
        })
      }

      logEvent('info', 'firmware', `Firmware update uploaded successfully to "${device.name}" (${device.ip_address})`)
      return { ok: true, message: 'Firmware update successful. Device is rebooting.' }
    } catch (err) {
      req.log.error(err)
      const isTimeout = err.name === 'AbortError' || err.name === 'TimeoutError'
      const msg = isTimeout
        ? 'Firmware upload timed out after 120 seconds. Check if controller is still reachable.'
        : (err.message || 'Failed to upload firmware to WLED')
      logEvent('error', 'firmware', `Firmware upload error for "${device?.name || 'device'}": ${msg}`)
      return reply.code(502).send({ error: msg })
    } finally {
      clearTimeout(timeout)
    }
  })
}
