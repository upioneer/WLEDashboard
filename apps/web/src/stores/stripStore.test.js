import test from 'node:test'
import assert from 'node:assert/strict'
import { useStripStore } from './stripStore.js'

function mockFetchOnce(impl) {
  const orig = globalThis.fetch
  globalThis.fetch = impl
  return () => { globalThis.fetch = orig }
}

const okJson = (data) => async () => ({ ok: true, status: 200, json: async () => data })

test('fetchStrips populates strips and clears loading/error', async () => {
  useStripStore.setState({ strips: [], loading: true, error: 'stale' })
  const restore = mockFetchOnce(okJson([{ id: 's1', name: 'Hall', members: [], total_leds: 0 }]))
  try {
    await useStripStore.getState().fetchStrips()
  } finally {
    restore()
  }
  const s = useStripStore.getState()
  assert.equal(s.strips.length, 1)
  assert.equal(s.strips[0].name, 'Hall')
  assert.equal(s.loading, false)
  assert.equal(s.error, null)
})

test('fetchStrips transport failure surfaces error and preserves strips', async () => {
  const prior = [{ id: 's9', name: 'Kept', members: [] }]
  useStripStore.setState({ strips: prior, loading: true, error: null })
  const restore = mockFetchOnce(async () => { throw new Error('conn refused') })
  try {
    await useStripStore.getState().fetchStrips()
  } finally {
    restore()
  }
  const s = useStripStore.getState()
  assert.deepEqual(s.strips, prior)
  assert.equal(s.loading, false)
  assert.equal(s.error, 'conn refused')
})

test('playStrip and stopStrip flip the playing flag', async () => {
  useStripStore.setState({ strips: [{ id: 's1', name: 'Hall', playing: false }] })
  let restore = mockFetchOnce(okJson({ playing: true }))
  try {
    await useStripStore.getState().playStrip('s1', { pattern: 'solid' })
  } finally {
    restore()
  }
  assert.equal(useStripStore.getState().strips[0].playing, true)
  restore = mockFetchOnce(okJson({ playing: false }))
  try {
    await useStripStore.getState().stopStrip('s1')
  } finally {
    restore()
  }
  assert.equal(useStripStore.getState().strips[0].playing, false)
})
