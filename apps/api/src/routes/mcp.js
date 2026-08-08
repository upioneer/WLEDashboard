import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js'
import { mcpServer } from '../services/mcpService.js'

const transports = new Map()

export async function mcpRoutes(fastify) {
  fastify.get('/mcp/sse', async (req, reply) => {
    console.log('[mcp] New SSE connection established')
    
    // SSEServerTransport tells the client to send messages to this URL
    const transport = new SSEServerTransport('/api/mcp/messages', reply.raw)
    
    await mcpServer.server.connect(transport)
    
    const sessionId = transport.sessionId
    transports.set(sessionId, transport)
    
    reply.raw.on('close', () => {
      console.log(`[mcp] SSE connection closed for session ${sessionId}`)
      transports.delete(sessionId)
    })
    
    // Tell Fastify we are handling the response raw (SSE stream)
    reply.hijack()
  })

  fastify.post('/mcp/messages', async (req, reply) => {
    const sessionId = req.query.sessionId
    const transport = transports.get(sessionId)
    
    if (!transport) {
      reply.code(404).send({ error: 'Session not found' })
      return
    }

    // Delegate the POST request to the SDK's transport handler
    await transport.handlePostMessage(req.raw, reply.raw)
    
    // Tell Fastify we handled the response raw
    reply.hijack()
  })
}
