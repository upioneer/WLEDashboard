import { useEffect, useState, useCallback, useMemo } from 'react'
import { useSpatialStore } from '../../stores/spatialStore.js'
import { useDeviceStore } from '../../stores/deviceStore.js'
import { useUIStore } from '../../stores/uiStore.js'
import { settingsApi } from '../../lib/api.js'
import { formatDimension, metersToDisplay, displayToMeters } from '../../lib/units.js'
import { SpatialCanvas } from './SpatialCanvas.jsx'
import { Slider } from '../../components/Slider/Slider.jsx'
import { Toggle } from '../../components/Toggle/Toggle.jsx'
import { extractDominantColor, wledBriToPct, pctToWledBri } from '../../lib/colors.js'
import styles from './SpatialView.module.css'

function SpatialSetupWizard({ onComplete }) {
  const { createDwelling, createFloor, addRoom } = useSpatialStore()
  const addToast = useUIStore(s => s.addToast)

  const [dwellingName, setDwellingName] = useState('Main House')
  const [floors, setFloors] = useState([{ name: 'Ground Floor', elevation: 0 }])
  const [rooms, setRooms] = useState([
    { name: 'Living Room', selected: true },
    { name: 'Kitchen', selected: true },
    { name: 'Bedroom', selected: true },
    { name: 'Bathroom', selected: false },
    { name: 'Garage', selected: false },
  ])
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGenerate = async (e) => {
    e.preventDefault()
    setIsGenerating(true)
    try {
      const dwelling = await createDwelling({ name: dwellingName })
      
      for (const floor of floors) {
        const createdFloor = await createFloor({
          dwelling_id: dwelling.id,
          name: floor.name,
          elevation: floor.elevation,
        })

        // Generate selected rooms on the ground floor (or first floor)
        if (floor.name === floors[0].name) {
          let offsetX = 0
          for (const room of rooms.filter(r => r.selected)) {
            await addRoom({
              floor_id: createdFloor.id,
              name: room.name,
              width: 5.0,
              depth: 4.0,
              position_x: offsetX,
              position_y: 0,
            })
            offsetX += 5.5
          }
        }
      }
      addToast({ message: 'Spatial layout generated!', type: 'success' })
      onComplete()
    } catch (err) {
      addToast({ message: 'Failed to generate layout', type: 'error' })
      setIsGenerating(false)
    }
  }

  return (
    <div className={styles.wizardOverlay}>
      <div className={styles.wizardModal}>
        <div className={styles.wizardGlow} aria-hidden />
        <h2 className={styles.wizardTitle}>3D Spatial Layout Setup</h2>
        <p className={styles.wizardSub}>Generate your initial property layout to place WLED lights in 3D space.</p>
        
        <form className={styles.wizardForm} onSubmit={handleGenerate}>
          <label className={styles.wizardLabel}>
            Property Name
            <input 
              className={styles.modalInput} 
              value={dwellingName} 
              onChange={e => setDwellingName(e.target.value)} 
              required 
            />
          </label>

          <label className={styles.wizardLabel}>
            Floors
            <div className={styles.wizardFloors}>
              {floors.map((f, i) => (
                <div key={i} className={styles.wizardFloorRow}>
                  <input
                    className={styles.modalInput}
                    value={f.name}
                    onChange={e => {
                      const nf = [...floors]
                      nf[i].name = e.target.value
                      setFloors(nf)
                    }}
                    required
                  />
                  {i > 0 && (
                    <button type="button" className={styles.deleteAnchorBtn} onClick={() => setFloors(floors.filter((_, idx) => idx !== i))}>✕</button>
                  )}
                </div>
              ))}
              <button 
                type="button" 
                className={styles.addBtn} 
                onClick={() => setFloors([...floors, { name: `Floor ${floors.length + 1}`, elevation: floors.length * 3 }])}
              >
                + Add Floor
              </button>
            </div>
          </label>

          <label className={styles.wizardLabel}>
            Generate Basic Rooms
            <div className={styles.wizardRoomsGrid}>
              {rooms.map((room, i) => (
                <label key={room.name} className={styles.wizardRoomToggle}>
                  <input
                    type="checkbox"
                    checked={room.selected}
                    onChange={e => {
                      const nr = [...rooms]
                      nr[i].selected = e.target.checked
                      setRooms(nr)
                    }}
                  />
                  {room.name}
                </label>
              ))}
            </div>
          </label>

          <button type="submit" className={styles.wizardSubmitBtn} disabled={isGenerating}>
            {isGenerating ? 'Generating...' : 'Build Layout'}
          </button>
        </form>
      </div>
    </div>
  )
}

export function SpatialView() {
  const {
    hierarchy, selectedRoomId, selectedAnchorId, loading, error,
    fetchHierarchy, selectRoom, selectAnchor, addRoom, updateRoom, removeRoom,
    addAnchor, updateAnchor, removeAnchor,
  } = useSpatialStore()

  const devices       = useDeviceStore(s => s.devices)
  const fetchDevices  = useDeviceStore(s => s.fetchDevices)
  const sendCommand   = useDeviceStore(s => s.sendCommand)
  const addToast      = useUIStore(s => s.addToast)

  const [unitSystem, setUnitSystem]         = useState('imperial')
  const [isAddingRoom, setIsAddingRoom]     = useState(false)
  const [editingRoom, setEditingRoom]       = useState(null)
  const [editingAnchor, setEditingAnchor]   = useState(null)
  const [newRoomName, setNewRoomName]       = useState('')
  const [isAddingAnchor, setIsAddingAnchor] = useState(false)
  const [newAnchorName, setNewAnchorName]   = useState('')
  const [newAnchorDevId, setNewAnchorDevId] = useState('')

  useEffect(() => {
    fetchHierarchy()
    fetchDevices()
    settingsApi.get().then(s => {
      if (s.unit_system) setUnitSystem(s.unit_system)
    }).catch(() => {})
  }, [fetchHierarchy, fetchDevices])

  // Flatten all rooms across dwellings and floors for quick lookup
  const allRooms = useMemo(() => {
    const list = []
    for (const d of hierarchy) {
      for (const f of d.floors || []) {
        for (const r of f.rooms || []) {
          list.push({ ...r, dwellingName: d.name, floorName: f.name })
        }
      }
    }
    return list
  }, [hierarchy])

  // Find selected room
  const selectedRoom = useMemo(() => {
    return allRooms.find(r => r.id === selectedRoomId) || null
  }, [allRooms, selectedRoomId])

  // All bound device IDs across all anchors
  const boundDeviceIds = useMemo(() => {
    const set = new Set()
    for (const r of allRooms) {
      for (const a of r.anchors || []) {
        if (a.device_id) set.add(a.device_id)
      }
    }
    return set
  }, [allRooms])

  // Devices that are not yet bound to any 3D room light anchor
  const unassignedDevices = useMemo(() => {
    return devices.filter(d => !boundDeviceIds.has(d.id))
  }, [devices, boundDeviceIds])

  // Target device bound to selected anchor or first anchor in selected room
  const activeAnchor = useMemo(() => {
    if (!selectedRoom) return null
    if (selectedAnchorId) return selectedRoom.anchors?.find(a => a.id === selectedAnchorId)
    return selectedRoom.anchors?.[0] || null
  }, [selectedRoom, selectedAnchorId])

  const boundDevice = useMemo(() => {
    if (!activeAnchor?.device_id) return null
    return devices.find(d => d.id === activeAnchor.device_id) || null
  }, [activeAnchor, devices])

  // Room Creation
  const handleCreateRoom = useCallback(async (e) => {
    e.preventDefault()
    if (!newRoomName.trim()) return
    const floorId = hierarchy[0]?.floors[0]?.id
    if (!floorId) return

    try {
      await addRoom({ floor_id: floorId, name: newRoomName.trim(), width: 5.0, depth: 4.0 })
      setNewRoomName('')
      setIsAddingRoom(false)
      addToast({ message: '3D Room created', type: 'success' })
    } catch {
      addToast({ message: 'Failed to create room', type: 'error' })
    }
  }, [hierarchy, newRoomName, addRoom, addToast])

  // Room Editing
  const handleStartEditRoom = useCallback((room) => {
    setEditingRoom({
      ...room,
      display_width: metersToDisplay(room.width, unitSystem),
      display_depth: metersToDisplay(room.depth, unitSystem),
    })
  }, [unitSystem])

  const handleSaveRoomEdit = useCallback(async (e) => {
    e.preventDefault()
    if (!editingRoom || !editingRoom.name.trim()) return

    const realWidthMeters = displayToMeters(editingRoom.display_width, unitSystem)
    const realDepthMeters = displayToMeters(editingRoom.display_depth, unitSystem)

    try {
      await updateRoom(editingRoom.id, {
        name: editingRoom.name.trim(),
        width: realWidthMeters,
        depth: realDepthMeters,
        position_x: Number(editingRoom.position_x),
        position_y: Number(editingRoom.position_y),
      })
      setEditingRoom(null)
      addToast({ message: 'Room dimensions updated', type: 'success' })
    } catch {
      addToast({ message: 'Failed to update room', type: 'error' })
    }
  }, [editingRoom, unitSystem, updateRoom, addToast])

  const handleDeleteRoom = useCallback(async (roomId) => {
    try {
      await removeRoom(roomId)
      setEditingRoom(null)
      if (selectedRoomId === roomId) selectRoom(null)
      addToast({ message: '3D Room deleted', type: 'success' })
    } catch {
      addToast({ message: 'Failed to delete room', type: 'error' })
    }
  }, [removeRoom, selectedRoomId, selectRoom, addToast])

  // Anchor Creation
  const handleCreateAnchor = useCallback(async (e) => {
    e.preventDefault()
    if (!newAnchorName.trim() || !selectedRoomId) return

    try {
      await addAnchor({
        room_id: selectedRoomId,
        device_id: newAnchorDevId || null,
        name: newAnchorName.trim(),
        type: 'strip_linear',
        offset_y: 1.2,
      })
      setNewAnchorName('')
      setNewAnchorDevId('')
      setIsAddingAnchor(false)
      addToast({ message: 'Light anchor added to 3D room', type: 'success' })
    } catch {
      addToast({ message: 'Failed to add anchor', type: 'error' })
    }
  }, [selectedRoomId, newAnchorName, newAnchorDevId, addAnchor, addToast])

  // Anchor 3D Position & Alignment Editing
  const handleStartEditAnchor = useCallback((anchor) => {
    setEditingAnchor({
      ...anchor,
      display_offset_x: metersToDisplay(anchor.offset_x || 0, unitSystem),
      display_offset_y: metersToDisplay(anchor.offset_y || 1.2, unitSystem),
      display_offset_z: metersToDisplay(anchor.offset_z || 0, unitSystem),
      display_length: metersToDisplay(anchor.length || 3.5, unitSystem),
      rotation_y: anchor.rotation_y || 0,
    })
  }, [unitSystem])

  const handleSaveAnchorEdit = useCallback(async (e) => {
    e.preventDefault()
    if (!editingAnchor || !editingAnchor.name.trim()) return

    const realOffsetX = displayToMeters(editingAnchor.display_offset_x, unitSystem)
    const realOffsetY = displayToMeters(editingAnchor.display_offset_y, unitSystem)
    const realOffsetZ = displayToMeters(editingAnchor.display_offset_z, unitSystem)
    const realLength  = displayToMeters(editingAnchor.display_length, unitSystem)

    try {
      await updateAnchor(editingAnchor.id, {
        name: editingAnchor.name.trim(),
        offset_x: realOffsetX,
        offset_y: realOffsetY,
        offset_z: realOffsetZ,
        length: realLength,
        rotation_y: Number(editingAnchor.rotation_y || 0),
      })
      setEditingAnchor(null)
      addToast({ message: 'Light position & 3D alignment updated', type: 'success' })
    } catch {
      addToast({ message: 'Failed to update light anchor position', type: 'error' })
    }
  }, [editingAnchor, unitSystem, updateAnchor, addToast])

  // Move Anchor to Another Room
  const handleMoveAnchorToRoom = useCallback(async (anchor, targetRoomId) => {
    if (!targetRoomId || targetRoomId === anchor.room_id) return

    try {
      await updateAnchor(anchor.id, { room_id: targetRoomId })
      addToast({ message: `Moved "${anchor.name}" to target room`, type: 'success' })
    } catch {
      addToast({ message: 'Failed to move anchor to room', type: 'error' })
    }
  }, [updateAnchor, addToast])

  // Quick Assign Unassigned Device to Room
  const handleAssignDeviceToRoom = useCallback(async (dev, targetRoomId) => {
    if (!targetRoomId) return

    try {
      await addAnchor({
        room_id: targetRoomId,
        device_id: dev.id,
        name: `${dev.name} Strip`,
        type: 'strip_linear',
        offset_y: 1.2,
      })
      addToast({ message: `Assigned "${dev.name}" to room`, type: 'success' })
    } catch {
      addToast({ message: 'Failed to assign device to room', type: 'error' })
    }
  }, [addAnchor, addToast])

  // Device Binding
  const handleBindDevice = useCallback(async (anchorId, devId) => {
    try {
      await updateAnchor(anchorId, { device_id: devId || null })
      addToast({ message: 'Device bound to 3D light anchor', type: 'success' })
    } catch {
      addToast({ message: 'Failed to bind device', type: 'error' })
    }
  }, [updateAnchor, addToast])

  if (loading) return <SpatialSkeleton />
  if (error)   return <SpatialError message={error} onRetry={fetchHierarchy} />

  if (hierarchy.length === 0) {
    return (
      <main className={styles.page} id="main-content">
        <SpatialSetupWizard onComplete={fetchHierarchy} />
      </main>
    )
  }

  return (
    <main className={styles.page} id="main-content">
      {/* 3D Canvas Viewport */}
      <div className={styles.viewportWrapper}>
        <SpatialCanvas />

        {/* Floating Controls Overlay */}
        {selectedRoom && (
          <div
            className={styles.floatingPanel}
            onPointerDown={e => e.stopPropagation()}
            onMouseDown={e => e.stopPropagation()}
          >
            <div className={styles.floatingHeader}>
              <div className={styles.floatingHeaderMeta}>
                <h3 className={styles.floatingTitle}>{selectedRoom.name}</h3>
                <span className={styles.floatingSub}>
                  {selectedRoom.dwellingName} • {selectedRoom.floorName} ({formatDimension(selectedRoom.width, unitSystem)} × {formatDimension(selectedRoom.depth, unitSystem)})
                </span>
              </div>
              <div className={styles.floatingHeaderBtns}>
                <button
                  className={styles.editRoomBtn}
                  onClick={() => handleStartEditRoom(selectedRoom)}
                  title="Edit room dimensions and position"
                >
                  Edit Room
                </button>
                <button className={styles.closeBtn} onClick={() => selectRoom(null)} title="Close room overlay">✕</button>
              </div>
            </div>

            {/* Render interactive controls for bound WLED instances */}
            {((selectedRoom.anchors || []).filter(a => a.device_id).map(a => devices.find(d => d.id === a.device_id)).filter(Boolean)).length > 0 ? (
              <div className={styles.deviceControlsList}>
                {((selectedRoom.anchors || []).filter(a => a.device_id).map(a => devices.find(d => d.id === a.device_id)).filter(Boolean)).map(dev => {
                  const isOn = dev.liveState?.on !== undefined ? Boolean(dev.liveState.on) : true
                  const briPct = wledBriToPct(dev.liveState?.bri ?? 255)
                  const dominantColor = extractDominantColor(dev.liveState)

                  return (
                    <div key={dev.id} className={styles.deviceControlItem}>
                      <div className={styles.controlRow}>
                        <div className={styles.devNameGroup}>
                          <span className={[styles.statusDot, dev.is_online ? styles.dotOnline : styles.dotOffline].join(' ')} />
                          <span className={styles.devName}>{dev.name}</span>
                        </div>
                        <Toggle
                          id={`spatial-toggle-${dev.id}`}
                          checked={isOn}
                          onChange={on => {
                            const currentBri = dev.liveState?.bri ?? 0
                            if (on && (currentBri <= 0 || currentBri < 13)) {
                              sendCommand(dev.id, { on: true, bri: 128, lor: 0, seg: [{ id: 0, bri: 128 }] })
                            } else {
                              sendCommand(dev.id, { on, lor: 0 })
                            }
                          }}
                        />
                      </div>

                      <Slider
                        id={`spatial-bri-${dev.id}`}
                        value={briPct}
                        onChange={pct => {
                          const wledBri = pctToWledBri(pct)
                          sendCommand(dev.id, { bri: wledBri, on: pct > 0, lor: 0, seg: [{ id: 0, bri: wledBri }] })
                        }}
                        onCommit={pct => {
                          const wledBri = pctToWledBri(pct)
                          sendCommand(dev.id, { bri: wledBri, on: pct > 0, lor: 0, seg: [{ id: 0, bri: wledBri }] })
                        }}
                        color={dominantColor}
                        label="Brightness"
                      />
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className={styles.unboundHint}>No WLED device bound to this 3D room light anchor.</p>
            )}
          </div>
        )}

        {/* 3D Navigation Controls Legend Overlay */}
        <div className={styles.navLegend}>
          <div className={styles.legendTitle}>3D Navigation Controls</div>
          <div className={styles.legendRow}>
            <span className={styles.legendKey}>Rotate 3D Scene</span>
            <span className={styles.legendAction}>Left Click + Drag</span>
          </div>
          <div className={styles.legendRow}>
            <span className={styles.legendKey}>Pan Camera</span>
            <span className={styles.legendAction}>Right Click + Drag</span>
          </div>
          <div className={styles.legendRow}>
            <span className={styles.legendKey}>Zoom View</span>
            <span className={styles.legendAction}>Scroll / Pinch</span>
          </div>
          <div className={styles.legendRow}>
            <span className={styles.legendKey}>Select Room</span>
            <span className={styles.legendAction}>Click 3D Room Floor</span>
          </div>
        </div>
      </div>

      {/* Side Editor Panel */}
      <aside className={styles.sidePanel}>
        <div className={styles.panelHeader}>
          <h2 className={styles.panelTitle}>Spatial Hierarchy</h2>
          <button className={styles.addBtn} onClick={() => setIsAddingRoom(true)}>+ Add Room</button>
        </div>

        <div className={styles.tree}>
          {/* Unassigned WLED Devices Section */}
          {unassignedDevices.length > 0 && (
            <div className={styles.unassignedSection}>
              <div className={styles.unassignedTitle}>
                Unassigned WLED Instances ({unassignedDevices.length})
              </div>
              <div className={styles.unassignedList}>
                {unassignedDevices.map(dev => (
                  <div key={dev.id} className={styles.unassignedRow}>
                    <span className={styles.unassignedName} title={dev.name}>{dev.name}</span>
                    <select
                      className={styles.assignSelect}
                      onChange={e => handleAssignDeviceToRoom(dev, e.target.value)}
                      defaultValue=""
                    >
                      <option value="" disabled>Move to room...</option>
                      {allRooms.map(r => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dwellings -> Floors -> Rooms Tree */}
          {hierarchy.map(dwelling => (
            <div key={dwelling.id} className={styles.dwellingGroup}>
              <div className={styles.dwellingName}>{dwelling.name}</div>

              {(dwelling.floors || []).map(floor => (
                <div key={floor.id} className={styles.floorGroup}>
                  <div className={styles.floorName}>{floor.name}</div>

                  <div className={styles.roomList}>
                    {(floor.rooms || []).map(room => {
                      const isSelected = selectedRoomId === room.id
                      return (
                        <div key={room.id} className={styles.roomBlock}>
                          <div
                            className={[styles.roomItem, isSelected && styles.roomItemActive].filter(Boolean).join(' ')}
                            onClick={() => selectRoom(room.id)}
                          >
                            <div className={styles.roomMeta}>
                              <span className={styles.roomName}>{room.name}</span>
                              <span className={styles.roomDim}>
                                {formatDimension(room.width, unitSystem)} × {formatDimension(room.depth, unitSystem)}
                              </span>
                            </div>

                            <button
                              className={styles.miniEditRoomBtn}
                              onClick={(e) => { e.stopPropagation(); handleStartEditRoom(room) }}
                              title="Edit room"
                            >
                              Edit
                            </button>
                          </div>

                          {/* Light Anchors list inside selected room */}
                          {isSelected && (
                            <div className={styles.anchorSection}>
                              <div className={styles.anchorHeader}>
                                <span>3D Light Anchors</span>
                                <button className={styles.miniAddBtn} onClick={() => setIsAddingAnchor(true)}>+ Anchor</button>
                              </div>

                              {(room.anchors || []).map(anchor => (
                                <div key={anchor.id} className={styles.anchorRow}>
                                  <span className={styles.anchorName}>{anchor.name}</span>

                                  {/* Device binding dropdown */}
                                  <select
                                    value={anchor.device_id || ''}
                                    onChange={e => handleBindDevice(anchor.id, e.target.value)}
                                    className={styles.deviceSelect}
                                    title="Bound WLED device"
                                  >
                                    <option value="">Unbound</option>
                                    {devices.map(d => (
                                      <option key={d.id} value={d.id}>
                                        {d.name}
                                      </option>
                                    ))}
                                  </select>

                                  {/* Move to another room dropdown */}
                                  <select
                                    value={room.id}
                                    onChange={e => handleMoveAnchorToRoom(anchor, e.target.value)}
                                    className={styles.moveRoomSelect}
                                    title="Move device/anchor to another room"
                                  >
                                    {allRooms.map(r => (
                                      <option key={r.id} value={r.id}>
                                        {r.id === room.id ? 'This Room' : `Move: ${r.name}`}
                                      </option>
                                    ))}
                                  </select>

                                  <button
                                    className={styles.alignAnchorBtn}
                                    onClick={() => handleStartEditAnchor(anchor)}
                                    title="Position, height elevation, & 3D rotation alignment"
                                  >
                                    Align 3D
                                  </button>

                                  <button
                                    className={styles.deleteAnchorBtn}
                                    onClick={() => removeAnchor(anchor.id)}
                                    title="Delete anchor"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </aside>

      {/* Add Room Modal */}
      {isAddingRoom && (
        <div className={styles.modalOverlay} onClick={() => setIsAddingRoom(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h3>Add 3D Room</h3>
            <form onSubmit={handleCreateRoom}>
              <input
                type="text"
                value={newRoomName}
                onChange={e => setNewRoomName(e.target.value)}
                placeholder="e.g. Master Bedroom"
                className={styles.modalInput}
                autoFocus
                required
              />
              <div className={styles.modalFooter}>
                <button type="button" className={styles.cancelBtn} onClick={() => setIsAddingRoom(false)}>Cancel</button>
                <button type="submit" className={styles.saveBtn}>Create Room</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Room Modal */}
      {editingRoom && (
        <div className={styles.modalOverlay} onClick={() => setEditingRoom(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h3>Edit 3D Room</h3>
            <form onSubmit={handleSaveRoomEdit}>
              <label className={styles.modalLabel}>
                Room Name
                <input
                  type="text"
                  value={editingRoom.name}
                  onChange={e => setEditingRoom({ ...editingRoom, name: e.target.value })}
                  className={styles.modalInput}
                  required
                />
              </label>

              <div className={styles.modalGrid}>
                <label className={styles.modalLabel}>
                  Width ({unitSystem === 'imperial' ? 'feet' : 'meters'})
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="100"
                    value={editingRoom.display_width}
                    onChange={e => setEditingRoom({ ...editingRoom, display_width: e.target.value })}
                    className={styles.modalInput}
                  />
                </label>
                <label className={styles.modalLabel}>
                  Depth ({unitSystem === 'imperial' ? 'feet' : 'meters'})
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="100"
                    value={editingRoom.display_depth}
                    onChange={e => setEditingRoom({ ...editingRoom, display_depth: e.target.value })}
                    className={styles.modalInput}
                  />
                </label>
              </div>

              <div className={styles.modalGrid}>
                <label className={styles.modalLabel}>
                  Position X
                  <input
                    type="number"
                    step="0.5"
                    value={editingRoom.position_x}
                    onChange={e => setEditingRoom({ ...editingRoom, position_x: e.target.value })}
                    className={styles.modalInput}
                  />
                </label>
                <label className={styles.modalLabel}>
                  Position Y
                  <input
                    type="number"
                    step="0.5"
                    value={editingRoom.position_y}
                    onChange={e => setEditingRoom({ ...editingRoom, position_y: e.target.value })}
                    className={styles.modalInput}
                  />
                </label>
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.deleteBtn}
                  onClick={() => handleDeleteRoom(editingRoom.id)}
                >
                  Delete Room
                </button>
                <button type="button" className={styles.cancelBtn} onClick={() => setEditingRoom(null)}>Cancel</button>
                <button type="submit" className={styles.saveBtn}>Save Room</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Anchor Modal */}
      {isAddingAnchor && (
        <div className={styles.modalOverlay} onClick={() => setIsAddingAnchor(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h3>Add 3D Light Anchor</h3>
            <form onSubmit={handleCreateAnchor}>
              <input
                type="text"
                value={newAnchorName}
                onChange={e => setNewAnchorName(e.target.value)}
                placeholder="e.g. Ceiling Perimeter Strip"
                className={styles.modalInput}
                autoFocus
                required
              />
              <label className={styles.modalLabel}>
                Bind WLED Device (Optional)
                <select
                  value={newAnchorDevId}
                  onChange={e => setNewAnchorDevId(e.target.value)}
                  className={styles.modalSelect}
                >
                  <option value="">None (Unbound)</option>
                  {devices.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </label>

              <div className={styles.modalFooter}>
                <button type="button" className={styles.cancelBtn} onClick={() => setIsAddingAnchor(false)}>Cancel</button>
                <button type="submit" className={styles.saveBtn}>Add Anchor</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Anchor 3D Position & Alignment Modal */}
      {editingAnchor && (
        <div className={styles.modalOverlay} onClick={() => setEditingAnchor(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h3>3D Light Positioning & Alignment</h3>
            <form onSubmit={handleSaveAnchorEdit}>
              <label className={styles.modalLabel}>
                Anchor Name
                <input
                  type="text"
                  value={editingAnchor.name}
                  onChange={e => setEditingAnchor({ ...editingAnchor, name: e.target.value })}
                  className={styles.modalInput}
                  required
                />
              </label>

              {/* Quick Height Placement Presets */}
              <div className={styles.presetGroup}>
                <span className={styles.presetTitle}>Height Presets:</span>
                <div className={styles.presetButtons}>
                  <button
                    type="button"
                    className={styles.presetBtn}
                    onClick={() => setEditingAnchor({
                      ...editingAnchor,
                      display_offset_y: metersToDisplay(2.4, unitSystem),
                      rotation_y: 0,
                    })}
                  >
                    Ceiling ({unitSystem === 'imperial' ? '8 ft' : '2.4 m'})
                  </button>
                  <button
                    type="button"
                    className={styles.presetBtn}
                    onClick={() => setEditingAnchor({
                      ...editingAnchor,
                      display_offset_y: metersToDisplay(1.2, unitSystem),
                      rotation_y: 0,
                    })}
                  >
                    Wall Mid ({unitSystem === 'imperial' ? '4 ft' : '1.2 m'})
                  </button>
                  <button
                    type="button"
                    className={styles.presetBtn}
                    onClick={() => setEditingAnchor({
                      ...editingAnchor,
                      display_offset_y: metersToDisplay(0.1, unitSystem),
                      rotation_y: 0,
                    })}
                  >
                    Floor ({unitSystem === 'imperial' ? '0.3 ft' : '0.1 m'})
                  </button>
                </div>
              </div>

              <div className={styles.modalGrid}>
                <label className={styles.modalLabel}>
                  Height Y ({unitSystem === 'imperial' ? 'ft' : 'm'})
                  <input
                    type="number"
                    step="0.1"
                    value={editingAnchor.display_offset_y}
                    onChange={e => setEditingAnchor({ ...editingAnchor, display_offset_y: e.target.value })}
                    className={styles.modalInput}
                  />
                </label>
                <label className={styles.modalLabel}>
                  Strip Length ({unitSystem === 'imperial' ? 'ft' : 'm'})
                  <input
                    type="number"
                    step="0.1"
                    value={editingAnchor.display_length}
                    onChange={e => setEditingAnchor({ ...editingAnchor, display_length: e.target.value })}
                    className={styles.modalInput}
                  />
                </label>
              </div>

              <div className={styles.modalGrid}>
                <label className={styles.modalLabel}>
                  Left / Right X ({unitSystem === 'imperial' ? 'ft' : 'm'})
                  <input
                    type="number"
                    step="0.1"
                    value={editingAnchor.display_offset_x}
                    onChange={e => setEditingAnchor({ ...editingAnchor, display_offset_x: e.target.value })}
                    className={styles.modalInput}
                  />
                </label>
                <label className={styles.modalLabel}>
                  Front / Back Z ({unitSystem === 'imperial' ? 'ft' : 'm'})
                  <input
                    type="number"
                    step="0.1"
                    value={editingAnchor.display_offset_z}
                    onChange={e => setEditingAnchor({ ...editingAnchor, display_offset_z: e.target.value })}
                    className={styles.modalInput}
                  />
                </label>
              </div>

              <label className={styles.modalLabel}>
                Rotation Angle (Degrees: {editingAnchor.rotation_y || 0}°)
                <input
                  type="range"
                  min="0"
                  max="360"
                  step="15"
                  value={editingAnchor.rotation_y || 0}
                  onChange={e => setEditingAnchor({ ...editingAnchor, rotation_y: Number(e.target.value) })}
                  className={styles.rotationSlider}
                />
              </label>

              <div className={styles.modalFooter}>
                <button type="button" className={styles.cancelBtn} onClick={() => setEditingAnchor(null)}>Cancel</button>
                <button type="submit" className={styles.saveBtn}>Save Position</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}

function SpatialSkeleton() {
  return (
    <main className={styles.page} aria-busy="true">
      <div className={styles.viewportWrapper}>
        <div className={styles.skeletonCanvas} />
      </div>
    </main>
  )
}

function SpatialError({ message, onRetry }) {
  return (
    <main className={styles.page}>
      <div className={styles.errorBox}>
        <p>Error loading 3D Spatial Hierarchy: {message}</p>
        <button className={styles.saveBtn} onClick={onRetry}>Retry</button>
      </div>
    </main>
  )
}
