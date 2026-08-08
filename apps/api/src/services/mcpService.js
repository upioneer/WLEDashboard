import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { listDevices, getDevice, sendDeviceCommand, getCachedState } from './deviceService.js'
import { getDb } from '../db/database.js'

export const mcpServer = new McpServer({
  name: "WLEDashboard-MCP",
  version: "0.10.0"
})

mcpServer.tool(
  "list_devices",
  "Get a list of all configured WLED devices and their current state",
  {},
  async () => {
    const devices = listDevices()
    const result = devices.map(d => {
      const state = getCachedState(d.id)
      return { ...d, state }
    })
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] }
  }
)

mcpServer.tool(
  "set_device_state",
  "Turn a WLED device on/off or change its brightness/color",
  {
    deviceId: z.string().describe("The ID of the device (from list_devices)"),
    on: z.boolean().optional().describe("Set to true to turn on, false to turn off"),
    bri: z.number().min(0).max(255).optional().describe("Brightness level (0-255)"),
    colorHex: z.string().optional().describe("Color in hex format, e.g. #FF0000 for red")
  },
  async ({ deviceId, on, bri, colorHex }) => {
    const device = getDevice(deviceId)
    if (!device) {
      return { isError: true, content: [{ type: "text", text: `Device ${deviceId} not found.` }] }
    }

    const payload = {}
    if (on !== undefined) payload.on = on
    if (bri !== undefined) payload.bri = bri
    
    if (colorHex) {
      const hex = colorHex.replace(/^#/, '')
      const bigint = parseInt(hex, 16)
      const r = (bigint >> 16) & 255
      const g = (bigint >> 8) & 255
      const b = bigint & 255
      payload.seg = [{ col: [[r, g, b]] }]
    }

    const result = await sendDeviceCommand(device, payload)
    if (!result.ok) {
      return { isError: true, content: [{ type: "text", text: `Failed to send command to ${device.name}.` }] }
    }

    return { content: [{ type: "text", text: `Successfully updated device ${device.name}.` }] }
  }
)

mcpServer.tool(
  "apply_preset",
  "Apply a WLED preset by its ID to a device",
  {
    deviceId: z.string().describe("The ID of the device"),
    presetId: z.number().min(1).max(250).describe("The preset ID (1-250) to apply")
  },
  async ({ deviceId, presetId }) => {
    const device = getDevice(deviceId)
    if (!device) {
      return { isError: true, content: [{ type: "text", text: `Device ${deviceId} not found.` }] }
    }

    const result = await sendDeviceCommand(device, { ps: presetId })
    if (!result.ok) {
      return { isError: true, content: [{ type: "text", text: `Failed to apply preset to ${device.name}.` }] }
    }

    return { content: [{ type: "text", text: `Successfully applied preset ${presetId} to ${device.name}.` }] }
  }
)
