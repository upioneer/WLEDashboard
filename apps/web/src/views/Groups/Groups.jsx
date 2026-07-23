import { useEffect, useState, useCallback, useRef } from 'react'
import { useGroupStore } from '../../stores/groupStore.js'
import { useDeviceStore } from '../../stores/deviceStore.js'
import { useUIStore } from '../../stores/uiStore.js'
import { configApi } from '../../lib/api.js'
import { GroupCard } from '../../components/GroupCard/GroupCard.jsx'
import { GroupEditorModal } from '../../components/GroupEditorModal/GroupEditorModal.jsx'
import styles from './Groups.module.css'

export function Groups() {
  const { groups, loading, error, fetchGroups, addGroup, updateGroup } = useGroupStore()
  const fetchDevices = useDeviceStore(s => s.fetchDevices)
  const addToast     = useUIStore(s => s.addToast)

  const [search, setSearch]             = useState('')
  const [filterType, setFilterType]     = useState('all')
  const [editingGroup, setEditingGroup] = useState(null) // group object or null
  const [isCreating, setIsCreating]     = useState(false)
  const fileInputRef                    = useRef(null)

  useEffect(() => {
    fetchGroups()
    fetchDevices()
  }, [fetchGroups, fetchDevices])

  // Filter groups
  const filteredGroups = groups.filter(g => {
    const matchesSearch = !search || g.name.toLowerCase().includes(search.toLowerCase())
    const matchesType   = filterType === 'all' || g.type === filterType
    return matchesSearch && matchesType
  })

  // Export JSON backup
  const handleExportConfig = useCallback(async () => {
    try {
      const config = await configApi.export()
      const jsonStr = JSON.stringify(config, null, 2)
      const blob = new Blob([jsonStr], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `wledashboard-backup-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      addToast({ message: 'Configuration backup downloaded', type: 'success' })
    } catch {
      addToast({ message: 'Failed to export backup', type: 'error' })
    }
  }, [addToast])

  // Import JSON backup
  const handleImportFile = useCallback(async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const parsed = JSON.parse(text)
      const res = await configApi.import(parsed, 'merge')
      addToast({
        message: `Imported ${res.stats.groups} groups, ${res.stats.devices} devices`,
        type: 'success',
      })
      fetchGroups()
      fetchDevices()
    } catch (err) {
      addToast({ message: err.message ?? 'Failed to import backup', type: 'error' })
    } finally {
      e.target.value = ''
    }
  }, [addToast, fetchGroups, fetchDevices])

  if (loading) return <GroupsSkeleton />
  if (error)   return <GroupsError message={error} onRetry={fetchGroups} />

  return (
    <main className={styles.page} id="main-content">
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Groups</h1>
          <p className={styles.subtitle}>
            Organize devices into physical zones, synchronized scenes, and custom clusters.
          </p>
        </div>

        <div className={styles.headerActions}>
          <button className={styles.secondaryBtn} onClick={handleExportConfig} title="Export JSON configuration backup">
            Export Backup
          </button>
          <button className={styles.secondaryBtn} onClick={() => fileInputRef.current?.click()} title="Import JSON configuration backup">
            Import Backup
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportFile}
            accept=".json"
            style={{ display: 'none' }}
          />
          <button className={styles.primaryBtn} onClick={() => setIsCreating(true)}>
            + Create Group
          </button>
        </div>
      </header>

      {/* Filter / Search bar */}
      <div className={styles.toolbar}>
        <div className={styles.searchRow}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search groups..."
            className={styles.searchInput}
            aria-label="Search groups"
          />
        </div>

        <div className={styles.filterChips} role="group" aria-label="Filter by group type">
          {['all', 'zone', 'scene', 'sync', 'custom'].map(t => (
            <button
              key={t}
              className={[styles.chip, filterType === t && styles.chipActive].filter(Boolean).join(' ')}
              onClick={() => setFilterType(t)}
            >
              {t === 'all' ? 'All Groups' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {groups.length === 0 ? (
        <EmptyGroupsState onCreate={() => setIsCreating(true)} />
      ) : filteredGroups.length === 0 ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyTitle}>No matching groups</p>
          <button className={styles.secondaryBtn} onClick={() => { setSearch(''); setFilterType('all') }}>
            Clear Filters
          </button>
        </div>
      ) : (
        <section className={styles.grid} aria-label="Group list">
          {filteredGroups.map(group => (
            <GroupCard
              key={group.id}
              group={group}
              onEdit={g => setEditingGroup(g)}
            />
          ))}
        </section>
      )}

      {/* Modal for create / edit */}
      {(isCreating || editingGroup) && (
        <GroupEditorModal
          group={editingGroup}
          onClose={() => { setIsCreating(false); setEditingGroup(null) }}
          onSave={async (data) => {
            if (editingGroup) {
              await updateGroup(editingGroup.id, data)
              addToast({ message: `Group "${data.name}" updated`, type: 'success' })
            } else {
              await addGroup(data)
              addToast({ message: `Group "${data.name}" created`, type: 'success' })
            }
          }}
        />
      )}
    </main>
  )
}

function EmptyGroupsState({ onCreate }) {
  return (
    <div className={styles.emptyState}>
      <div className={styles.emptyGlow} aria-hidden />
      <p className={styles.emptyTitle}>No Groups Created Yet</p>
      <p className={styles.emptyBody}>
        Groups allow you to control multiple WLED devices together as physical zones, mood scenes, or synced arrays.
      </p>
      <button className={styles.primaryBtn} onClick={onCreate}>
        Create Your First Group
      </button>
    </div>
  )
}

function GroupsSkeleton() {
  return (
    <main className={styles.page} aria-busy="true" aria-label="Loading groups">
      <header className={styles.header}>
        <div className={styles.skeletonTitle} />
      </header>
      <div className={styles.grid}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={styles.skeletonCard} />
        ))}
      </div>
    </main>
  )
}

function GroupsError({ message, onRetry }) {
  return (
    <main className={styles.page}>
      <div className={styles.emptyState}>
        <p className={styles.emptyTitle}>Error loading groups</p>
        <p className={styles.emptyBody}>{message}</p>
        <button className={styles.primaryBtn} onClick={onRetry}>Try Again</button>
      </div>
    </main>
  )
}
