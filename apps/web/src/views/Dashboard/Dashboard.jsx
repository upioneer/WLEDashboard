import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
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
import { extractDominantColor, blendColors, wledBriToPct, pctToWledBri } from '../../lib/colors.js'
import { Toggle } from '../../components/Toggle/Toggle.jsx'
import styles from './Dashboard.module.css'



function SortableCard({ device, disabled, room, animationDelay }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: device.id, disabled })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : undefined,
    animationDelay,
    position: 'relative'
  }

  if (isDragging) {
    return (
      <div 
        ref={setNodeRef}
        style={{ 
          ...style, 
          border: '2px dashed var(--accent-violet)', 
          borderRadius: 'var(--radius-l)', 
          backgroundColor: 'var(--accent-violet-10)', 
          height: '100%',
          minHeight: '300px',
          opacity: 0.7
        }}
        className={styles.cardWrapper}
      />
    )
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={styles.cardWrapper}
    >
      <DeviceCard 
        device={device} 
        isManualSort={!disabled}
        dragAttributes={attributes}
        dragListeners={listeners}
        dragRef={setActivatorNodeRef}
      />
      {room && (
        <div className={styles.roomTag}>{room}</div>
      )}
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
  const [activeId, setActiveId]     = useState(null)

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

  const handleDragStart = useCallback((event) => {
    setActiveId(event.active.id)
  }, [])

  const handleDragEnd = useCallback(({ active, over }) => {
    setActiveId(null)
    if (!isManualSort) return
    if (!over || active.id === over.id) return
    const oldIndex = localOrder.indexOf(active.id)
    const newIndex = localOrder.indexOf(over.id)
    const next = arrayMove(localOrder, oldIndex, newIndex)
    setLocalOrder(next)
    reorderDevices(next)
  }, [localOrder, reorderDevices, isManualSort])

  const handleDragCancel = useCallback(() => {
    setActiveId(null)
  }, [])

  const activeDevice = activeId ? devices.find(d => d.id === activeId) : null

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

          <select
            value={viewMode}
            onChange={e => setViewMode(e.target.value)}
            className={styles.sortSelect}
            title="Dashboard View"
            style={{ fontWeight: 600, color: 'var(--text-primary)' }}
          >
            <option value="devices">⊞ Grid View</option>
            <option value="compact">≡ Compact List</option>
            <option value="rooms">🏠 Rooms View</option>
            {groups.length > 0 && <option value="groups">⚄ Groups ({groups.length})</option>}
            <option value="media">🎵 Media & Sync</option>
            <option value="favorites">⭐ Favorites</option>
          </select>
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
      ) : viewMode === 'rooms' ? (
        <RoomsView devices={filtered} deviceRoomMap={deviceRoomMap} />
      ) : viewMode === 'compact' ? (
        <CompactView devices={filtered} />
      ) : viewMode === 'media' ? (
        <MediaView devices={filtered} />
      ) : viewMode === 'favorites' ? (
        <FavoritesView devices={filtered} />
      ) : filtered.length === 0 ? (
        <NoResults onClear={() => { setSearch(''); setFilter('all') }} />
      ) : (
        <DndContext 
          sensors={sensors} 
          collisionDetection={closestCenter} 
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <SortableContext items={filtered.map(d => d.id)} strategy={rectSortingStrategy}>
            <section className={styles.grid} aria-label="Device list">
              {filtered.map((device, i) => (
                <SortableCard 
                  key={device.id} 
                  device={device} 
                  disabled={!isManualSort} 
                  room={sortMode === 'room' ? deviceRoomMap[device.id] : null}
                  animationDelay={`${i * 30}ms`}
                />
              ))}
            </section>
          </SortableContext>
          <DragOverlay dropAnimation={null}>
            {activeDevice ? (
              <div style={{ transform: 'scale(1.02)', boxShadow: 'var(--shadow-4)', borderRadius: 'var(--radius-l)', cursor: 'grabbing' }}>
                <DeviceCard device={activeDevice} />
              </div>
            ) : null}
          </DragOverlay>
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

// ─── Extra Views ──────────────────────────────────────────────────────────────

function CompactView({ devices }) {
  const sendCommand = useDeviceStore(s => s.sendCommand)
  const [sortKey, setSortKey] = useState('name')
  const [sortAsc, setSortAsc] = useState(true)

  if (devices.length === 0) return <NoResults onClear={() => {}} />

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc)
    } else {
      setSortKey(key)
      setSortAsc(true)
    }
  }

  const sortedDevices = [...devices].sort((a, b) => {
    const aOn = a.liveState?.on ?? false
    const bOn = b.liveState?.on ?? false
    const aBri = a.liveState?.bri ?? 0
    const bBri = b.liveState?.bri ?? 0

    let cmp = 0
    if (sortKey === 'name') {
      cmp = a.name.localeCompare(b.name, undefined, { numeric: true })
    } else if (sortKey === 'ip') {
      cmp = a.ip_address.localeCompare(b.ip_address, undefined, { numeric: true })
    } else if (sortKey === 'status') {
      cmp = (a.is_online ? 1 : 0) - (b.is_online ? 1 : 0)
    } else if (sortKey === 'power') {
      cmp = (aOn ? 1 : 0) - (bOn ? 1 : 0)
    } else if (sortKey === 'bri') {
      cmp = aBri - bBri
    }

    return sortAsc ? cmp : -cmp
  })

  const renderHeader = (key, label, style) => (
    <div 
      className={styles.compactHeaderCol} 
      style={style} 
      onClick={() => handleSort(key)}
      role="button"
      tabIndex={0}
      title={`Sort by ${label}`}
    >
      {label} <span className={styles.sortIndicator}>{sortKey === key ? (sortAsc ? '▲' : '▼') : ''}</span>
    </div>
  )

  return (
    <div className={styles.compactContainer}>
      <div className={styles.compactHeaderRow}>
        {renderHeader('name', 'Name', { flex: 1 })}
        {renderHeader('ip', 'IP Address', { width: '120px' })}
        {renderHeader('status', 'Status', { width: '90px' })}
        {renderHeader('power', 'Power', { width: '60px' })}
        {renderHeader('bri', 'Bri', { width: '60px', textAlign: 'right' })}
      </div>
      {sortedDevices.map(d => {
        const isOn = d.liveState?.on ?? false
        const briPct = wledBriToPct(d.liveState?.bri ?? 0)
        return (
          <div key={d.id} className={styles.compactRow}>
            <div className={styles.compactName} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className={styles.networkDot} style={{ backgroundColor: d.is_online ? 'var(--accent-emerald)' : 'var(--text-tertiary)', boxShadow: 'none' }} />
              {d.name}
            </div>
            <div className={styles.compactIp} style={{ width: '120px' }}>{d.ip_address}</div>
            <div style={{ width: '90px', color: d.is_online ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
              {d.is_online ? 'Online' : 'Offline'}
            </div>
            <div style={{ width: '60px' }}>
              <Toggle 
                id={`power-compact-${d.id}`}
                checked={isOn}
                disabled={!d.is_online}
                onChange={(on) => sendCommand(d.id, { on, lor: 0 })}
              />
            </div>
            <div style={{ width: '60px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
              {briPct}%
            </div>
          </div>
        )
      })}
    </div>
  )
}

function RoomsView({ devices, deviceRoomMap }) {
  const rooms = {}
  devices.forEach(d => {
    const r = deviceRoomMap[d.id] || 'Unassigned'
    if (!rooms[r]) rooms[r] = []
    rooms[r].push(d)
  })

  return (
    <div className={styles.roomsContainer}>
      {Object.entries(rooms).sort().map(([room, devs]) => (
        <div key={room} className={styles.roomSection}>
          <h2 className={styles.roomTitle}>{room} <span style={{ color: 'var(--text-tertiary)', fontSize: '0.8em' }}>({devs.length})</span></h2>
          <section className={styles.grid}>
            {devs.map(d => (
              <DeviceCard key={d.id} device={d} />
            ))}
          </section>
        </div>
      ))}
    </div>
  )
}

function MediaView({ devices }) {
  const mediaDevs = devices.filter(d => 
    d.spotify_sync_enabled === 1 || 
    d.weather_sync_enabled === 1 ||
    d.liveState?.info?.name?.toLowerCase().includes('wled-sr') ||
    d.liveState?.info?.audio
  )
  if (mediaDevs.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p className={styles.emptyTitle}>No Media Sync Active</p>
        <p className={styles.emptyBody}>Enable Spotify Sync or Weather Sync on a device to see it here.</p>
      </div>
    )
  }
  return (
    <section className={styles.grid}>
      {mediaDevs.map(d => <DeviceCard key={d.id} device={d} />)}
    </section>
  )
}

function FavoritesView({ devices }) {
  const favorites = useUIStore(s => s.favorites)
  const favDevs = devices.filter(d => favorites.includes(d.id))
  
  if (favDevs.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p className={styles.emptyTitle}>No Favorites Pinned</p>
        <p className={styles.emptyBody}>Click the options menu (•••) on any device card and select "Pin to Favorites".</p>
      </div>
    )
  }
  return (
    <section className={styles.grid}>
      {favDevs.map(d => <DeviceCard key={d.id} device={d} />)}
    </section>
  )
}
