import { z } from 'zod'
import {
  listDevices,
  getDevice,
  createDevice,
  updateDevice,
  deleteDevice,
  reorderDevices,
  sendDeviceCommand,
  getCachedState,
  getAllCachedStates,
} from '../services/deviceService.js'

// ─── Validation Schemas ───────────────────────────────────────────────────────

const CreateDeviceSchema = z.object({
  name: z.string().min(1).max(64).trim(),
  ip_address: z.string().ip({ version: 'v4' }),
  mac_address: z.string().optional(),
  firmware_ver: z.string().optional(),
  led_count: z.number().int().positive().optional(),
})

const UpdateDeviceSchema = z.object({
  name: z.string().min(1).max(64).trim().optional(),
  ip_address: z.string().ip({ version: 'v4' }).optional(),
  sort_order: z.number().int().min(0).optional(),
  led_density: z.number().positive().optional(),
  led_count: z.number().int().positive().optional(),
})

const ReorderSchema = z.object({
  ids: z.array(z.string().uuid()),
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

    const data = await req.file()
    if (!data) return reply.code(400).send({ error: 'No file uploaded' })

    try {
      const buffer = await data.toBuffer()
      const blob = new Blob([buffer])
      
      const formData = new FormData()
      // WLED expects the file field to be named 'file' or 'update' depending on the fork, 
      // but standard WLED expects 'file' for /update endpoint.
      formData.append('file', blob, data.filename || 'update.bin')

      const response = await fetch(`http://${device.ip_address}/update`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`WLED rejected update: ${response.statusText}`)
      }

      return { ok: true, message: 'Firmware update successful. Device is rebooting.' }
    } catch (err) {
      req.log.error(err)
      return reply.code(502).send({ error: err.message || 'Failed to upload firmware to WLED' })
    }
  })
}
