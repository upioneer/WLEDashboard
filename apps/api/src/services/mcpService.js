import { readFileSync } from 'node:fs'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { listDevices, getDevice, sendDeviceCommand, getCachedState } from './deviceService.js'
import { getDb } from '../db/database.js'

let MCP_VERSION = '0.23.1'
try {
  const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'))
  MCP_VERSION = pkg.version || MCP_VERSION
} catch (_) {}

export const mcpServer = new McpServer({
  name: "WLEDashboard-MCP",
  version: MCP_VERSION,
})

function hexToRgb(hex) {
  const clean = String(hex).replace(/^#/, '').trim()
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return null
  const bigint = parseInt(clean, 16)
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255]
}

function parseColorList(colors) {
  if (!Array.isArray(colors)) return null
  const rgb = []
  for (const c of colors) {
    if (Array.isArray(c) && c.length >= 3) {
      rgb.push([c[0], c[1], c[2]])
      continue
    }
    const parsed = hexToRgb(c)
    if (!parsed) return null
    rgb.push(parsed)
  }
  return rgb.length ? rgb : null
}

function errorText(text) {
  return { isError: true, content: [{ type: "text", text }] }
}

function okText(text) {
  return { content: [{ type: "text", text }] }
}

export async function listDevicesTool() {
  const devices = listDevices()
  const result = devices.map(d => {
    const state = getCachedState(d.id)
    return { ...d, state }
  })
  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] }
}

export async function setDeviceStateTool({ deviceId, on, bri, colorHex }) {
  const device = getDevice(deviceId)
  if (!device) {
    return errorText(`Device ${deviceId} not found.`)
  }

  const payload = {}
  if (on !== undefined) payload.on = on
  if (bri !== undefined) payload.bri = bri

  if (colorHex) {
    const rgb = hexToRgb(colorHex)
    if (!rgb) {
      return errorText(`Invalid colorHex "${colorHex}". Use hex format, e.g. #FF0000 for red.`)
    }
    payload.seg = [{ col: [rgb] }]
  }

  const result = await sendDeviceCommand(device, payload)
  if (!result.ok) {
    return errorText(`Failed to send command to ${device.name}.`)
  }

  return okText(`Successfully updated device ${device.name}.`)
}

export async function applyPresetTool({ deviceId, presetId }) {
  const device = getDevice(deviceId)
  if (!device) {
    return errorText(`Device ${deviceId} not found.`)
  }

  const result = await sendDeviceCommand(device, { ps: presetId })
  if (!result.ok) {
    return errorText(`Failed to apply preset to ${device.name}.`)
  }

  return okText(`Successfully applied preset ${presetId} to ${device.name}.`)
}

export async function applyPaletteTool({ deviceId, paletteId, paletteName, colors, wledPalette }) {
  const device = getDevice(deviceId)
  if (!device) {
    return errorText(`Device ${deviceId} not found.`)
  }

  let rgb = parseColorList(colors) ?? null
  let pal = null

  if (!rgb && pal === null && (paletteId !== undefined && paletteId !== null && paletteId !== '')) {
    const db = getDb()
    const row = db.prepare('SELECT * FROM palettes WHERE id = ?').get(String(paletteId))
    if (row) {
      try {
        rgb = parseColorList(JSON.parse(row.colors_json || '[]')) ?? null
      } catch (_) {
        rgb = null
      }
    } else if (/^\d+$/.test(String(paletteId))) {
      pal = parseInt(String(paletteId), 10)
    }
    if (!rgb && pal === null) {
      return errorText(`Palette "${paletteId}" not found.`)
    }
  }

  if (!rgb && pal === null && paletteName) {
    const db = getDb()
    const row = db.prepare('SELECT * FROM palettes WHERE name = ?').get(paletteName)
    if (!row) {
      return errorText(`Palette "${paletteName}" not found.`)
    }
    try {
      rgb = parseColorList(JSON.parse(row.colors_json || '[]')) ?? null
    } catch (_) {
      rgb = null
    }
    if (!rgb) {
      return errorText(`Palette "${paletteName}" has no usable colors.`)
    }
  }

  if (wledPalette !== undefined && wledPalette !== null) {
    pal = wledPalette
    rgb = null
  }

  if (!rgb && pal === null) {
    return errorText('No palette provided. Supply paletteId, paletteName, colors, or wledPalette.')
  }

  const payload = pal !== null
    ? { seg: [{ pal }] }
    : { seg: [{ col: rgb.slice(0, 3) }] }

  const result = await sendDeviceCommand(device, payload)
  if (!result.ok) {
    return errorText(`Failed to apply palette to ${device.name}.`)
  }

  return okText(`Successfully applied palette to ${device.name}.`)
}

const deviceIdField = z.string().describe("The ID of the device (from get_devices)")

mcpServer.tool(
  "get_devices",
  "Get a list of all configured WLED devices and their current state",
  {},
  listDevicesTool,
)

mcpServer.tool(
  "set_state",
  "Turn a WLED device on/off or change its brightness/color",
  {
    deviceId: deviceIdField,
    on: z.boolean().optional().describe("Set to true to turn on, false to turn off"),
    bri: z.number().min(0).max(255).optional().describe("Brightness level (0-255)"),
    colorHex: z.string().optional().describe("Color in hex format, e.g. #FF0000 for red")
  },
  setDeviceStateTool,
)

mcpServer.tool(
  "apply_palette",
  "Apply a stored color palette (or WLED built-in palette) to a device",
  {
    deviceId: deviceIdField,
    paletteId: z.string().optional().describe("Stored palette ID, or a WLED built-in palette number"),
    paletteName: z.string().optional().describe("Stored palette name"),
    colors: z.array(z.string()).optional().describe("Inline color list in hex format, e.g. ['#FF0000', '#00FF00']"),
    wledPalette: z.number().min(0).max(255).optional().describe("WLED built-in palette number"),
  },
  applyPaletteTool,
)

// Legacy aliases kept for backward compatibility with earlier clients.
mcpServer.tool(
  "list_devices",
  "Alias of get_devices: list all configured WLED devices and their current state",
  {},
  listDevicesTool,
)

mcpServer.tool(
  "set_device_state",
  "Alias of set_state: turn a WLED device on/off or change its brightness/color",
  {
    deviceId: deviceIdField,
    on: z.boolean().optional().describe("Set to true to turn on, false to turn off"),
    bri: z.number().min(0).max(255).optional().describe("Brightness level (0-255)"),
    colorHex: z.string().optional().describe("Color in hex format, e.g. #FF0000 for red")
  },
  setDeviceStateTool,
)

mcpServer.tool(
  "apply_preset",
  "Apply a WLED preset by its ID to a device",
  {
    deviceId: deviceIdField,
    presetId: z.number().min(1).max(250).describe("The preset ID (1-250) to apply")
  },
  applyPresetTool,
)

export const MCP_TOOL_DEFS = [
  { name: 'get_devices', description: 'Get a list of all configured WLED devices and their current state' },
  { name: 'set_state', description: 'Turn a WLED device on/off or change its brightness/color' },
  { name: 'apply_palette', description: 'Apply a stored color palette (or WLED built-in palette) to a device' },
  { name: 'list_devices', description: 'Alias of get_devices' },
  { name: 'set_device_state', description: 'Alias of set_state' },
  { name: 'apply_preset', description: 'Apply a WLED preset by its ID to a device' },
]
