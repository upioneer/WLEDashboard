import { getDb } from '../db/database.js'
import { getSpotifyAuthUrl, handleSpotifyCallback, disconnectSpotify, getSpotifyStatus } from '../services/spotifyService.js'

export async function spotifyRoutes(fastify) {
  fastify.get('/spotify/login', async (req, reply) => {
    const authUrl = getSpotifyAuthUrl()
    if (!authUrl) {
      reply.code(500).send({ error: 'Spotify Client ID/Secret not configured in .env' })
      return
    }
    reply.redirect(authUrl)
  })

  fastify.get('/spotify/callback', async (req, reply) => {
    const { code, error } = req.query
    if (error) {
      reply.code(400).send({ error: 'Spotify authorization failed' })
      return
    }
    
    if (!code) {
      reply.code(400).send({ error: 'No authorization code provided' })
      return
    }

    try {
      await handleSpotifyCallback(code)
      // Redirect back to frontend dashboard
      reply.redirect(process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173')
    } catch (err) {
      req.log.error('Spotify callback error:', err)
      reply.code(500).send({ error: 'Failed to exchange authorization code' })
    }
  })

  fastify.delete('/spotify/disconnect', async (req, reply) => {
    disconnectSpotify()
    reply.send({ success: true })
  })

  fastify.get('/spotify/status', async (req, reply) => {
    const status = getSpotifyStatus()
    reply.send(status)
  })
}
