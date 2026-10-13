import test from 'node:test'
import assert from 'node:assert/strict'
import { WebSocketServer } from 'ws'

const {
  connectWledWebSocket,
  disconnectWledWebSocket,
  getWledWsStatus,
} = await import('../src/services/wledWsService.js')

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function startWsServer() {
  const connections = []
  const server = new WebSocketServer({ host: '127.0.0.1', port: 0 })
  server.on('connection', (ws) => connections.push(ws))
  await new Promise((resolve) => server.on('listening', resolve))
  return { server, connections, port: server.address().port }
}

async function waitFor(fn, timeoutMs = 5000) {
  const start = Date.now()
  for (;;) {
    if (fn()) return true
    if (Date.now() - start > timeoutMs) return false
    await sleep(50)
  }
}

test('WLED WebSocket reconnection', async (t) => {
  await t.test('client reconnects after the server drops the connection', async () => {
    const first = await startWsServer()
    const device = { id: 'ws-re-1', name: 'reconnect-test', ip_address: `127.0.0.1:${first.port}` }
    try {
      connectWledWebSocket(device, () => {})
      assert.equal(await waitFor(() => first.connections.length === 1), true)
      assert.equal(getWledWsStatus(device.id).connected, true)

      // Drop everything: existing sockets and the listener
      for (const ws of first.connections) ws.terminate()
      await new Promise((resolve) => first.server.close(resolve))
      assert.equal(await waitFor(() => getWledWsStatus(device.id).pendingReconnect), true)

      // Bring the controller back on the same port before the 1s retry fires
      const connections = []
      const second = new WebSocketServer({ host: '127.0.0.1', port: first.port })
      second.on('connection', (ws) => connections.push(ws))
      try {
        await new Promise((resolve) => second.on('listening', resolve))
        assert.equal(await waitFor(() => connections.length === 1, 8000), true)
        assert.equal(await waitFor(() => getWledWsStatus(device.id).connected), true)
      } finally {
        for (const ws of connections) ws.terminate()
        await new Promise((resolve) => second.close(resolve))
      }
    } finally {
      disconnectWledWebSocket(device.id)
    }
  })

  await t.test('disconnect stops reconnect attempts', async () => {
    const { server, port } = await startWsServer()
    const device = { id: 'ws-re-2', name: 'disconnect-test', ip_address: `127.0.0.1:${port}` }
    try {
      connectWledWebSocket(device, () => {})
      assert.equal(await waitFor(() => getWledWsStatus(device.id).connected), true)
      disconnectWledWebSocket(device.id)
      await new Promise((resolve) => server.close(resolve))
      await sleep(1500)
      const status = getWledWsStatus(device.id)
      assert.equal(status.connected, false)
      assert.equal(status.pendingReconnect, false)
      assert.equal(status.attempts, 0)
    } finally {
      disconnectWledWebSocket(device.id)
    }
  })
})
