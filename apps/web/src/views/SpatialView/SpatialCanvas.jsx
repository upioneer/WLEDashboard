import { useRef, useState, useMemo, useEffect, useCallback, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Html, ContactShadows, TransformControls, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { useDeviceStore } from '../../stores/deviceStore.js'
import { useSpatialStore } from '../../stores/spatialStore.js'
import { extractDominantColor, wledBriToPct, pctToWledBri } from '../../lib/colors.js'
import styles from './SpatialView.module.css'

// ─── Holographic Intro Component ──────────────────────────────────────────────

function HolographicIntro({ onComplete, sceneRef, unitSystem }) {
  const colorMap = useTexture('/earth-night.jpg')
  const [start] = useState(() => Date.now())
  const [latLng, setLatLng] = useState([37.7749, -122.4194])
  const globeRef = useRef(null)
  const altRef = useRef(null)

  useEffect(() => {
    import('../../lib/api.js').then(({ settingsApi }) => {
      settingsApi.get().then(s => {
        if (s.latitude && s.longitude) setLatLng([parseFloat(s.latitude), parseFloat(s.longitude)])
      })
    })
  }, [])

  const pingVec = useMemo(() => {
    const [lat, lng] = latLng
    const R = 30 // Much larger globe for a flatter surface effect
    const phi = (90 - lat) * (Math.PI / 180)
    const theta = (lng + 180) * (Math.PI / 180)
    return new THREE.Vector3(
      -(R * Math.sin(phi) * Math.cos(theta)),
      (R * Math.cos(phi)),
      (R * Math.sin(phi) * Math.sin(theta))
    )
  }, [latLng])

  const targetQuat = useMemo(() => {
    const topVec = new THREE.Vector3(0, 1, 0) // We want the ping to be exactly at the top of the globe
    const pVec = pingVec.clone().normalize()
    return new THREE.Quaternion().setFromUnitVectors(pVec, topVec)
  }, [pingVec])

  useFrame((state) => {
    const elapsed = (Date.now() - start) / 1000
    const duration = 4.0 // 4 second intro
    
    if (elapsed >= duration) {
       onComplete()
       return
    }

    const progress = Math.min(elapsed / 3.0, 1.0)
    // Cubic ease in-out
    const ease = progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2
    
    // Camera zooms from far out [0, 60, 80] to [0, 8, 12]
    state.camera.position.lerpVectors(
      new THREE.Vector3(0, 60, 80),
      new THREE.Vector3(0, 8, 12),
      ease
    )
    state.camera.lookAt(0, 0, 0)
    
    if (globeRef.current) {
      // Globe expands slightly and fades out at the very end
      const globeScale = 1.0 + (Math.max(0, ease - 0.8) * 0.5)
      globeRef.current.scale.set(globeScale, globeScale, globeScale)
      
      // Spin the globe around the world Y-axis so the ping stays perfectly locked at [0, 0, 0]
      const spinQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.pow(1 - ease, 1.5) * Math.PI * 4)
      globeRef.current.quaternion.copy(targetQuat).premultiply(spinQuat)
      
      const fadeProgress = Math.max(0, (elapsed - 2.8) / 1.0) // Fade very late
      const opacity = 1.0 - Math.min(fadeProgress, 1.0)
      
      if (altRef.current) {
        const maxAlt = unitSystem === 'imperial' ? 22000 : 35000
        const currentAlt = Math.max(0, Math.floor(maxAlt * (1 - ease)))
        const unit = unitSystem === 'imperial' ? 'MI' : 'KM'
        altRef.current.innerText = `ALT: ${currentAlt.toLocaleString()} ${unit}`
        altRef.current.style.opacity = opacity
      }
      
      // Iterate materials and adjust opacity
      globeRef.current.traverse((child) => {
        if (child.isMesh && child.material) {
          child.material.opacity = (child.userData.baseOpacity || 1.0) * opacity
          child.material.transparent = true
        }
      })
      
      // Reveal floorplan as globe fades
      if (sceneRef.current) {
        if (fadeProgress > 0) {
          sceneRef.current.visible = true
          // Smooth scale up
          const scale = 0.01 + (Math.min(fadeProgress, 1.0) * 0.99)
          sceneRef.current.scale.set(scale, scale, scale)
        } else {
          sceneRef.current.visible = false
        }
      }
    }
  })

  return (
    <>
    <group ref={globeRef} position={[0, -30, 0]}>
      {/* Intro Lighting (isolated from the main scene) */}
      <ambientLight intensity={1.5} />
      <directionalLight position={[-10, 20, 10]} intensity={1.0} />

      {/* Earth Texture Sphere */}
      <mesh userData={{ baseOpacity: 1.0 }} rotation={[0, -Math.PI / 2, 0]}>
        <sphereGeometry args={[29.8, 64, 64]} />
        <meshStandardMaterial 
          map={colorMap} 
          transparent 
          opacity={1.0} 
          emissive="#ffffff"
          emissiveMap={colorMap}
          emissiveIntensity={0.8}
          roughness={0.8}
        />
      </mesh>
      
      {/* Outer Wireframe Atmosphere */}
      <mesh userData={{ baseOpacity: 0.15 }}>
        <sphereGeometry args={[30.1, 64, 64]} />
        <meshBasicMaterial color="#38bdf8" wireframe transparent opacity={0.15} />
      </mesh>
      
      {/* Geolocation Ping */}
      <group position={[pingVec.x, pingVec.y, pingVec.z]}>
        <mesh userData={{ baseOpacity: 1.0 }}>
          <sphereGeometry args={[0.4, 16, 16]} />
          <meshBasicMaterial color="#ef4444" transparent opacity={1.0} />
        </mesh>
        <pointLight color="#ef4444" intensity={3} distance={20} />
      </group>
    </group>
    
    {/* Altimeter HUD Overlay (Detached from spinning globe) */}
    <Html position={[0, 0, 0]} center zIndexRange={[100, 0]}>
      <div style={{
        transform: 'translateY(-25vh)',
        color: '#38bdf8',
        fontFamily: 'monospace',
        fontSize: '2rem',
        fontWeight: 'bold',
        letterSpacing: '3px',
        textShadow: '0 0 15px rgba(56, 189, 248, 0.9)',
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.25rem'
      }}>
        <div style={{ fontSize: '0.8rem', letterSpacing: '5px', opacity: 0.8 }}>ORBITAL DESCENT</div>
        <span ref={altRef}>
          ALT: {(unitSystem === 'imperial' ? 22000 : 35000).toLocaleString()} {unitSystem === 'imperial' ? 'MI' : 'KM'}
        </span>
      </div>
    </Html>
    </>
  )
}

// ─── 3D Light Strip Mesh Component ────────────────────────────────────────────

function LightStripMesh({ anchor, room }) {
  const devices = useDeviceStore(s => s.devices)
  const sendCommand = useDeviceStore(s => s.sendCommand)
  const { snapToGrid, selectedAnchorId, selectAnchor, updateAnchor } = useSpatialStore()
  
  const isSelected = selectedAnchorId === anchor.id
  const [target, setTarget] = useState(null)
  const groupRef = useRef(null)
  const setGroupRef = useCallback((node) => {
    groupRef.current = node
    setTarget(node)
  }, [])
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
      {isSelected && target && (
        <TransformControls 
          ref={transformRef}
          object={target}
          mode="translate" 
          translationSnap={snapToGrid ? 0.5 : null} 
        />
      )}

      <group 
        ref={setGroupRef}
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

function RoomBox({ room, allRooms, isSelected, onSelect, setControlsEnabled }) {
  const width = room.width || 4.0
  const depth = room.depth || 4.0
  const height = 2.8
  const posX = room.position_x || 0
  const posZ = room.position_y || 0
  const rotY = ((room.rotation_y || 0) * Math.PI) / 180

  const { snapToGrid, updateRoom } = useSpatialStore()
  const [target, setTarget] = useState(null)
  const groupRef = useRef(null)
  const setGroupRef = useCallback((node) => {
    groupRef.current = node
    setTarget(node)
  }, [])
  const transformRef = useRef(null)
  
  const [isDragging, setIsDragging] = useState(false)
  const [isColliding, setIsColliding] = useState(false)
  
  // Custom rotation state
  const [rotating, setRotating] = useState(false)
  const startAngleRef = useRef(0)
  const startRotRef = useRef(0)

  const handleDragEnd = useCallback(() => {
    if (groupRef.current) {
      if (isColliding) {
        // Revert position on collision drop
        groupRef.current.position.set(posX, 0, posZ)
        groupRef.current.rotation.set(0, rotY, 0)
        setIsColliding(false)
        return
      }

      const pos = groupRef.current.position
      const rot = groupRef.current.rotation
      const rotDegrees = Math.round((rot.y * 180) / Math.PI)
      
      updateRoom(room.id, {
        position_x: pos.x,
        position_y: pos.z,
        rotation_y: rotDegrees
      }).catch(console.error)
    }
  }, [isColliding, posX, posZ, rotY, room.id, updateRoom])

  // Global pointer up for custom rotation drag
  useEffect(() => {
    if (rotating) {
      const onUp = () => {
        setRotating(false)
        setControlsEnabled(true)
        handleDragEnd()
      }
      window.addEventListener('pointerup', onUp)
      return () => window.removeEventListener('pointerup', onUp)
    }
  }, [rotating, handleDragEnd, setControlsEnabled])

  useEffect(() => {
    const controls = transformRef.current
    if (controls) {
      const getAABB = (x, z, rot, w, d) => {
        const bbW = w * Math.abs(Math.cos(rot)) + d * Math.abs(Math.sin(rot))
        const bbD = w * Math.abs(Math.sin(rot)) + d * Math.abs(Math.cos(rot))
        return { minX: x - bbW/2, maxX: x + bbW/2, minZ: z - bbD/2, maxZ: z + bbD/2 }
      }

      const onChange = () => {
        if (!groupRef.current) return

        // 1. Magnetic Room Snapping
        if (snapToGrid && transformRef.current?.mode === 'translate') {
          const snapDist = 0.8
          let targetX = groupRef.current.position.x
          let targetZ = groupRef.current.position.z
          let bestSnapX = targetX
          let bestSnapZ = targetZ
          let minDx = snapDist
          let minDz = snapDist

          const myBox = getAABB(targetX, targetZ, groupRef.current.rotation.y, width, depth)

          for (const other of allRooms) {
            if (other.id === room.id) continue
            const oBox = getAABB(
              other.position_x || 0,
              other.position_y || 0,
              (other.rotation_y || 0) * Math.PI / 180,
              other.width || 4.0,
              other.depth || 4.0
            )

            // X-axis alignment and adjacent snapping
            const dxOptions = [
              oBox.maxX - myBox.minX, // Snap my left to their right
              oBox.minX - myBox.maxX, // Snap my right to their left
              oBox.minX - myBox.minX, // Align left edges
              oBox.maxX - myBox.maxX  // Align right edges
            ]
            for (const dx of dxOptions) {
              if (Math.abs(dx) < minDx) {
                minDx = Math.abs(dx)
                bestSnapX = targetX + dx
              }
            }

            // Z-axis alignment and adjacent snapping
            const dzOptions = [
              oBox.maxZ - myBox.minZ, // Snap my top to their bottom
              oBox.minZ - myBox.maxZ, // Snap my bottom to their top
              oBox.minZ - myBox.minZ, // Align top edges
              oBox.maxZ - myBox.maxZ  // Align bottom edges
            ]
            for (const dz of dzOptions) {
              if (Math.abs(dz) < minDz) {
                minDz = Math.abs(dz)
                bestSnapZ = targetZ + dz
              }
            }
          }

          groupRef.current.position.x = bestSnapX
          groupRef.current.position.z = bestSnapZ
        }

        // 2. Anti-collision check using updated position
        const finalBox = getAABB(
          groupRef.current.position.x,
          groupRef.current.position.z,
          groupRef.current.rotation.y,
          width, depth
        )

        let collision = false
        for (const other of allRooms) {
          if (other.id === room.id) continue
          const otherBox = getAABB(
            other.position_x || 0,
            other.position_y || 0,
            (other.rotation_y || 0) * Math.PI / 180,
            other.width || 4.0,
            other.depth || 4.0
          )
          
          // Epsilon of 0.01 prevents floating point rounding from triggering false collisions on perfect flush snaps
          if (!(otherBox.minX >= finalBox.maxX - 0.01 || otherBox.maxX <= finalBox.minX + 0.01 || 
                otherBox.minZ >= finalBox.maxZ - 0.01 || otherBox.maxZ <= finalBox.minZ + 0.01)) {
            collision = true
            break
          }
        }
        setIsColliding(collision)
      }

      const onDraggingChanged = (event) => {
        setIsDragging(event.value)
        if (!event.value) {
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
  }, [isSelected, handleDragEnd, allRooms, room.id, width, depth])

  // Custom rotation handlers
  const handleCornerPointerDown = useCallback((e) => {
    e.stopPropagation()
    setRotating(true)
    setControlsEnabled(false)
    const angle = Math.atan2(e.point.z - groupRef.current.position.z, e.point.x - groupRef.current.position.x)
    startAngleRef.current = angle
    startRotRef.current = groupRef.current.rotation.y
  }, [setControlsEnabled])

  const handlePlanePointerMove = useCallback((e) => {
    if (rotating && groupRef.current) {
      e.stopPropagation()
      const currentAngle = Math.atan2(e.point.z - groupRef.current.position.z, e.point.x - groupRef.current.position.x)
      const delta = currentAngle - startAngleRef.current
      let newRot = startRotRef.current - delta
      
      if (snapToGrid) {
        const snap = 15 * Math.PI / 180
        newRot = Math.round(newRot / snap) * snap
      }
      groupRef.current.rotation.y = newRot
      
      // We could run full collision check here, but let's keep it simple during rotation 
      // and let handleDragEnd finalize it.
    }
  }, [rotating, snapToGrid])

  // Corner hitboxes for rotation
  const cornerHitboxes = [
    [-width/2, depth/2],
    [width/2, depth/2],
    [-width/2, -depth/2],
    [width/2, -depth/2],
  ]

  return (
    <>
      {/* Invisible global plane to catch pointer moves during rotation */}
      {rotating && (
        <mesh 
          rotation={[-Math.PI / 2, 0, 0]} 
          position={[0, 0, 0]} 
          onPointerMove={handlePlanePointerMove}
        >
          <planeGeometry args={[1000, 1000]} />
          <meshBasicMaterial visible={false} />
        </mesh>
      )}

      {isSelected && target && !rotating && (
        <TransformControls
          ref={transformRef}
          object={target}
          mode="translate"
          translationSnap={snapToGrid ? 0.5 : null}
        />
      )}

      <group 
        ref={setGroupRef} 
        position={[posX, 0, posZ]} 
        rotation={[0, rotY, 0]}
        onClick={(e) => { e.stopPropagation(); onSelect(room.id) }}
      >
        {/* Floor Plane */}
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[width, depth]} />
          <meshStandardMaterial
            color={isColliding ? '#7f1d1d' : (isSelected ? '#1a1f36' : '#12141d')}
            roughness={0.9}
            metalness={0.1}
          />
        </mesh>

        {/* Wireframe Walls */}
        <lineSegments position={[0, height / 2, 0]}>
          <edgesGeometry args={[new THREE.BoxGeometry(width, height, depth)]} />
          <lineBasicMaterial color={isColliding ? '#ef4444' : (isSelected ? '#8b5cf6' : '#2d3348')} linewidth={2} />
        </lineSegments>

        {/* Hoverable Rotation Corners */}
        {isSelected && cornerHitboxes.map((corner, i) => (
          <mesh 
            key={i} 
            position={[corner[0], 0.1, corner[1]]} 
            onPointerDown={handleCornerPointerDown}
            onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'grab' }}
            onPointerOut={() => { document.body.style.cursor = 'default' }}
          >
            <cylinderGeometry args={[0.2, 0.2, 0.15, 16]} />
            <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={0.5} roughness={0.2} metalness={0.8} />
          </mesh>
        ))}

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
    </>
  )
}

// ─── Main 3D Viewport Component ───────────────────────────────────────────────

export function SpatialCanvas({ unitSystem = 'imperial' }) {
  const { hierarchy, selectedRoomId, selectRoom, selectAnchor } = useSpatialStore()
  
  const [introActive, setIntroActive] = useState(null)
  const [controlsEnabled, setControlsEnabled] = useState(true)
  const sceneRef = useRef(null)

  useEffect(() => {
    import('../../lib/api.js').then(({ settingsApi }) => {
      settingsApi.get().then(s => {
        setIntroActive(s.spatial_intro_enabled !== 'false')
      })
    })
  }, [])

  const handleIntroComplete = useCallback(() => {
    setIntroActive(false)
    if (sceneRef.current) {
      sceneRef.current.scale.set(1, 1, 1)
      sceneRef.current.visible = true
    }
  }, [])

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

  if (introActive === null) {
    return <div className={styles.canvasContainer} style={{ background: '#0a0d16' }}></div>
  }

  return (
    <div className={styles.canvasContainer}>
      <Canvas
        camera={{ position: [0, 8, 12], fov: 45 }}
        gl={{ antialias: true }}
        onPointerMissed={() => selectRoom(null)}
      >
        {/* Holographic Intro */}
        {introActive && (
          <Suspense fallback={null}>
            <HolographicIntro onComplete={handleIntroComplete} sceneRef={sceneRef} unitSystem={unitSystem} />
          </Suspense>
        )}

        <group ref={sceneRef} visible={!introActive}>
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
              allRooms={allRooms}
              isSelected={selectedRoomId === room.id}
              onSelect={(id) => selectRoom(id)}
              setControlsEnabled={setControlsEnabled}
            />
          ))}
        </group>

        {/* Smooth Orbit Camera Controls */}
        {!introActive && (
          <OrbitControls
            makeDefault
            enabled={controlsEnabled}
            enableDamping
            dampingFactor={0.08}
            minDistance={3}
            maxDistance={30}
            maxPolarAngle={Math.PI / 2.1}
          />
        )}
      </Canvas>
    </div>
  )
}
