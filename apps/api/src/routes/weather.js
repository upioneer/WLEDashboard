import {
  getCurrentWeatherState,
  getWeatherMappings,
  saveWeatherMappings,
  pollWeather,
  testWeatherCondition,
} from '../services/weatherService.js'

export async function weatherRoutes(fastify) {
  // Get current weather status & mappings
  fastify.get('/weather/current', async () => {
    return {
      state: getCurrentWeatherState(),
      mappings: getWeatherMappings(),
    }
  })

  // Trigger immediate weather poll & sync
  fastify.post('/weather/sync-now', async () => {
    await pollWeather(true)
    return {
      success: true,
      state: getCurrentWeatherState(),
    }
  })

  // Simulate a specific weather condition
  fastify.post('/weather/test', async (req, reply) => {
    const { condition } = req.body || {}
    if (!condition) {
      reply.status(400)
      return { error: 'Condition parameter is required' }
    }
    const result = await testWeatherCondition(condition)
    return result
  })

  // Update custom weather condition mappings
  fastify.patch('/weather/mappings', async (req) => {
    const mappings = req.body || {}
    const updated = saveWeatherMappings(mappings)
    return {
      success: true,
      mappings: updated,
    }
  })
}
