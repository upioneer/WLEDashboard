import test from 'node:test'
import assert from 'node:assert/strict'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

function makeTempDir(prefix) {
  try {
    return fs.mkdtempSync(path.join(os.tmpdir(), prefix))
  } catch {
    const fallbackBase = path.join(process.cwd(), '.test-tmp')
    fs.mkdirSync(fallbackBase, { recursive: true })
    return fs.mkdtempSync(path.join(fallbackBase, `${prefix}-`))
  }
}

const tmpDir = makeTempDir('wled-mcp-test-')
process.env.DATA_DIR = tmpDir

const { mcpRoutes } = await import('../src/routes/mcp.js')
const Fastify = (await import('fastify')).default

test('Phase 11 MCP tools', async (t) => {
  const fastify = Fastify({ logger: false })
  await fastify.register(mcpRoutes)

  await t.test('GET /api/mcp/tools lists get_devices, set_state, apply_palette', async () => {
    const res = await fastify.inject({ method: 'GET', url: '/mcp/tools' })
    assert.equal(res.statusCode, 200)
    const body = JSON.parse(res.body)
    assert.ok(Array.isArray(body.tools))
    const names = body.tools.map((tool) => tool.name)
    for (const required of ['get_devices', 'set_state', 'apply_palette']) {
      assert.ok(names.includes(required), `tools should include ${required}`)
    }
  })

  await t.test('apply_palette handler reports unknown device without network', async () => {
    const { applyPaletteTool } = await import('../src/services/mcpService.js')
    const result = await applyPaletteTool({ deviceId: 'missing-device', paletteId: 'nope' })
    assert.equal(result.isError, true)
  })

  await t.test('set_state handler reports unknown device without network', async () => {
    const { setDeviceStateTool } = await import('../src/services/mcpService.js')
    const result = await setDeviceStateTool({ deviceId: 'missing-device', on: true })
    assert.equal(result.isError, true)
  })
})
