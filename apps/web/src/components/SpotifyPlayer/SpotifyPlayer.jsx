import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useUIStore } from '../../stores/uiStore.js'
import styles from './SpotifyPlayer.module.css'

export function SpotifyPlayer() {
  const spotifyState = useUIStore(s => s.spotifyState)
  const [fullscreen, setFullscreen] = useState(false)

  if (!spotifyState || !spotifyState.is_playing) {
    return null
  }

  const { track_name, artist_name, album_art, colors } = spotifyState
  const primaryColor = colors && colors.length > 0 
    ? `rgb(${colors[0][0]}, ${colors[0][1]}, ${colors[0][2]})`
    : 'rgba(255,255,255,0.5)'

  // Render fullscreen overlay in a portal
  if (fullscreen) {
    return createPortal(
      <div className={styles.fullscreenOverlay} style={{ '--glow-color': primaryColor }}>
        <div 
          className={styles.fsBackground} 
          style={{ backgroundImage: `url(${album_art})` }} 
        />
        <div className={styles.fsGradient} />
        
        <button 
          className={styles.closeBtn} 
          onClick={() => setFullscreen(false)}
          aria-label="Close fullscreen"
        >
          ✕
        </button>

        <div className={styles.fsContent}>
          <img src={album_art} alt="Album Art" className={styles.fsAlbumArt} />
          
          <div>
            <h1 className={styles.fsTrackName}>{track_name}</h1>
            <h2 className={styles.fsArtistName}>{artist_name}</h2>
          </div>

          <div className={styles.visualizer}>
            <div className={styles.bar} />
            <div className={styles.bar} />
            <div className={styles.bar} />
            <div className={styles.bar} />
            <div className={styles.bar} />
          </div>
        </div>
      </div>,
      document.body
    )
  }

  // Mini player on dashboard
  return (
    <div 
      className={styles.container} 
      onClick={() => setFullscreen(true)}
      title="Click to expand"
    >
      <img src={album_art} alt="Album Art" className={styles.albumArt} style={{ '--shadow-color': primaryColor }} />
      <div className={styles.trackInfo}>
        <p className={styles.trackName}>{track_name}</p>
        <p className={styles.artistName}>{artist_name}</p>
      </div>
    </div>
  )
}
