import { useEffect, useState, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import styles from './LocationMapPicker.module.css'

// Fix default Leaflet icon assets
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

function MapEvents({ onLocationSelect }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

export function LocationMapPicker({ lat = 37.7749, lng = -122.4194, onChange }) {
  const position = [Number(lat) || 37.7749, Number(lng) || -122.4194]

  const handleSelect = useCallback((newLat, newLng) => {
    onChange?.(newLat.toFixed(4), newLng.toFixed(4))
  }, [onChange])

  return (
    <div className={styles.mapWrapper}>
      <MapContainer
        center={position}
        zoom={9}
        scrollWheelZoom={false}
        className={styles.leafletContainer}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapEvents onLocationSelect={handleSelect} />

        {/* Pin Marker */}
        <Marker position={position} />

        {/* Privacy Region Circle (15km radius approximate location area) */}
        <Circle
          center={position}
          radius={15000}
          pathOptions={{
            color: '#8b5cf6',
            fillColor: '#8b5cf6',
            fillOpacity: 0.2,
            weight: 1.5,
          }}
        />
      </MapContainer>
      <div className={styles.privacyNotice}>
        <span className={styles.privacyDot} />
        <span>Tap anywhere on map to drop pin. 15km privacy circle indicates approximate solar region.</span>
      </div>
    </div>
  )
}
