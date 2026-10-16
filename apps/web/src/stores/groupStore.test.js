import test from 'node:test'
import assert from 'node:assert/strict'
import { useGroupStore } from './groupStore.js'

function mockFetchOnce(impl) {
  const orig = globalThis.fetch
  globalThis.fetch = impl
  return () => { globalThis.fetch = orig }
}

const okJson = (data) => async () => ({ ok: true, status: 200, json: async () => data })

test('fetchGroups populates groups and clears loading/error', async () => {
  useGroupStore.setState({ groups: [], loading: true, error: 'stale' })
  const restore = mockFetchOnce(okJson([{ id: 'g1', name: 'Den', device_ids: [] }]))
  try {
    await useGroupStore.getState().fetchGroups()
  } finally {
    restore()
  }
  const s = useGroupStore.getState()
  assert.equal(s.groups.length, 1)
  assert.equal(s.groups[0].name, 'Den')
  assert.equal(s.loading, false)
  assert.equal(s.error, null)
})

test('fetchGroups transport failure surfaces error and preserves groups', async () => {
  const prior = [{ id: 'g9', name: 'Kept', device_ids: [] }]
  useGroupStore.setState({ groups: prior, loading: true, error: null })
  const restore = mockFetchOnce(async () => { throw new Error('conn refused') })
  try {
    await useGroupStore.getState().fetchGroups()
  } finally {
    restore()
  }
  const s = useGroupStore.getState()
  assert.deepEqual(s.groups, prior)
  assert.equal(s.loading, false)
  assert.equal(s.error, 'conn refused')
})

test('fetchGroups HTTP error surfaces the server message', async () => {
  useGroupStore.setState({ groups: [], loading: true, error: null })
  const restore = mockFetchOnce(async () => ({
    ok: false, status: 500, statusText: 'boom', json: async () => ({ error: 'db down' }),
  }))
  try {
    await useGroupStore.getState().fetchGroups()
  } finally {
    restore()
  }
  const s = useGroupStore.getState()
  assert.deepEqual(s.groups, [])
  assert.equal(s.loading, false)
  assert.equal(s.error, 'db down')
})
