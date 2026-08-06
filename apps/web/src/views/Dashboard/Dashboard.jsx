import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useDeviceStore } from '../../stores/deviceStore.js'
import { useGroupStore } from '../../stores/groupStore.js'
import { useUIStore } from '../../stores/uiStore.js'
import { useSpatialStore } from '../../stores/spatialStore.js'
import { DeviceCard } from '../../components/DeviceCard/DeviceCard.jsx'
import { GroupCard } from '../../components/GroupCard/GroupCard.jsx'
import { SearchBar } from '../../components/SearchBar/SearchBar.jsx'
import { extractDominantColor, blendColors } from '../../lib/colors.js'
import { useWindowVirtualizer } from '@tanstack/react-virtual'
import styles from './Dashboard.module.css'

// ─── Custom Hooks ─────────────────────────────────────────────────────────────

function useColumnCount() {
  const [columns, setColumns] = useState(1)
  const [node, setNode] = useState(null)
  
  useEffect(() => {
    if (!node) return
    const observer = new ResizeObserver(entries => {
      for (let entry of entries) {
        const width = entry.contentRect.width
        const vw = window.innerWidth
        const gap = 20
        const minWidth = vw >= 1200 && vw < 1800 ? 320 : 300
        let cols = Math.floor((width + gap) / (minWidth + gap))
        setColumns(Math.max(1, cols))
      }
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [node])
  
  return [columns, setNode]
}

// ─── Sortable wrapper ─────────────────────────────────────────────────────────

function SortableCard({ device, disabled }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: device.id, disabled })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    opacity: isDragging ? 0.6 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={styles.cardWrapper}
      {...attributes}
      {...listeners}
    >
      <DeviceCard device={device} />
    </div>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export function Dashboard() {
  const { devices, loading, error, fetchDevices, reorderDevices } = useDeviceStore()
  const { groups, fetchGroups } = useGroupStore()
  const { hierarchy, fetchHierarchy } = useSpatialStore()
  const setHeaderAccentColor = useUIStore(s => s.setHeaderAccentColor)

  const [search, setSearch]       = useState('')
  const [filter, setFilter]       = useState('all')
  const [viewMode, setViewMode]   = useState('devices') // 'devices' | 'groups'
  const [sortMode, setSortMode]   = useState('manual') // 'manual', 'az', 'za', 'date', 'room'
  const [localOrder, setLocalOrder] = useState([])
  const [columns, setContainerRef] = useColumnCount()

  useEffect(() => {
    fetchDevices()
    fetchGroups()
    fetchHierarchy()
  }, [fetchDevices, fetchGroups, fetchHierarchy])

  // Keep local order in sync with store (e.g. after initial load or external add)
  useEffect(() => {
    setLocalOrder(prev => {
      const prevIds = new Set(prev)
      const newIds  = new Set(devices.map(d => d.id))
      const merged  = prev.filter(id => newIds.has(id))
      devices.forEach(d => { if (!prevIds.has(d.id)) merged.push(d.id) })
      return merged
    })
  }, [devices])

  // Blend active device colors into header accent
  useEffect(() => {
    const activeColors = devices
      .filter(d => d.liveState?.on && d.is_online)
      .map(d => extractDominantColor(d.liveState))
      .filter(Boolean)
    setHeaderAccentColor(blendColors(activeColors))
  }, [devices, setHeaderAccentColor])

  // Map devices to rooms for grouping
  const deviceRoomMap = useMemo(() => {
    const map = {}
    hierarchy.forEach(d => {
      d.floors?.forEach(f => {
        f.rooms?.forEach(r => {
          r.anchors?.forEach(a => {
            if (a.device_id) map[a.device_id] = r.name
          })
        })
      })
    })
    return map
  }, [hierarchy])

  // Filtered + ordered device list
  const orderedDevices = localOrder
    .map(id => devices.find(d => d.id === id))
    .filter(Boolean)

  let sortedDevices = [...orderedDevices]
  if (sortMode === 'az') {
    sortedDevices.sort((a, b) => a.name.localeCompare(b.name))
  } else if (sortMode === 'za') {
    sortedDevices.sort((a, b) => b.name.localeCompare(a.name))
  } else if (sortMode === 'date') {
    sortedDevices.sort((a, b) => b.sort_order - a.sort_order) // Newest first
  } else if (sortMode === 'room') {
    sortedDevices.sort((a, b) => {
      const rA = deviceRoomMap[a.id] || 'Unassigned'
      const rB = deviceRoomMap[b.id] || 'Unassigned'
      if (rA === rB) return a.name.localeCompare(b.name)
      if (rA === 'Unassigned') return 1
      if (rB === 'Unassigned') return -1
      return rA.localeCompare(rB)
    })
  }

  const onlineCount  = devices.filter(d => d.is_online === 1).length
  const offlineCount = devices.filter(d => d.is_online === 0).length
  const onCount      = devices.filter(d => d.liveState?.on && d.is_online === 1).length
  const offCount     = devices.filter(d => (!d.liveState?.on || d.is_online === 0)).length

  const filtered = sortedDevices.filter(d => {
    const matchesSearch = !search ||
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.ip_address.includes(search)
    const matchesFilter =
      filter === 'all' ||
      (filter === 'online'  && d.is_online === 1) ||
      (filter === 'offline' && d.is_online === 0) ||
      (filter === 'on'      && d.liveState?.on && d.is_online === 1) ||
      (filter === 'off'     && (!d.liveState?.on || d.is_online === 0))
    return matchesSearch && matchesFilter
  })

  // dnd-kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const isManualSort = sortMode === 'manual'

  const rowCount = Math.ceil(filtered.length / columns)
  const virtualizer = useWindowVirtualizer({
    count: rowCount,
    estimateSize: () => 340, // 320px card + 20px gap
    overscan: 2,
  })

  const handleDragEnd = useCallback(({ active, over }) => {
    if (!isManualSort) return
    if (!over || active.id === over.id) return
    const oldIndex = localOrder.indexOf(active.id)
    const newIndex = localOrder.indexOf(over.id)
    const next = arrayMove(localOrder, oldIndex, newIndex)
    setLocalOrder(next)
    reorderDevices(next)
  }, [localOrder, reorderDevices, isManualSort])

  const showSearch = devices.length > 4

  if (loading) return <DashboardSkeleton />
  if (error)   return <DashboardError message={error} onRetry={fetchDevices} />

  return (
    <main className={styles.dashboard} id="main-content">
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Dashboard</h1>
          <div className={styles.stats} role="group" aria-label="Device category filters">
            <StatPill label="Devices" value={devices.length} active={filter === 'all'} onClick={() => setFilter('all')} />
            <StatPill label="Online"  value={onlineCount} active={filter === 'online'} onClick={() => setFilter('online')} />
            <StatPill label="Offline" value={offlineCount} active={filter === 'offline'} onClick={() => setFilter('offline')} />
            <StatPill label="ON"      value={onCount} active={filter === 'on'} onClick={() => setFilter('on')} />
            <StatPill label="OFF"     value={offCount} active={filter === 'off'} onClick={() => setFilter('off')} />
            {groups.length > 0 && <StatPill label="Groups" value={groups.length} active={false} onClick={() => setViewMode('groups')} />}
          </div>
        </div>

        <div className={styles.headerRight}>
          {viewMode === 'devices' && (
            <select
              value={sortMode}
              onChange={e => setSortMode(e.target.value)}
              className={styles.sortSelect}
              title="Sort Devices"
            >
              <option value="manual">Manual Sort (Drag & Drop)</option>
              <option value="room">Group by Room</option>
              <option value="az">Alphabetical (A-Z)</option>
              <option value="za">Alphabetical (Z-A)</option>
              <option value="date">Date Added</option>
            </select>
          )}

          {groups.length > 0 && (
            <div className={styles.modeToggle} role="group" aria-label="Dashboard view mode">
              <button
                className={[styles.modeBtn, viewMode === 'devices' && styles.modeBtnActive].filter(Boolean).join(' ')}
                onClick={() => setViewMode('devices')}
              >
                Devices
              </button>
              <button
                className={[styles.modeBtn, viewMode === 'groups' && styles.modeBtnActive].filter(Boolean).join(' ')}
                onClick={() => setViewMode('groups')}
              >
                Groups ({groups.length})
              </button>
            </div>
          )}
          <span className={styles.networkBadge}>
            <span className={styles.networkDot} />
            Local Network
          </span>
        </div>
      </header>

      {showSearch && viewMode === 'devices' && (
        <SearchBar
          value={search}
          onChange={setSearch}
          filter={filter}
          onFilter={setFilter}
          resultCount={filtered.length}
        />
      )}

      {devices.length === 0 ? (
        <EmptyState />
      ) : viewMode === 'groups' ? (
        <section className={styles.grid} aria-label="Group list">
          {groups.map(group => (
            <GroupCard key={group.id} group={group} />
          ))}
        </section>
      ) : filtered.length === 0 ? (
        <NoResults onClear={() => { setSearch(''); setFilter('all') }} />
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={filtered.map(d => d.id)} strategy={rectSortingStrategy}>
            <section
              ref={setContainerRef}
              aria-label="Device list"
              style={{
                position: 'relative',
                height: `${virtualizer.getTotalSize()}px`,
                width: '100%',
              }}
            >
              {virtualizer.getVirtualItems().map(virtualRow => {
                const startIndex = virtualRow.index * columns
                const rowDevices = filtered.slice(startIndex, startIndex + columns)

                return (
                  <div
                    key={virtualRow.index}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: `${virtualRow.size - 20}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                      display: 'grid',
                      gridTemplateColumns: `repeat(${columns}, 1fr)`,
                      gap: '20px',
                    }}
                  >
                    {rowDevices.map((device, i) => (
                      <div key={device.id} style={{ animationDelay: `${(startIndex + i) * 30}ms` }}>
                        <SortableCard device={device} disabled={!isManualSort} />
                        {sortMode === 'room' && deviceRoomMap[device.id] && (
                          <div className={styles.roomTag}>{deviceRoomMap[device.id]}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )
              })}
            </section>
          </SortableContext>
        </DndContext>
      )}
    </main>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatPill({ label, value, active, onClick }) {
  return (
    <button
      className={[styles.statPill, active && styles.statPillActive].filter(Boolean).join(' ')}
      onClick={onClick}
      aria-pressed={active}
      title={`Filter by ${label}`}
    >
      <span className={styles.statValue}>{value}</span>
      <span className={styles.statLabel}>{label}</span>
    </button>
  )
}

function EmptyState() {
  return (
    <div className={styles.emptyState} role="status">
      <div className={styles.emptyGlow} aria-hidden />
      <p className={styles.emptyTitle}>No devices found</p>
      <p className={styles.emptyBody}>
        WLEDashboard automatically discovers WLED devices on your local network via mDNS.
        Ensure your devices are powered on and on the same network.
      </p>
      <p className={styles.emptyHint}>
        You can also add a device manually in Settings.
      </p>
    </div>
  )
}

function NoResults({ onClear }) {
  return (
    <div className={styles.emptyState} role="status">
      <p className={styles.emptyTitle}>No matches</p>
      <p className={styles.emptyBody}>No devices match your current search or filter.</p>
      <button className={styles.retryBtn} onClick={onClear}>Clear filters</button>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <main className={styles.dashboard} aria-busy="true" aria-label="Loading devices">
      <header className={styles.header}>
        <div className={styles.skeletonTitle} />
      </header>
      <section className={styles.grid}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={styles.skeletonCard} style={{ animationDelay: `${i * 60}ms` }} />
        ))}
      </section>
    </main>
  )
}

function DashboardError({ message, onRetry }) {
  return (
    <main className={styles.dashboard}>
      <div className={styles.errorState} role="alert">
        <p className={styles.errorTitle}>Could not connect to API</p>
        <p className={styles.errorBody}>{message}</p>
        <button className={styles.retryBtn} onClick={onRetry}>Try Again</button>
      </div>
    </main>
  )
}
