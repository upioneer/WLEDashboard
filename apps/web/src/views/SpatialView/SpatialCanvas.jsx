import { useRef, useState, useMemo, useEffect, useCallback } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Html, ContactShadows, TransformControls } from '@react-three/drei'
import * as THREE from 'three'
import { useDeviceStore } from '../../stores/deviceStore.js'
import { useSpatialStore } from '../../stores/spatialStore.js'
import { extractDominantColor, wledBriToPct, pctToWledBri } from '../../lib/colors.js'
import styles from './SpatialView.module.css'

// ─── 3D Light Strip Mesh Component ────────────────────────────────────────────

function LightStripMesh({ anchor, room }) {
  const devices = useDeviceStore(s => s.devices)
  const sendCommand = useDeviceStore(s => s.sendCommand)
  const { snapToGrid, selectedAnchorId, selectAnchor, updateAnchor } = useSpatialStore()
  
  const isSelected = selectedAnchorId === anchor.id
  const groupRef = useRef(null)
  const transformRef = useRef(null)

  const device = devices.find(d => d.id === anchor.device_id)
  const isOnline = device?.is_online === 1
  const isOn = device?.liveState?.on && isOnline

  // Dominant color hex string
  const colorHex = useMemo(() => {
    if (!isOn || !device) return '#333344'
    return extractDominantColor(device.liveState) || '#8b5cf6'
  }, [isOn, device])

  // Normalize brightness intensity (0.0 to 3.0)
  const intensity = useMemo(() => {
    if (!isOn || !device) return 0.1
    const pct = wledBriToPct(device.liveState?.bri ?? 255)
    return Math.max(0.2, (pct / 100) * 2.8)
  }, [isOn, device])

  const meshRef = useRef(null)
  const lightRef = useRef(null)

  const type = anchor.type || 'line_horizontal'
  
  // Cap strip length strictly to room bounds
  const maxAllowedDim = Math.min(room.width || 4, room.depth || 4) * 0.95
  const stripLength = Math.min(anchor.length || ((room.width || 4) * 0.7), maxAllowedDim)
  
  // Calculate bounding padding to keep it inside walls
  const boundsPad = stripLength / 2
  const halfW = (room.width || 4) / 2
  const halfD = (room.depth || 4) / 2
  
  const clampedX = Math.max(-halfW + boundsPad, Math.min(halfW - boundsPad, anchor.offset_x || 0))
  const clampedZ = Math.max(-halfD + boundsPad, Math.min(halfD - boundsPad, anchor.offset_z || 0))
  const clampedY = Math.max(0.05, Math.min(2.75, anchor.offset_y || 1.2))

  // Position is relative to the room's group coordinate system
  const posX = clampedX
  const posY = clampedY
  const posZ = clampedZ

  // Pulsing animation for active light strips
  useFrame(({ clock }) => {
    if (meshRef.current && isOn) {
      const pulse = Math.sin(clock.getElapsedTime() * 2) * 0.08
      meshRef.current.material.emissiveIntensity = intensity + pulse
    }
  })

  const rotationYRad = ((anchor.rotation_y || 0) * Math.PI) / 180

  // Shape rendering logic
  let geometryNode = <boxGeometry args={[stripLength, 0.08, 0.08]} />
  let meshRotation = [0, 0, 0]
  let meshScale = [1, 1, 1]

  if (type === 'line_vertical') {
    geometryNode = <boxGeometry args={[0.08, stripLength, 0.08]} />
  } else if (type === 'circle') {
    geometryNode = <torusGeometry args={[stripLength / (2 * Math.PI), 0.04, 16, 64]} />
    meshRotation = [Math.PI / 2, 0, 0]
  } else if (type === 'square') {
    geometryNode = <torusGeometry args={[stripLength / 4, 0.04, 4, 4]} />
    meshRotation = [Math.PI / 2, 0, Math.PI / 4]
  } else if (type === 'rectangle_horizontal') {
    geometryNode = <torusGeometry args={[stripLength / 4, 0.04, 4, 4]} />
    meshRotation = [Math.PI / 2, 0, Math.PI / 4]
    meshScale = [1.5, 1.5, 0.5]
  } else if (type === 'rectangle_vertical') {
    geometryNode = <torusGeometry args={[stripLength / 4, 0.04, 4, 4]} />
    meshRotation = [0, 0, Math.PI / 4]
    meshScale = [0.5, 1.5, 1.5]
  }

  const handleDragEnd = useCallback(() => {
    if (groupRef.current) {
      const pos = groupRef.current.position
      // Clamp to bounds to prevent dragging through walls
      const clampedX = Math.max(-halfW + boundsPad, Math.min(halfW - boundsPad, pos.x))
      const clampedZ = Math.max(-halfD + boundsPad, Math.min(halfD - boundsPad, pos.z))
      const clampedY = Math.max(0.05, Math.min(2.75, pos.y))
      
      updateAnchor(anchor.id, {
        offset_x: clampedX,
        offset_y: clampedY,
        offset_z: clampedZ
      }).catch(console.error)
    }
  }, [anchor.id, halfW, halfD, boundsPad, updateAnchor])

  useEffect(() => {
    const controls = transformRef.current
    if (controls) {
      const onChange = () => {
        if (groupRef.current) {
          const pos = groupRef.current.position
          pos.x = Math.max(-halfW + boundsPad, Math.min(halfW - boundsPad, pos.x))
          pos.z = Math.max(-halfD + boundsPad, Math.min(halfD - boundsPad, pos.z))
          pos.y = Math.max(0.05, Math.min(2.75, pos.y))
        }
      }
      
      const onDraggingChanged = (event) => {
        if (!event.value) {
          // Dragging finished
          handleDragEnd()
        }
      }
      
      controls.addEventListener('change', onChange)
      controls.addEventListener('dragging-changed', onDraggingChanged)
      return () => {
        controls.removeEventListener('change', onChange)
        controls.removeEventListener('dragging-changed', onDraggingChanged)
      }
    }
  }, [isSelected, handleDragEnd, halfW, halfD, boundsPad])

  return (
    <>
      {/* 3D Drag Handles when selected */}
      {isSelected && (
        <TransformControls 
          ref={transformRef}
          object={groupRef}
          mode="translate" 
          translationSnap={snapToGrid ? 0.5 : null} 
        />
      )}

      <group 
        ref={groupRef}
        position={[posX, posY, posZ]}
        rotation={[0, rotationYRad, 0]}
      >
        <mesh
          ref={meshRef}
          onClick={(e) => { e.stopPropagation(); selectAnchor(anchor.id) }}
          onPointerOver={() => { document.body.style.cursor = 'pointer' }}
          onPointerOut={() => { document.body.style.cursor = 'default' }}
          rotation={meshRotation}
          scale={meshScale}
        >
          {geometryNode}
          <meshStandardMaterial
            color={colorHex}
            emissive={colorHex}
            emissiveIntensity={intensity}
            roughness={0.2}
            metalness={0.8}
          />
        </mesh>
        
        {/* Real-time Point Light Emission */}
        {isOn && (
          <pointLight
            ref={lightRef}
            color={colorHex}
            intensity={intensity * 4.0}
            distance={room.width * 1.5}
            decay={2}
          />
        )}

        {/* 3D Label & Quick Control Badge */}
        <Html position={[0, 0.3, 0]} center distanceFactor={12} zIndexRange={[10, 0]}>
          <div
            className={[
              styles.stripBadge,
              isSelected && styles.stripBadgeSelected,
              isOn && styles.stripBadgeActive,
            ].filter(Boolean).join(' ')}
            onClick={(e) => { e.stopPropagation(); selectAnchor(anchor.id) }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <span className={[styles.badgeDot, isOnline ? (isOn ? styles.dotActive : styles.dotOnline) : styles.dotOffline].join(' ')} />
            <span className={styles.badgeName}>{anchor.name}</span>
            {device && (
              <span className={styles.badgeState}>
                {isOn ? `${Math.round(wledBriToPct(device.liveState?.bri ?? 0))}%` : 'OFF'}
              </span>
            )}
          </div>
        </Html>
      </group>
    </>
  )
}

// ─── 3D Room Box Geometry Component ───────────────────────────────────────────

function RoomBox({ room, isSelected, onSelect }) {
  const width = room.width || 4.0
  const depth = room.depth || 4.0
  const height = 2.8
  const posX = room.position_x || 0
  const posZ = room.position_y || 0

  return (
    <group position={[posX, 0, posZ]} onClick={(e) => { e.stopPropagation(); onSelect(room.id) }}>
      {/* Floor Plane */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial
          color={isSelected ? '#1a1f36' : '#12141d'}
          roughness={0.9}
          metalness={0.1}
        />
      </mesh>

      {/* Wireframe Walls */}
      <lineSegments position={[0, height / 2, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry(width, height, depth)]} />
        <lineBasicMaterial color={isSelected ? '#8b5cf6' : '#2d3348'} linewidth={2} />
      </lineSegments>

      {/* Room Name Badge */}
      <Html position={[0, 0.1, depth / 2 - 0.4]} center distanceFactor={15} zIndexRange={[10, 0]}>
        <div className={[styles.roomLabel, isSelected && styles.roomLabelSelected].filter(Boolean).join(' ')}>
          {room.name}
        </div>
      </Html>

      {/* Anchored Light Strips */}
      {(room.anchors || []).map(anchor => (
        <LightStripMesh
          key={anchor.id}
          anchor={anchor}
          room={room}
        />
      ))}
    </group>
  )
}

// ─── Main 3D Viewport Component ───────────────────────────────────────────────

export function SpatialCanvas() {
  const { hierarchy, selectedRoomId, selectRoom, selectAnchor } = useSpatialStore()

  // Flatten all rooms across dwellings and floors
  const allRooms = useMemo(() => {
    const list = []
    for (const dwelling of hierarchy) {
      for (const floor of dwelling.floors || []) {
        for (const room of floor.rooms || []) {
          list.push(room)
        }
      }
    }
    return list
  }, [hierarchy])

  return (
    <div className={styles.canvasContainer}>
      <Canvas
        camera={{ position: [0, 8, 12], fov: 45 }}
        gl={{ antialias: true }}
      >
        {/* Ambient & Directional Lighting */}
        <ambientLight intensity={0.4} />
        <directionalLight position={[10, 15, 10]} intensity={0.6} castShadow />

        {/* Ground Grid */}
        <gridHelper args={[40, 40, '#2d3348', '#1a1d29']} position={[0, 0, 0]} />

        {/* Contact Shadow for Depth */}
        <ContactShadows position={[0, 0, 0]} opacity={0.5} scale={40} blur={2.5} far={10} />

        {/* 3D Rooms */}
        {allRooms.map(room => (
          <RoomBox
            key={room.id}
            room={room}
            isSelected={selectedRoomId === room.id}
            onSelect={(id) => selectRoom(id)}
          />
        ))}

        {/* Smooth Orbit Camera Controls */}
        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.08}
          minDistance={3}
          maxDistance={30}
          maxPolarAngle={Math.PI / 2.1}
        />
      </Canvas>
    </div>
  )
}
