import dgram from 'dgram'

const udpSocket = dgram.createSocket('udp4')
udpSocket.unref() // Fire-and-forget relay must not keep the process alive
const DDP_PORT = 4048 // Direct Display Protocol UDP port

/**
 * Send DDP (Direct Display Protocol) RGB frame packet to WLED controller.
 * DDP Header format (10 bytes):
 * Flags (1 byte) | Sequence (1 byte) | Data Type (1 byte) | ID (1 byte) | Offset (4 bytes) | Length (2 bytes)
 *
 * Shared by the audio visualizer relay, the matrix marquee relay, and the
 * virtual strip player. Pixel order is the caller's responsibility (linear
 * or serpentine). Frames larger than one MTU split into offset chunks with
 * PUSH set on the final packet only.
 */
const DDP_LEDS_PER_PACKET = 480 // 1440 payload bytes, safely under 1472 MTU

export function sendDdpRgbFrame(targetIp, rgbPixels = [], { ledOffset = 0 } = {}) {
  if (!targetIp || !Array.isArray(rgbPixels) || rgbPixels.length === 0) return

  const pixelData = new Uint8Array(rgbPixels.length * 3)
  for (let i = 0; i < rgbPixels.length; i++) {
    const [r, g, b] = rgbPixels[i] || [0, 0, 0]
    pixelData[i * 3]     = r
    pixelData[i * 3 + 1] = g
    pixelData[i * 3 + 2] = b
  }

  const chunks = Math.max(1, Math.ceil(rgbPixels.length / DDP_LEDS_PER_PACKET))
  for (let c = 0; c < chunks; c++) {
    const startLed = c * DDP_LEDS_PER_PACKET
    const slice = pixelData.subarray(startLed * 3, Math.min(pixelData.length, (startLed + DDP_LEDS_PER_PACKET) * 3))
    const byteOffset = (ledOffset + startLed) * 3
    const last = c === chunks - 1
    const header = new Uint8Array(10)
    header[0] = last ? 0x41 : 0x01 // Flags: VER=1, PUSH on final packet only
    header[1] = 0x00 // Sequence number
    header[2] = 0x01 // Data Type: RGB 8-bit
    header[3] = 0x01 // ID
    header[4] = (byteOffset >>> 24) & 0xff
    header[5] = (byteOffset >>> 16) & 0xff
    header[6] = (byteOffset >>> 8) & 0xff
    header[7] = byteOffset & 0xff
    header[8] = (slice.length >> 8) & 0xff
    header[9] = slice.length & 0xff

    const packet = Buffer.concat([Buffer.from(header), Buffer.from(slice)])
    udpSocket.send(packet, 0, packet.length, DDP_PORT, targetIp, (err) => {
      if (err) {
        // Quiet UDP packet drop guard
      }
    })
  }
}
